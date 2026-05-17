import { getAccessToken } from "@/lib/access-token";
import { resolveApiUrl } from "@/lib/api-base";

export function getBearerAuthorizationHeader(): string | null {
  const token = getAccessToken();
  if (!token) return null;
  return `Bearer ${token}`;
}

function mergeHeaders(init?: RequestInit): Headers {
  const headers = new Headers(init?.headers);
  const auth = getBearerAuthorizationHeader();
  if (auth) {
    headers.set("Authorization", auth);
  }
  return headers;
}

function isMissingAuthResponse(res: Response, body: unknown): boolean {
  if (res.status !== 401) return false;
  const msg =
    body &&
    typeof body === "object" &&
    ("error" in body || "message" in body)
      ? String(
          (body as { error?: string; message?: string }).error ??
            (body as { message?: string }).message ??
            "",
        )
      : "";
  return /authorization header/i.test(msg);
}

/**
 * Same as `fetch` but adds `Authorization: Bearer <token>` when a token exists.
 * Use for all authenticated calls to `/api/*` from the browser.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const resolved = resolveApiUrl(input);
  const headers = mergeHeaders(init);

  let res = await fetch(resolved, {
    ...init,
    headers,
    credentials: "omit",
  });

  // Retry once if the token was set between scheduling and send (post-login race).
  if (!headers.has("Authorization") && getBearerAuthorizationHeader()) {
    const retryHeaders = mergeHeaders(init);
    res = await fetch(resolved, {
      ...init,
      headers: retryHeaders,
      credentials: "omit",
    });
  }

  if (res.status === 401 && headers.has("Authorization")) {
    return res;
  }

  if (res.status === 401) {
    let body: unknown = null;
    try {
      body = await res.clone().json();
    } catch {
      /* ignore */
    }
    if (isMissingAuthResponse(res, body) && getBearerAuthorizationHeader()) {
      const retryHeaders = mergeHeaders(init);
      return fetch(resolved, {
        ...init,
        headers: retryHeaders,
        credentials: "omit",
      });
    }
  }

  return res;
}
