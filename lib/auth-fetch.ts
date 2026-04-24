import { getAccessToken } from "@/lib/access-token";

/**
 * Same as `fetch` but adds `Authorization: Bearer <token>` when a token exists.
 * Use for all authenticated calls to `/api/*` from the browser.
 */
export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  const token = getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  // Never send browser cookies with API calls — auth is Bearer-only in Network.
  return fetch(input, { ...init, headers, credentials: "omit" });
}
