import { getAccessToken } from "@/lib/access-token";
import { resolveApiUrl } from "@/lib/api-base";

/**
 * Same as `fetch` but adds `Authorization: Bearer <token>` when a token exists.
 * Use for all authenticated calls to `/api/*` from the browser.
 * With static hosting, set `NEXT_PUBLIC_API_URL` so requests hit your backend (see `api-base.ts`).
 */
export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const resolved = resolveApiUrl(input);
  const headers = new Headers(init?.headers);
  const token = getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  // Never send browser cookies with API calls — auth is Bearer-only in Network.
  return fetch(resolved, { ...init, headers, credentials: "omit" });
}
