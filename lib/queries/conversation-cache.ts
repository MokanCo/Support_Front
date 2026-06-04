import type { QueryClient } from "@tanstack/react-query";
import type { ClientMessageRow } from "@/lib/messages-client";
import { queryKeys } from "@/lib/query-keys";
import type { InboxRow } from "@/lib/queries/conversations";

type TicketMeta = {
  title?: string;
  ticketCode?: string | null;
};

/** Merge a new message into the thread cache (no network). */
export function upsertThreadMessage(
  queryClient: QueryClient,
  ticketId: string,
  row: ClientMessageRow,
) {
  queryClient.setQueryData<ClientMessageRow[]>(
    queryKeys.conversations.messages(ticketId),
    (prev) => {
      const list = prev ?? [];
      return list.some((m) => m.id === row.id) ? list : [...list, row];
    },
  );
}

/** Update inbox list row after send/receive without refetching the whole inbox. */
export function patchInboxAfterMessage(
  queryClient: QueryClient,
  ticketId: string,
  row: ClientMessageRow,
  opts: {
    ticket?: TicketMeta;
    /** When true, do not increment unread (viewer is in the thread). */
    clearUnread?: boolean;
    viewerUserId?: string;
  } = {},
) {
  const isOwn = Boolean(opts.viewerUserId && row.senderId === opts.viewerUserId);
  const preview = (row.text ?? "").slice(0, 200);
  const at = row.createdAt || new Date().toISOString();

  queryClient.setQueryData<InboxRow[]>(queryKeys.conversations.inbox(), (prev) => {
    const list = prev ?? [];
    const idx = list.findIndex((r) => r.ticketId === ticketId);
    const existing = idx >= 0 ? list[idx] : null;
    const title =
      opts.ticket?.title?.trim() ||
      existing?.title ||
      "Ticket";
    const ticketCode =
      opts.ticket?.ticketCode != null
        ? opts.ticket.ticketCode
        : existing?.ticketCode ?? null;

    const nextRow: InboxRow = {
      ticketId,
      title,
      ticketCode,
      locationName: existing?.locationName ?? null,
      lastMessageAt: at,
      lastMessagePreview: preview,
      lastSenderId: row.senderId,
      unreadCount: opts.clearUnread || isOwn
        ? 0
        : (existing?.unreadCount ?? 0) + (isOwn ? 0 : 1),
    };

    const without = list.filter((r) => r.ticketId !== ticketId);
    return [nextRow, ...without];
  });
}

/** Zero unread for a ticket in the inbox cache (after mark-read). */
export function patchInboxMarkRead(queryClient: QueryClient, ticketId: string) {
  queryClient.setQueryData<InboxRow[]>(queryKeys.conversations.inbox(), (prev) => {
    if (!prev?.length) return prev;
    return prev.map((r) =>
      r.ticketId === ticketId ? { ...r, unreadCount: 0 } : r,
    );
  });
}

/** Sum unread from inbox cache for sidebar badge (avoids extra HTTP when cache is warm). */
export function sumInboxUnreadFromCache(queryClient: QueryClient): number | null {
  const rows = queryClient.getQueryData<InboxRow[]>(queryKeys.conversations.inbox());
  if (!rows) return null;
  return rows.reduce((sum, r) => sum + (r.unreadCount > 0 ? r.unreadCount : 0), 0);
}
