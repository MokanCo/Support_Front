"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { StatusBadge, PriorityBadge, NewBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/modal";
import { ProgressCircle } from "@/components/ui/progress-circle";
import type { TicketStatus, TicketPriority } from "@/lib/ticket-types";
import { apiFetch } from "@/lib/auth-fetch";
import { useSession } from "@/lib/session-context";
import { parseUsersListJson } from "@/lib/users-api";
import {
  appendTicketActivitiesRemote,
  buildActivitiesFromTicketDiff,
  buildCreatedActivity,
  fetchTicketActivityList,
  mergeActivitiesPreferServer,
  sortActivitiesAscending,
  ticketActivityItemsToRemotePayload,
  type TicketActivityItem,
  type TicketSnapshot,
} from "@/lib/ticket-activity";
import { TicketActivityTimeline } from "@/components/tickets/ticket-activity-timeline";
import { TicketChatFab } from "@/components/messages/ticket-chat-fab";

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

function ticketToSnapshot(t: Ticket): TicketSnapshot {
  return {
    status: t.status,
    priority: t.priority,
    assignedTo: t.assignedTo,
    assignedToName: t.assignedToName,
    progress: t.progress,
    deadline: t.deadline,
    createdAt: t.createdAt,
    createdByName: t.createdByName,
    title: t.title,
  };
}

type UserOption = { id: string; name: string; email: string };

export function TicketDetailClient({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const session = useSession();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<TicketStatus>("in_queue");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [assignee, setAssignee] = useState<string>("");
  const [deadlineLocal, setDeadlineLocal] = useState("");
  const [progressEdit, setProgressEdit] = useState("0");
  const [savingTicket, setSavingTicket] = useState(false);
  const [progressModal, setProgressModal] = useState(false);
  const [progressInput, setProgressInput] = useState("0");
  const [activities, setActivities] = useState<TicketActivityItem[]>([]);

  const role = session.user.role;
  const canManage = role === "admin" || role === "support";
  const isPartner = role === "partner";
  const showActivityPanel = canManage;

  const initialChatOpen =
    searchParams.get("chat") === "1" || searchParams.get("openChat") === "1";

  const stripOpenChatQuery = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    let changed = false;
    if (next.has("chat")) {
      next.delete("chat");
      changed = true;
    }
    if (next.has("openChat")) {
      next.delete("openChat");
      changed = true;
    }
    if (!changed) return;
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const ticketClosed =
    ticket?.status === "completed" || ticket?.status === "cancelled";
  const partnerComposerDisabled = isPartner && Boolean(ticketClosed);

  const mergeActivityAfterMutation = useCallback(
    async (before: Ticket, after: Ticket) => {
      if (!showActivityPanel) return;
      const diff = buildActivitiesFromTicketDiff(
        ticketToSnapshot(before),
        ticketToSnapshot(after),
        session.user.name
      );
      if (diff.length > 0) {
        await appendTicketActivitiesRemote(
          ticketId,
          ticketActivityItemsToRemotePayload(diff)
        );
      }
      const refreshed = await fetchTicketActivityList(ticketId);
      setActivities((prev) => {
        const seed = [buildCreatedActivity(ticketToSnapshot(after))];
        if (refreshed !== null && refreshed.length > 0) return refreshed;
        if (refreshed !== null) return sortActivitiesAscending([...prev, ...diff]);
        return sortActivitiesAscending([...prev, ...diff]);
      });
    },
    [showActivityPanel, ticketId, session.user.name]
  );

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

      if (role === "admin" || role === "support") {
        const remote = await fetchTicketActivityList(ticketId);
        const seed = [buildCreatedActivity(ticketToSnapshot(tJson as unknown as Ticket))];
        setActivities(mergeActivitiesPreferServer(remote, seed));
      } else {
        setActivities([]);
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

  async function saveTicketMeta(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage || !ticket) return;
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
      const prevSnap = ticket;
      setTicket(data);
      setStatus(data.status);
      setPriority(data.priority ?? "medium");
      setAssignee(data.assignedTo ?? "");
      setProgressEdit(String(data.progress ?? 0));
      setDeadlineLocal(
        data.deadline ? new Date(data.deadline).toISOString().slice(0, 16) : ""
      );
      void mergeActivityAfterMutation(prevSnap, data as unknown as Ticket);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSavingTicket(false);
    }
  }

  async function saveProgressFromModal() {
    const v = Math.min(100, Math.max(0, Number(progressInput) || 0));
    if (!ticket) return;
    const prevSnap = ticket;
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
      void mergeActivityAfterMutation(prevSnap, data as unknown as Ticket);
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
    <div className={`flex min-h-0 flex-1 flex-col gap-3 ${isPartner ? "mx-auto max-w-4xl" : ""}`}>
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

      <div
        className={`grid gap-3 ${isPartner ? "" : "lg:grid-cols-[minmax(0,1fr)_288px] xl:grid-cols-[minmax(0,1fr)_320px]"}`}
      >
        <div className="min-w-0 space-y-3">
      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-4 sm:px-5">
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
        <CardBody className="space-y-4 px-4 py-4 sm:px-5">
          <div
            className={`grid gap-4 sm:grid-cols-2 ${
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
              <div className="flex justify-end sm:col-span-2 lg:col-span-3">
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

        </div>

        {!isPartner && showActivityPanel ? (
          <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <TicketActivityTimeline items={activities} />
          </aside>
        ) : null}
      </div>

      {isPartner ? (
      <TicketChatFab
        ticketId={ticketId}
        viewerUserId={session.user.id}
        ticketHeader={{
          status: ticket.status,
          assignedTo: ticket.assignedTo,
          assignedToName: ticket.assignedToName,
        }}
        initialAutoOpen={initialChatOpen}
        onStripOpenChatQuery={stripOpenChatQuery}
        composerDisabled={partnerComposerDisabled}
        composerDisabledMessage={
          partnerComposerDisabled
            ? "This ticket is closed. You can read messages but cannot send new ones."
            : undefined
        }
      />
      ) : null}
    </div>
  );
}
