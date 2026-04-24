"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { StatusBadge, PriorityBadge, NewBadge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/modal";
import { ProgressCircle } from "@/components/ui/progress-circle";
import { TicketChatFab } from "@/components/messages/ticket-chat-fab";
import { TicketChatHeader } from "@/components/messages/ticket-chat-header";
import { TicketMessageBubble } from "@/components/messages/ticket-message-bubble";
import type { TicketStatus, TicketPriority } from "@/models/Ticket";
import { apiFetch } from "@/lib/auth-fetch";
import {
  type ClientMessageRow,
  parseCreatedMessageResponse,
  parseMessagesListResponse,
} from "@/lib/messages-client";
import { useSession } from "@/lib/session-context";
import { useMessageInbox } from "@/lib/message-inbox-context";
import { useTicketSocket } from "@/lib/use-ticket-socket";
import { parseUsersListJson } from "@/lib/users-api";

type Ticket = {
  id: string;
  ticketCode: string | null;
  title: string;
  description: string;
  category: string;
  status: TicketStatus;
  priority: TicketPriority;
  progress: number;
  deadline: string | null;
  isOverdue: boolean;
  locationId: string;
  locationName?: string | null;
  createdBy: string;
  createdByName?: string;
  assignedTo: string | null;
  assignedToName?: string | null;
  createdAt: string;
  updatedAt: string;
  isNew?: boolean;
};

type UserOption = { id: string; name: string; email: string };

