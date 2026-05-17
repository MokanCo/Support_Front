"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/auth-fetch";
import { TicketChatHeader } from "@/components/messages/ticket-chat-header";
import { TicketMessageBubble } from "@/components/messages/ticket-message-bubble";
import {
  type ClientMessageRow,
  parseCreatedMessageResponse,
} from "@/lib/messages-client";
import type { SupportChatHeaderModel } from "@/lib/support-chat-display";
import {
  fetchPartnerChatHeader,
  headerFromTicketProps,
  parsePartnerChatHeader,
  patchPresenceOnHeader,
  type PartnerChatHeaderState,
} from "@/lib/partner-chat-header";
import { useMessageInbox } from "@/lib/message-inbox-context";
import {
  subscribePresenceUpdate,
  subscribeTicketUpdated,
} from "@/lib/socket-client";
import { useTicketSocket } from "@/lib/use-ticket-socket";
import { queryKeys } from "@/lib/query-keys";
import {
  patchInboxAfterMessage,
  upsertThreadMessage,
} from "@/lib/queries/conversation-cache";
import {
  fetchMessageSummary,
  fetchTicketMessages,
  type MessageSummary,
} from "@/lib/queries/conversations";
import { requestSidebarCountsRefresh } from "@/lib/sidebar-counts-refresh";
import { SkeletonMessageBubbles } from "@/components/ui/skeleton";

