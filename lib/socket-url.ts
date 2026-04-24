/**
 * Socket.IO origin (no path; client uses path `/socket.io`).
 * Set NEXT_PUBLIC_SOCKET_URL, or rely on next.config.mjs to copy BACKEND_API_URL.
 */
export function getSocketBaseUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}
