/** GET /api/users returns `{ users }` from the backend; legacy may return a bare array. */
export function parseUsersListJson(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { users?: unknown }).users)
  ) {
    return (data as { users: unknown[] }).users;
  }
  return [];
}

/** POST/PATCH /api/users often return `{ user: { ... } }`. */
export function unwrapUserResponse(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (o.user && typeof o.user === "object") {
    return o.user as Record<string, unknown>;
  }
  return o;
}
