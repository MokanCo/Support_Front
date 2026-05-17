/**
 * Optional "remember me" payload (localStorage). Any script on the origin can read this —
 * acceptable only for trusted internal portals; prefer SSO for higher assurance.
 */
const STORAGE_KEY = "mokanco_login_remember_v1";

export type RememberedLogin = {
  email: string;
  name: string;
  password: string;
};

export function readRememberedLogin(): RememberedLogin | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw) as Partial<RememberedLogin>;
    const email = typeof j.email === "string" ? j.email.trim() : "";
    const password = typeof j.password === "string" ? j.password : "";
    if (!email || !password) return null;
    const name =
      typeof j.name === "string" && j.name.trim()
        ? j.name.trim()
        : email.split("@")[0] ?? "there";
    return { email, name, password };
  } catch {
    return null;
  }
}

export function writeRememberedLogin(data: RememberedLogin): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        email: data.email.trim(),
        name: data.name.trim() || data.email.split("@")[0] || "there",
        password: data.password,
      }),
    );
  } catch {
    /* quota / private mode */
  }
}

export function clearRememberedLogin(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
