"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { apiFetch } from "@/lib/auth-fetch";
import { TicketChatHeader } from "@/components/messages/ticket-chat-header";
import { TicketMessageBubble } from "@/components/messages/ticket-message-bubble";
import {
  type ClientMessageRow,
  parseCreatedMessageResponse,
  parseMessagesListResponse,
} from "@/lib/messages-client";
import type { SupportChatHeaderModel } from "@/lib/support-chat-display";
import { useMessageInbox } from "@/lib/message-inbox-context";
import { useTicketSocket } from "@/lib/use-ticket-socket";

type Summary = {
  unreadCount: number;
  preview: string;
  hasUnread: boolean;
};

export function TicketChatFab({
  ticketId,
  viewerUserId,
  ticketHeader,
  initialAutoOpen = false,
  onStripOpenChatQuery,
}: {
  ticketId: string;
  viewerUserId: string;
  /** Live ticket fields for support identity + presence in the slide-over header. */
  ticketHeader?: SupportChatHeaderModel | null;
  /** Open chat panel when arriving from notification (?chat=1). */
  initialAutoOpen?: boolean;
  /** Remove `chat` / `openChat` query params after opening (optional). */
  onStripOpenChatQuery?: () => void;
}) {
  const inbox = useMessageInbox();
  const inboxRef = useRef(inbox);
  inboxRef.current = inbox;
  const [open, setOpen] = useState(initialAutoOpen);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [messages, setMessages] = useState<ClientMessageRow[]>([]);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);

  const loadSummary = useCallback(async () => {
    try {
      const res = await apiFetch(
        `/api/messages/summary?ticketId=${encodeURIComponent(ticketId)}`
      );
      const data = await res.json();
      if (res.ok) setSummary(data as Summary);
    } catch {
      /* ignore */
    }
  }, [ticketId]);

  const loadMessages = useCallback(async () => {
    setLoadingThread(true);
    try {
      const res = await apiFetch(
        `/api/messages?ticketId=${encodeURIComponent(ticketId)}`
      );
      const data: unknown = await res.json();
      if (res.ok) setMessages(parseMessagesListResponse(data));
    } catch {
      /* ignore */
    } finally {
      setLoadingThread(false);
    }
  }, [ticketId]);

  const loadSummaryRef = useRef(loadSummary);
  loadSummaryRef.current = loadSummary;

  const onSocketMessage = useCallback((row: ClientMessageRow) => {
    setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
    void loadSummaryRef.current();
  }, []);

  useTicketSocket(ticketId, open, onSocketMessage, { viewerUserId });

  useEffect(() => {
    void loadSummary();
    const id = window.setInterval(() => void loadSummary(), 15_000);
    return () => window.clearInterval(id);
  }, [loadSummary]);

  const liveBump = inbox.getLiveBump(ticketId);
  useEffect(() => {
    if (open) return;
    void loadSummary();
  }, [liveBump, open, loadSummary, ticketId]);

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
    void loadMessages();
    void apiFetch("/api/messages/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId }),
    }).then(() => void loadSummary());
  }, [open, ticketId, loadMessages, loadSummary, onStripOpenChatQuery]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageText.trim()) return;
    setSending(true);
    try {
      const res = await apiFetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, text: messageText.trim() }),
      });
      const data: unknown = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed");
      const row = parseCreatedMessageResponse(data);
      if (row) {
        setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
      }
      setMessageText("");
      void loadSummary();
    } catch {
      /* ignore */
    } finally {
      setSending(false);
    }
  }

  const showPreview = Boolean(!open && summary?.hasUnread && summary.preview);
  const fabTooltip =
    !open && summary?.hasUnread && summary.preview
      ? `New message: ${summary.preview}`
      : undefined;

  return (
    <>
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
            onClick={() => setOpen((o) => !o)}
            title={fabTooltip}
            className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg transition hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
            aria-label={open ? "Close messages" : "Open messages"}
          >
            <MessageCircle className="h-7 w-7" strokeWidth={1.75} />
            {!open && summary && summary.unreadCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                {summary.unreadCount > 9 ? "9+" : summary.unreadCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[90] bg-slate-900/40 backdrop-blur-[1px]"
            aria-label="Close overlay"
            onClick={() => setOpen(false)}
          />
          <aside className="fixed bottom-0 right-0 top-0 z-[95] flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl">
            <div className="flex flex-shrink-0 items-stretch border-b border-slate-100">
              <div className="min-w-0 flex-1">
                <TicketChatHeader
                  ticket={ticketHeader}
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

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {loadingThread ? (
                <p className="text-center text-sm text-slate-500">Loading…</p>
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
              className="border-t border-slate-100 p-4"
            >
              <Textarea
                label="Message"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Write an update…"
                className="min-h-[88px]"
                required
              />
              <div className="mt-3 flex justify-end">
                <Button type="submit" disabled={sending} className="inline-flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  {sending ? "Sending…" : "Send"}
                </Button>
              </div>
            </form>
          </aside>
        </>
      ) : null}
    </>
  );
}
