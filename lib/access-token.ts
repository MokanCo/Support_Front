/** Browser storage key for JWT (no httpOnly cookie). */
export const ACCESS_TOKEN_KEY = "mokanco_access_token";
export const ACCESS_TOKEN_SESSION_KEY = "mokanco_access_token_session";

export const AUTH_TOKEN_CHANGED_EVENT = "mokanco:auth-token-changed";

function notifyTokenChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_TOKEN_CHANGED_EVENT));
}

/** Read JWT from storage (localStorage preferred, then session). */
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const local = localStorage.getItem(ACCESS_TOKEN_KEY)?.trim();
  if (local) return local;
  const session = sessionStorage.getItem(ACCESS_TOKEN_SESSION_KEY)?.trim();
  return session || null;
}

export function setAccessToken(
  token: string,
  opts?: { persist?: boolean },
): void {
  if (typeof window === "undefined") return;
  const trimmed = token.trim();
  if (!trimmed) return;

  const persist = opts?.persist ?? true;
  // Always mirror to sessionStorage so API calls work even if localStorage is blocked.
  sessionStorage.setItem(ACCESS_TOKEN_SESSION_KEY, trimmed);
  if (persist) {
    localStorage.setItem(ACCESS_TOKEN_KEY, trimmed);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
  notifyTokenChanged();
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_SESSION_KEY);
  notifyTokenChanged();
}
