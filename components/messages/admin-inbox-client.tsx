"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { apiFetch } from "@/lib/auth-fetch";
import { TicketMessageBubble } from "@/components/messages/ticket-message-bubble";
import {
  type ClientMessageRow,
  parseCreatedMessageResponse,
  parseMessagesListResponse,
} from "@/lib/messages-client";
import { useSession } from "@/lib/session-context";
import { useMessageInbox } from "@/lib/message-inbox-context";
import { useTicketSocket } from "@/lib/use-ticket-socket";

type InboxRow = {
  ticketId: string;
  title: string;
  ticketCode: string | null;
  locationName: string | null;
  lastMessageAt: string;
  lastMessagePreview: string;
  lastSenderId: string;
  unreadCount: number;
};

export function AdminInboxClient() {
  const { user } = useSession();
  const messageInbox = useMessageInbox();
  const messageInboxRef = useRef(messageInbox);
  messageInboxRef.current = messageInbox;
  const [rows, setRows] = useState<InboxRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ClientMessageRow[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInbox = useCallback(async () => {
    setLoadingList(true);
    setError(null);
    try {
      const iRes = await apiFetch("/api/conversations/inbox");
      const iJson = await iRes.json();
      if (!iRes.ok) throw new Error(iJson.error ?? "Failed to load inbox");
      setRows((iJson as { conversations: InboxRow[] }).conversations ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  useEffect(() => {
    messageInboxRef.current.setConversationsSelectedTicketId(selectedId);
    return () => messageInboxRef.current.setConversationsSelectedTicketId(null);
  }, [selectedId]);

  const loadThread = useCallback(async (ticketId: string) => {
    setLoadingThread(true);
    setError(null);
    try {
      const res = await apiFetch(
        `/api/messages?ticketId=${encodeURIComponent(ticketId)}`
      );
      const data: unknown = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed");
      setMessages(parseMessagesListResponse(data));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoadingThread(false);
    }
  }, []);

  const loadInboxRef = useRef(loadInbox);
  loadInboxRef.current = loadInbox;

  const onSocketMessage = useCallback((row: ClientMessageRow) => {
    setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
    void loadInboxRef.current();
  }, []);

  useTicketSocket(selectedId, Boolean(selectedId), onSocketMessage, {
    viewerUserId: user.id,
  });

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      await loadThread(selectedId);
      if (cancelled) return;
      await apiFetch("/api/messages/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: selectedId }),
      });
      if (cancelled) return;
      void loadInbox();
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, loadThread, loadInbox]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !messageText.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await apiFetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: selectedId, text: messageText.trim() }),
      });
      const data: unknown = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed");
      const row = parseCreatedMessageResponse(data);
      if (row) {
        setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
      }
      setMessageText("");
      void loadInbox();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSending(false);
    }
  }

  const selected = rows.find((r) => r.ticketId === selectedId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Conversations</h1>
        <p className="mt-1 text-sm text-slate-500">
          All ticket threads with recent activity. Select a conversation to read and reply.
        </p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid min-h-[560px] gap-4 lg:grid-cols-[minmax(0,340px)_1fr]">
        <Card className="flex flex-col overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Inbox</h2>
            <p className="text-xs text-slate-500">Sorted by latest message</p>
          </div>
          <CardBody className="flex-1 overflow-y-auto p-0">
            {loadingList ? (
              <p className="px-4 py-8 text-sm text-slate-500">Loading…</p>
            ) : rows.length === 0 ? (
              <p className="px-4 py-8 text-sm text-slate-500">No conversations yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {rows.map((r) => {
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
                          <span className="font-medium text-slate-900 line-clamp-1">
                            {r.title}
                          </span>
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

        <Card className="flex flex-col overflow-hidden">
          {!selectedId ? (
            <CardBody className="flex flex-1 items-center justify-center p-8">
              <p className="text-center text-sm text-slate-500">
                Select a conversation on the left to view messages.
              </p>
            </CardBody>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
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
                  href={`/dashboard/tickets/${selectedId}`}
                  className="shrink-0 text-xs font-medium text-primary-600 hover:underline"
                >
                  Open ticket
                </Link>
              </div>
              <CardBody className="flex min-h-0 flex-1 flex-col gap-4 p-4">
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                  {loadingThread ? (
                    <p className="text-center text-sm text-slate-500">Loading…</p>
                  ) : messages.length === 0 ? (
                    <p className="text-center text-sm text-slate-500">No messages yet.</p>
                  ) : (
                    messages.map((m) => (
                      <TicketMessageBubble key={m.id} m={m} viewerUserId={user.id} compact />
                    ))
                  )}
                </div>
                <form onSubmit={sendMessage} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <Textarea
                      label="Reply"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Write a reply…"
                      className="min-h-[88px]"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={sending}
                    className="inline-flex shrink-0 items-center gap-2 sm:!h-[88px] sm:!self-stretch"
                  >
                    <Send className="h-4 w-4" />
                    {sending ? "Sending…" : "Send"}
                  </Button>
                </form>
              </CardBody>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