export function TicketChatFab({
  ticketId,
  viewerUserId,
  ticketHeader,
  initialAutoOpen = false,
  onStripOpenChatQuery,
  composerDisabled = false,
  composerDisabledMessage,
}: {
  ticketId: string;
  viewerUserId: string;
  ticketHeader?: SupportChatHeaderModel | null;
  initialAutoOpen?: boolean;
  onStripOpenChatQuery?: () => void;
  composerDisabled?: boolean;
  composerDisabledMessage?: string;
}) {
  const queryClient = useQueryClient();
  const inbox = useMessageInbox();
  const inboxRef = useRef(inbox);
  inboxRef.current = inbox;
  const [open, setOpen] = useState(initialAutoOpen);
  const [portalReady, setPortalReady] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const threadScrollRef = useRef<HTMLDivElement>(null);
  const messageTextRef = useRef(messageText);
  messageTextRef.current = messageText;
  const postInFlightRef = useRef(false);
  const [headerState, setHeaderState] = useState<PartnerChatHeaderState>(() =>
    headerFromTicketProps(
      ticketHeader ?? { status: "open", assignedTo: null, assignedToName: null },
    ),
  );

  useEffect(() => {
    if (!ticketHeader) return;
    setHeaderState(headerFromTicketProps(ticketHeader));
  }, [ticketHeader?.assignedTo, ticketHeader?.assignedToName, ticketHeader?.status]);

  const applyChatHeader = useCallback((header: PartnerChatHeaderState) => {
    setHeaderState(header);
  }, []);

  const scrollThreadToBottom = useCallback(() => {
    const el = threadScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  const summaryQuery = useQuery({
    queryKey: queryKeys.messages.summary(ticketId),
    queryFn: () => fetchMessageSummary(ticketId),
    enabled: Boolean(ticketId),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const messagesQuery = useQuery({
    queryKey: queryKeys.conversations.messages(ticketId),
    queryFn: () => fetchTicketMessages(ticketId),
    enabled: open && Boolean(ticketId),
  });

  const summary = summaryQuery.data ?? null;
  const messages = messagesQuery.data ?? [];
  const loadingThread = open && messagesQuery.isFetching && !messagesQuery.data;

  const onSocketMessage = useCallback(
    (row: ClientMessageRow) => {
      upsertThreadMessage(queryClient, ticketId, row);
      if (open) {
        queryClient.setQueryData<MessageSummary>(queryKeys.messages.summary(ticketId), (prev) => ({
          unreadCount: 0,
          preview: row.text.slice(0, 200),
          hasUnread: false,
        }));
      }
    },
    [queryClient, ticketId, open],
  );

  useTicketSocket(ticketId, Boolean(ticketId), onSocketMessage, {
    viewerUserId,
    onChatHeader: applyChatHeader,
  });

  useEffect(() => {
    if (!ticketId) return;
    const unsubTicket = subscribeTicketUpdated((raw) => {
      const payload = raw as { ticketId?: string; chatHeader?: unknown };
      if (String(payload.ticketId) !== ticketId) return;
      const header = parsePartnerChatHeader(payload.chatHeader);
      if (header) setHeaderState(header);
    });
    const unsubPresence = subscribePresenceUpdate((raw) => {
      const payload = raw as { userId?: string; online?: boolean };
      if (!payload.userId) return;
      setHeaderState((prev) =>
        patchPresenceOnHeader(prev, String(payload.userId), Boolean(payload.online)),
      );
    });
    return () => {
      unsubTicket();
      unsubPresence();
    };
  }, [ticketId]);

  useEffect(() => {
    if (!open || !ticketId) return;
    void fetchPartnerChatHeader(ticketId).then((header) => {
      if (header) setHeaderState(header);
    });
  }, [open, ticketId]);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const liveBump = inbox.getLiveBump(ticketId);
  useEffect(() => {
    if (open || liveBump === 0) return;
    void summaryQuery.refetch();
  }, [liveBump, open, summaryQuery]);

  useEffect(() => {
    inboxRef.current.setFabOpenTicketId(open ? ticketId : null);
    return () => {
      inboxRef.current.setFabOpenTicketId(null);
    };
  }, [open, ticketId]);

  useEffect(() => {
    if (!open) return;
    inboxRef.current.clearTicketNotification(ticketId);
    onStripOpenChatQuery?.();
    void apiFetch("/api/messages/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId }),
    }).then((res) => {
      if (!res.ok) return;
      queryClient.setQueryData<MessageSummary>(queryKeys.messages.summary(ticketId), {
        unreadCount: 0,
        preview: summary?.preview ?? "",
        hasUnread: false,
      });
      requestSidebarCountsRefresh();
    });
  }, [open, ticketId, onStripOpenChatQuery, queryClient, summary?.preview]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const run = () => {
      if (!cancelled) scrollThreadToBottom();
    };
    run();
    const id = window.requestAnimationFrame(() => {
      run();
      window.requestAnimationFrame(run);
    });
    const t = window.setTimeout(run, 0);
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
      window.clearTimeout(t);
    };
  }, [open, messages, loadingThread, scrollThreadToBottom]);

  const postMessage = useCallback(async () => {
    if (composerDisabled) return;
    if (postInFlightRef.current) return;
    const text = messageTextRef.current.trim();
    if (!text) return;
    postInFlightRef.current = true;
    setSending(true);
    try {
      const res = await apiFetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, text }),
      });
      const data: unknown = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed");
      const row = parseCreatedMessageResponse(data);
      if (row) {
        upsertThreadMessage(queryClient, ticketId, row);
        patchInboxAfterMessage(queryClient, ticketId, row, {
          clearUnread: true,
          viewerUserId,
        });
        queryClient.setQueryData<MessageSummary>(queryKeys.messages.summary(ticketId), {
          unreadCount: 0,
          preview: row.text.slice(0, 200),
          hasUnread: false,
        });
      }
      setMessageText("");
      requestSidebarCountsRefresh();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[chat] send failed", err);
    } finally {
      postInFlightRef.current = false;
      setSending(false);
    }
  }, [ticketId, queryClient, viewerUserId, composerDisabled]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    await postMessage();
  }

  const onComposerKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (composerDisabled) return;
      if (e.key !== "Enter" || e.shiftKey) return;
      e.preventDefault();
      void postMessage();
    },
    [postMessage, composerDisabled],
  );

  const showPreview = Boolean(!open && summary?.hasUnread && summary.preview);
  const fabTooltip =
    !open && summary?.hasUnread && summary.preview
      ? `New message: ${summary.preview}`
      : undefined;

  const slideOver =
    open && portalReady ? (
      <>
        <button
          type="button"
          className="fixed inset-0 z-[200] min-h-[100dvh] w-screen bg-slate-900/50 backdrop-blur-sm"
          aria-label="Close overlay"
          onClick={() => setOpen(false)}
        />
        <aside className="fixed bottom-0 right-0 top-0 z-[210] flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl">
          <div className="flex flex-shrink-0 items-stretch border-b border-slate-100">
            <div className="min-w-0 flex-1">
              <TicketChatHeader
                ticket={headerState}
                subtitle="This ticket only"
                className="border-0 bg-transparent px-4 sm:px-5"
              />
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-shrink-0 self-center rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div
            ref={threadScrollRef}
            className="min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden p-4"
          >
            {loadingThread ? (
              <SkeletonMessageBubbles count={4} />
            ) : messages.length === 0 ? (
              <p className="text-center text-sm text-slate-500">No messages yet.</p>
            ) : (
              messages.map((m) => (
                <TicketMessageBubble key={m.id} m={m} viewerUserId={viewerUserId} compact />
              ))
            )}
          </div>

          <form
            onSubmit={sendMessage}
            className="flex-shrink-0 border-t border-slate-100 p-3 sm:p-4"
          >
            {composerDisabled && composerDisabledMessage ? (
              <p className="mb-2 text-xs text-slate-600" role="status">
                {composerDisabledMessage}
              </p>
            ) : null}
            <fieldset
              disabled={composerDisabled}
              className="m-0 min-w-0 border-0 p-0 disabled:opacity-60"
            >
              <legend className="sr-only">Message (Enter to send, Shift+Enter for new line)</legend>
              <div
                className={`flex min-h-[2.75rem] items-end rounded-xl border bg-white shadow-sm transition ${
                  composerDisabled
                    ? "border-slate-200"
                    : "border-slate-200 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200"
                }`}
              >
                <textarea
                  id={`ticket-chat-fab-msg-${ticketId}`}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={onComposerKeyDown}
                  placeholder={
                    composerDisabled ? "Messaging is closed for this ticket." : "Write an update…"
                  }
                  rows={1}
                  className="max-h-28 min-h-[2.25rem] min-w-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-3 py-1.5 text-sm leading-5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 disabled:cursor-not-allowed"
                />
                <div className="flex shrink-0 items-end border-l border-slate-100 bg-slate-50/50 p-1.5">
                  <Button
                    type="submit"
                    disabled={composerDisabled || sending || !messageText.trim()}
                    className="gap-1.5 rounded-lg px-3 py-2 text-sm shadow-none"
                  >
                    <Send className="h-4 w-4 shrink-0" />
                    {sending ? "Sending…" : "Send"}
                  </Button>
                </div>
              </div>
            </fieldset>
          </form>
        </aside>
      </>
    ) : null;

  return (
    <>
      {!open ? (
        <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-2 sm:bottom-8 sm:right-8">
          {showPreview ? (
            <div
              className="pointer-events-none max-w-[min(100vw-2rem,320px)] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-lg ring-1 ring-slate-900/5"
              role="status"
              aria-live="polite"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-primary-600">
                New message
              </p>
              <p className="mt-1 line-clamp-3 text-sm text-slate-800">{summary?.preview}</p>
            </div>
          ) : null}
          <div className="pointer-events-auto">
            <button
              type="button"
              onClick={() => setOpen(true)}
              title={fabTooltip}
              className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg transition hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
              aria-label="Open messages"
            >
              <MessageCircle className="h-7 w-7" strokeWidth={1.75} />
              {summary && summary.unreadCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                  {summary.unreadCount > 9 ? "9+" : summary.unreadCount}
                </span>
              ) : null}
            </button>
          </div>
        </div>
      ) : null}

      {slideOver ? createPortal(slideOver, document.body) : null}
    </>
  );
}
