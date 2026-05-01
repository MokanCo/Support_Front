/** Browser storage key for JWT (no httpOnly cookie). */
export const ACCESS_TOKEN_KEY = "mokanco_access_token";
export const ACCESS_TOKEN_SESSION_KEY = "mokanco_access_token_session";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem(ACCESS_TOKEN_KEY) ??
    sessionStorage.getItem(ACCESS_TOKEN_SESSION_KEY)
  );
}

export function setAccessToken(
  token: string,
  opts?: { persist?: boolean },
): void {
  if (typeof window === "undefined") return;
  const persist = opts?.persist ?? true;
  if (persist) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    sessionStorage.removeItem(ACCESS_TOKEN_SESSION_KEY);
  } else {
    sessionStorage.setItem(ACCESS_TOKEN_SESSION_KEY, token);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_SESSION_KEY);
}
