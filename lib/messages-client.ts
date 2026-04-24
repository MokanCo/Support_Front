/** Row shape used by ticket UI + chat FAB (aligned with `/api/messages` after proxy). */

export type ClientMessageRow = {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
  isSystem?: boolean;
  senderRole?: string;
};

/** Normalize one API / socket message object into `ClientMessageRow`. */
export function normalizeApiMessageRow(raw: unknown): ClientMessageRow {
  const m = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const isSystem = Boolean(m.isSystem);
  const sender =
    m.sender && typeof m.sender === "object"
      ? (m.sender as Record<string, unknown>)
      : undefined;
  const senderRole =
    typeof sender?.role === "string" ? String(sender.role) : undefined;
  const senderName =
    isSystem
      ? "Support"
      : typeof m.senderName === "string" && m.senderName.trim()
        ? m.senderName
        : typeof sender?.name === "string" && String(sender.name).trim()
          ? String(sender.name)
          : "Unknown";
  const ca = m.createdAt;
  let createdAt = "";
  try {
    if (ca instanceof Date) createdAt = ca.toISOString();
    else if (typeof ca === "string") createdAt = new Date(ca).toISOString();
    else if (ca != null) createdAt = new Date(String(ca)).toISOString();
  } catch {
    createdAt = "";
  }
  return {
    id: String(m.id ?? ""),
    senderId: String(m.senderId ?? ""),
    senderName,
    text: String(m.text ?? ""),
    createdAt,
    isSystem,
    senderRole: isSystem ? "system" : senderRole,
  };
}

/** Backend lists with `{ messages }`; legacy may return a bare array. */
export function parseMessagesListResponse(data: unknown): ClientMessageRow[] {
  const arr = Array.isArray(data)
    ? data
    : data &&
        typeof data === "object" &&
        Array.isArray((data as { messages?: unknown }).messages)
      ? (data as { messages: unknown[] }).messages
      : [];
  return arr.map(normalizeApiMessageRow);
}

/** POST /api/messages returns `{ message }` from the backend. */
export function parseCreatedMessageResponse(data: unknown): ClientMessageRow | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const raw =
    o.message && typeof o.message === "object" ? (o.message as Record<string, unknown>) : o;
  return normalizeApiMessageRow(raw);
}

export function formatMessageTime(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "—";
  }
}

/** Row label in thread: automated lines are always "Support". */
export function messageRowSenderLabel(m: ClientMessageRow): string {
  if (m.isSystem) return "Support";
  return m.senderName;
}
