import { apiFetch } from "@/lib/auth-fetch";
import {
  parseMessagesListResponse,
  type ClientMessageRow,
} from "@/lib/messages-client";
import { queryKeys } from "@/lib/query-keys";

export type InboxRow = {
  ticketId: string;
  title: string;
  ticketCode: string | null;
  locationName: string | null;
  lastMessageAt: string;
  lastMessagePreview: string;
  lastSenderId: string;
  unreadCount: number;
};

export type MessageSummary = {
  unreadCount: number;
  preview: string;
  hasUnread: boolean;
};

export async function fetchConversationsInbox(): Promise<InboxRow[]> {
  const res = await apiFetch("/api/conversations/inbox");
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to load inbox");
  return (json as { conversations: InboxRow[] }).conversations ?? [];
}

export async function fetchTicketMessages(ticketId: string): Promise<ClientMessageRow[]> {
  const res = await apiFetch(`/api/messages?ticketId=${encodeURIComponent(ticketId)}`);
  const data: unknown = await res.json();
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to load messages");
  return parseMessagesListResponse(data);
}

export async function fetchMessageSummary(ticketId: string): Promise<MessageSummary> {
  const res = await apiFetch(
    `/api/messages/summary?ticketId=${encodeURIComponent(ticketId)}`,
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to load summary");
  return data as MessageSummary;
}

export const inboxQueryOptions = {
  queryKey: queryKeys.conversations.inbox(),
  queryFn: fetchConversationsInbox,
} as const;
