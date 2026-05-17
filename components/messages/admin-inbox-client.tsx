"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Send } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { SkeletonInboxList, SkeletonMessageBubbles } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/auth-fetch";
import { TicketMessageBubble } from "@/components/messages/ticket-message-bubble";
import {
  type ClientMessageRow,
  parseCreatedMessageResponse,
} from "@/lib/messages-client";
import { useSession } from "@/lib/session-context";
import { useMessageInbox } from "@/lib/message-inbox-context";
import { useTicketSocket } from "@/lib/use-ticket-socket";
import { requestSidebarCountsRefresh } from "@/lib/sidebar-counts-refresh";
import {
  fetchTicketMessages,
  inboxQueryOptions,
  type InboxRow,
} from "@/lib/queries/conversations";
import {
  patchInboxAfterMessage,
  patchInboxMarkRead,
  upsertThreadMessage,
} from "@/lib/queries/conversation-cache";
import { queryKeys } from "@/lib/query-keys";

export function AdminInboxClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSession();
  const inboxCtx = useMessageInbox();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inboxSearch, setInboxSearch] = useState("");
  const threadScrollRef = useRef<HTMLDivElement>(null);

  const scrollThreadToBottom = useCallback(() => {
    const el = threadScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  const inboxListQuery = useQuery(inboxQueryOptions);
  const rows = inboxListQuery.data ?? [];
  const loadingList = inboxListQuery.isPending && !inboxListQuery.data;

  const filteredRows = useMemo(() => {
    const q = inboxSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r: InboxRow) => {
      const hay = [
        r.title,
        r.ticketCode ?? "",
        r.ticketId,
        r.locationName ?? "",
        r.lastMessagePreview,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, inboxSearch]);

  const messagesQuery = useQuery({
    queryKey: queryKeys.conversations.messages(selectedId ?? ""),
    queryFn: () => fetchTicketMessages(selectedId!),
    enabled: Boolean(selectedId),
  });

  const messages = messagesQuery.data ?? [];
  const loadingThread = messagesQuery.isPending && Boolean(selectedId) && !messagesQuery.data;

  useEffect(() => {
    const tid = searchParams.get("ticket")?.trim();
    if (!tid) return;
    setSelectedId(tid);
    router.replace("/dashboard/conversations", { scroll: false });
  }, [searchParams, router]);

  const onSocketMessage = useCallback(
    (row: ClientMessageRow) => {
      if (!selectedId) return;
      upsertThreadMessage(queryClient, selectedId, row);
      patchInboxAfterMessage(queryClient, selectedId, row, {
        clearUnread: true,
        viewerUserId: user.id,
      });
      requestSidebarCountsRefresh();
    },
    [selectedId, queryClient, user.id],
  );

  useTicketSocket(selectedId, Boolean(selectedId), onSocketMessage, {
    viewerUserId: user.id,
  });

  useEffect(() => {
    inboxCtx.setAdminInlineTicketId(selectedId);
    return () => inboxCtx.setAdminInlineTicketId(null);
  }, [selectedId, inboxCtx]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    void (async () => {
      const res = await apiFetch("/api/messages/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: selectedId }),
      });
      if (cancelled || !res.ok) return;
      patchInboxMarkRead(queryClient, selectedId);
      requestSidebarCountsRefresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, queryClient]);

  const messageTextRef = useRef(messageText);
  messageTextRef.current = messageText;

  const sendMessage = useCallback(async () => {
    const text = messageTextRef.current.trim();
    if (!selectedId || !text) return;
    setSending(true);
    setError(null);
    try {
      const res = await apiFetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: selectedId, text }),
      });
      const data: unknown = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed");
      const row = parseCreatedMessageResponse(data);
      if (row) {
        const inboxRow = rows.find((r) => r.ticketId === selectedId);
        upsertThreadMessage(queryClient, selectedId, row);
        patchInboxAfterMessage(queryClient, selectedId, row, {
          clearUnread: true,
          viewerUserId: user.id,
          ticket: inboxRow
            ? { title: inboxRow.title, ticketCode: inboxRow.ticketCode }
            : undefined,
        });
      }
      setMessageText("");
      requestSidebarCountsRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSending(false);
    }
  }, [selectedId, queryClient, user.id, rows]);

  async function onSubmitReply(e: React.FormEvent) {
    e.preventDefault();
    await sendMessage();
  }

  const onReplyKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!messageTextRef.current.trim() || sending) return;
        void sendMessage();
      }
    },
    [sendMessage, sending]
  );

  useEffect(() => {
    if (!selectedId) return;
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
  }, [selectedId, messages, loadingThread, scrollThreadToBottom]);

  const selected = rows.find((r) => r.ticketId === selectedId);

  return (
    <div className="flex h-[calc(100dvh-4rem-3rem-10px)] min-h-0 flex-col gap-4 overflow-hidden lg:h-[calc(100dvh-4rem-4rem-10px)]">
      <div className="shrink-0">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Conversations</h1>
        <p className="mt-1 text-sm text-slate-500">
          All ticket threads with recent activity. Select a conversation to read and reply.
        </p>
      </div>

      {error ? <p className="shrink-0 text-sm text-red-600">{error}</p> : null}

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:grid lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,340px)_1fr] lg:grid-rows-1">
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden lg:h-full lg:min-h-0">
          <div className="shrink-0 border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Inbox</h2>
            <p className="text-xs text-slate-500">Sorted by latest message</p>
          </div>
          <div className="shrink-0 border-b border-slate-100 px-3 py-2">
            <label className="relative block">
              <span className="sr-only">Search conversations</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <input
                type="search"
                value={inboxSearch}
                onChange={(e) => setInboxSearch(e.target.value)}
                placeholder="Search…"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </label>
          </div>
          <CardBody className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-0">
            {loadingList ? (
              <SkeletonInboxList rows={6} />
            ) : rows.length === 0 ? (
              <p className="px-4 py-8 text-sm text-slate-500">No conversations yet.</p>
            ) : filteredRows.length === 0 ? (
              <p className="px-4 py-8 text-sm text-slate-500">No matches.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filteredRows.map((r) => {
                  const active = r.ticketId === selectedId;
                  return (
                    <li key={r.ticketId}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(r.ticketId)}
                        className={`flex w-full flex-col gap-1 px-4 py-3 text-left text-sm transition ${
                          active ? "bg-primary-50/90" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="line-clamp-1 font-medium text-slate-900">{r.title}</span>
                          {r.unreadCount > 0 ? (
                            <span className="shrink-0 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                              {r.unreadCount > 9 ? "9+" : r.unreadCount}
                            </span>
                          ) : null}
                        </div>
                        <span className="font-mono text-[10px] text-primary-600">
                          {r.ticketCode ?? r.ticketId.slice(-6)}
                        </span>
                        {r.locationName ? (
                          <span className="text-xs text-slate-500">{r.locationName}</span>
                        ) : null}
                        <p className="line-clamp-2 text-xs text-slate-500">{r.lastMessagePreview}</p>
                        <span className="text-[10px] text-slate-400">
                          {new Date(r.lastMessageAt).toLocaleString()}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden lg:h-full lg:min-h-0">
          {!selectedId ? (
            <CardBody className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-8">
              <p className="text-center text-sm text-slate-500">
                Select a conversation on the left to view messages.
              </p>
            </CardBody>
          ) : (
            <>
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-slate-900">
                    {selected?.title ?? "Ticket"}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {selected?.ticketCode ?? selectedId}{" "}
                    {selected?.locationName ? `· ${selected.locationName}` : ""}
                  </p>
                </div>
                <Link
                  href={`/dashboard/tickets/view?id=${encodeURIComponent(selectedId)}`}
                  className="shrink-0 text-xs font-medium text-primary-600 hover:underline"
                >
                  Open ticket
                </Link>
              </div>
              <CardBody className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden p-0">
                <div
                  ref={threadScrollRef}
                  className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-3"
                >
                  <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                    {loadingThread ? (
                      <SkeletonMessageBubbles count={4} />
                    ) : messages.length === 0 ? (
                      <p className="text-center text-sm text-slate-500">No messages yet.</p>
                    ) : (
                      messages.map((m) => (
                        <TicketMessageBubble key={m.id} m={m} viewerUserId={user.id} compact />
                      ))
                    )}
                  </div>
                </div>
                <form
                  onSubmit={onSubmitReply}
                  className="shrink-0 border-t border-slate-100 bg-white px-3 py-2.5"
                >
                  <div className="flex min-h-[2.75rem] items-end gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 px-2 py-1.5 shadow-sm focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-slate-200/80">
                    <label htmlFor="admin-inbox-reply" className="sr-only">
                      Reply to conversation (Enter to send, Shift+Enter for new line)
                    </label>
                    <textarea
                      id="admin-inbox-reply"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={onReplyKeyDown}
                      placeholder="Message…"
                      rows={1}
                      className="max-h-28 min-h-[2.25rem] w-0 min-w-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-1.5 py-1.5 text-sm leading-5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
                    />
                    <Button
                      type="submit"
                      disabled={sending || !messageText.trim()}
                      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3"
                      aria-label="Send message"
                    >
                      <Send className="h-4 w-4" />
                      <span className="hidden sm:inline">{sending ? "Sending…" : "Send"}</span>
                    </Button>
                  </div>
                </form>
              </CardBody>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