export function TicketDetailClient({
  ticketId,
  initialOpenChat = false,
}: {
  ticketId: string;
  initialOpenChat?: boolean;
}) {
  const router = useRouter();
  const session = useSession();
  const messageInbox = useMessageInbox();
  const messageInboxRef = useRef(messageInbox);
  messageInboxRef.current = messageInbox;
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<ClientMessageRow[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);

  const [status, setStatus] = useState<TicketStatus>("in_queue");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [assignee, setAssignee] = useState<string>("");
  const [deadlineLocal, setDeadlineLocal] = useState("");
  const [progressEdit, setProgressEdit] = useState("0");
  const [savingTicket, setSavingTicket] = useState(false);
  const [progressModal, setProgressModal] = useState(false);
  const [progressInput, setProgressInput] = useState("0");

  const role = session.user.role;
  const canManage = role === "admin" || role === "support";
  const isPartner = role === "partner";
  const showInlineConversation = role !== "partner" && role !== "support";

  const onRealtimeMessage = useCallback((row: ClientMessageRow) => {
    setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
  }, []);

  useTicketSocket(ticketId, Boolean(ticket && showInlineConversation), onRealtimeMessage, {
    viewerUserId: session.user.id,
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tRes = await apiFetch(`/api/tickets/${ticketId}`);
      const tJson = await tRes.json();
      if (!tRes.ok) throw new Error(tJson.error ?? "Not found");
      setTicket(tJson);
      setStatus(tJson.status);
      setPriority(tJson.priority ?? "medium");
      setAssignee(tJson.assignedTo ?? "");
      setProgressEdit(String(tJson.progress ?? 0));
      setDeadlineLocal(
        tJson.deadline
          ? new Date(tJson.deadline).toISOString().slice(0, 16)
          : ""
      );

      if (role === "partner" || role === "support") {
        setMessages([]);
      } else {
        const msgRes = await apiFetch(`/api/messages?ticketId=${ticketId}`);
        const msgJson: unknown = await msgRes.json();
        if (!msgRes.ok) throw new Error((msgJson as { error?: string }).error ?? "Messages failed");
        setMessages(parseMessagesListResponse(msgJson));
      }

      if (role === "admin" || role === "support") {
        const locId = tJson.locationId as string | undefined;
        if (!locId) {
          setUsers([]);
        } else {
          const locRes = await apiFetch(
            `/api/locations/${encodeURIComponent(locId)}?forTicketAssignment=1`
          );
          const locJson: unknown = await locRes.json();
          if (!locRes.ok) {
            setUsers([]);
          } else {
            const list = parseUsersListJson(locJson) as {
              id: string;
              name: string;
              email: string;
              role?: string;
            }[];
            const assignable = list.filter(
              (u) => u.role === "support" || u.role === "admin"
            );
            let options: UserOption[] = assignable.map((u) => ({
              id: u.id,
              name: u.name,
              email: u.email,
            }));
            const assignedId = (tJson.assignedTo as string | null | undefined) ?? null;
            if (assignedId && !options.some((o) => o.id === assignedId)) {
              options = [
                ...options,
                {
                  id: assignedId,
                  name:
                    (tJson.assignedToName as string | undefined) ?? "Current assignee",
                  email: "",
                },
              ];
            }
            setUsers(options);
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [ticketId, role]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const stripOpenChatQuery = useCallback(() => {
    router.replace(
      `/dashboard/tickets/view?id=${encodeURIComponent(ticketId)}`,
      { scroll: false }
    );
  }, [router, ticketId]);

  useEffect(() => {
    const inbox = messageInboxRef.current;
    if (!ticket) {
      inbox.setAdminInlineTicketId(null);
      return;
    }
    if (showInlineConversation) {
      inbox.setAdminInlineTicketId(ticket.id);
      void (async () => {
        await apiFetch("/api/messages/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticketId: ticket.id }),
        });
        inbox.clearTicketNotification(ticket.id);
      })();
      return () => inbox.setAdminInlineTicketId(null);
    }
    inbox.setAdminInlineTicketId(null);
  }, [ticket, showInlineConversation]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageText.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await apiFetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: ticket?.id ?? ticketId, text: messageText }),
      });
      const data: unknown = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to send");
      const row = parseCreatedMessageResponse(data);
      if (row) {
        setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
      }
      setMessageText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  async function saveTicketMeta(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    setSavingTicket(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        status,
        priority,
        assignedTo: assignee === "" ? null : assignee,
        progress: Math.min(100, Math.max(0, Number(progressEdit) || 0)),
        deadline: deadlineLocal ? new Date(deadlineLocal).toISOString() : null,
      };
      const res = await apiFetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update");
      setTicket(data);
      setStatus(data.status);
      setPriority(data.priority ?? "medium");
      setAssignee(data.assignedTo ?? "");
      setProgressEdit(String(data.progress ?? 0));
      setDeadlineLocal(
        data.deadline ? new Date(data.deadline).toISOString().slice(0, 16) : ""
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSavingTicket(false);
    }
  }

  async function saveProgressFromModal() {
    const v = Math.min(100, Math.max(0, Number(progressInput) || 0));
    setSavingTicket(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress: v }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update");
      setTicket(data);
      setProgressEdit(String(data.progress ?? 0));
      setProgressModal(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSavingTicket(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-card">
        Loading ticket…
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <Card>
        <CardBody className="p-8 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <Link
            href="/dashboard/tickets"
            className="mt-4 inline-flex text-sm font-medium text-primary-600 hover:underline"
          >
            Back to tickets
          </Link>
        </CardBody>
      </Card>
    );
  }

  if (!ticket) return null;

  return (
    <div className="space-y-6">
      <Modal
        open={progressModal}
        onClose={() => setProgressModal(false)}
        title="Update progress"
        description={ticket.title}
      >
        <div className="space-y-4">
          <Input
            label="Progress (%)"
            type="number"
            min={0}
            max={100}
            value={progressInput}
            onChange={(e) => setProgressInput(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setProgressModal(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void saveProgressFromModal()}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          className="inline-flex items-center gap-2 !px-0 !text-slate-600 hover:!text-slate-900"
          onClick={() => router.push("/dashboard/tickets")}
        >
          <ArrowLeft className="h-4 w-4" />
          Tickets
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-6 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold text-primary-600">
                  {ticket.ticketCode ?? "—"}
                </span>
                {ticket.isNew ? <NewBadge /> : null}
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                {ticket.title}
              </h1>
              <p className="text-sm text-slate-500">
                {ticket.category}
                {ticket.locationName ? ` · ${ticket.locationName}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={ticket.status} />
              {!isPartner ? <PriorityBadge priority={ticket.priority} /> : null}
              <div className="flex flex-col items-center gap-1">
                <ProgressCircle
                  value={ticket.progress}
                  disabled={ticket.progress >= 100}
                  onClick={() => {
                    setProgressInput(String(ticket.progress));
                    setProgressModal(true);
                  }}
                />
                <span className="text-[10px] text-slate-400">Progress</span>
              </div>
            </div>
          </div>
        </div>
        <CardBody className="space-y-6 px-6 py-6 sm:px-8">
          <div
            className={`grid gap-6 sm:grid-cols-2 ${
              isPartner ? "lg:grid-cols-3" : "lg:grid-cols-4"
            }`}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Requester
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {ticket.createdByName ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Assignee
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {ticket.assignedToName ?? "Unassigned"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Created
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {new Date(ticket.createdAt).toLocaleString()}
              </p>
            </div>
            {!isPartner ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Deadline
                </p>
                <p
                  className={`mt-1 text-sm font-medium ${
                    ticket.isOverdue ? "text-red-600" : "text-slate-900"
                  }`}
                >
                  {ticket.deadline
                    ? `${new Date(ticket.deadline).toLocaleString()}${ticket.isOverdue ? " (overdue)" : ""}`
                    : "—"}
                </p>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Description
            </p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {ticket.description}
            </p>
          </div>

          {canManage ? (
            <form
              onSubmit={saveTicketMeta}
              className="grid gap-4 rounded-2xl border border-slate-100 bg-white p-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              <Select
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TicketStatus)}
              >
                <option value="in_queue">In queue</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </Select>
              <Select
                label="Priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </Select>
              <Select
                label="Assign to"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.email ? `${u.name} (${u.email})` : u.name}
                  </option>
                ))}
              </Select>
              <Input
                label="Progress (%)"
                type="number"
                min={0}
                max={100}
                value={progressEdit}
                onChange={(e) => setProgressEdit(e.target.value)}
              />
              <Input
                label="Deadline"
                type="datetime-local"
                value={deadlineLocal}
                onChange={(e) => setDeadlineLocal(e.target.value)}
                className="sm:col-span-2"
              />
              <div className="sm:col-span-2 lg:col-span-3">
                <Button type="submit" disabled={savingTicket}>
                  {savingTicket ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          ) : null}
          {error && ticket ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : null}
        </CardBody>
      </Card>

      {showInlineConversation ? (
        <Card className="overflow-hidden">
          <TicketChatHeader
            ticket={ticket}
            subtitle="Thread visible to everyone with access to this ticket."
            className="px-6 sm:px-8"
          />
          <CardBody className="space-y-5 px-6 py-6 sm:px-8">
            <div className="max-h-[480px] space-y-3 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              {messages.length === 0 ? (
                <p className="text-center text-sm text-slate-500">No messages yet.</p>
              ) : (
                messages.map((m) => (
                  <TicketMessageBubble key={m.id} m={m} viewerUserId={session.user.id} />
                ))
              )}
            </div>

            <form onSubmit={sendMessage} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Textarea
                  label="Message"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Write a thoughtful update…"
                  required
                  className="min-h-[96px]"
                />
              </div>
              <Button
                type="submit"
                disabled={sending}
                className="inline-flex shrink-0 items-center gap-2 sm:!h-[96px] sm:!self-stretch"
              >
                <Send className="h-4 w-4" />
                {sending ? "Sending…" : "Send"}
              </Button>
            </form>
          </CardBody>
        </Card>
      ) : null}

      {ticket && (role === "partner" || role === "support") ? (
        <TicketChatFab
          key={ticket.id}
          ticketId={ticket.id}
          viewerUserId={session.user.id}
          ticketHeader={{
            status: ticket.status,
            assignedTo: ticket.assignedTo,
            assignedToName: ticket.assignedToName,
          }}
          initialAutoOpen={initialOpenChat}
          onStripOpenChatQuery={stripOpenChatQuery}
        />
      ) : null}
    </div>
  );
}
