"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { StatusBadge, PriorityBadge, NewBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/Textarea";
import { ProgressCircle } from "@/components/ui/progress-circle";
import type { TicketStatus, TicketPriority } from "@/lib/ticket-types";
import type { SerializedTicket } from "@/lib/serialize-ticket";
import { apiFetch } from "@/lib/auth-fetch";
import { useSession } from "@/lib/session-context";
import {
  appendTicketActivitiesRemote,
  buildActivitiesFromTicketDiff,
  ticketActivityItemsToRemotePayload,
  type TicketActivityItem,
  type TicketSnapshot,
} from "@/lib/ticket-activity";
import { TicketDetailStaffSidebar } from "@/components/tickets/ticket-detail-staff-sidebar";
import { TicketDetailPageSkeleton } from "@/components/ui/skeleton";
import { TicketChatFab } from "@/components/messages/ticket-chat-fab";
import { requestSidebarCountsRefresh } from "@/lib/sidebar-counts-refresh";
import { queryKeys } from "@/lib/query-keys";
import {
  fetchAssignableUsersForTicket,
  fetchRelatedTickets,
  fetchTicketActivitiesForDetail,
  fetchTicketDetail,
  type TicketDetail,
} from "@/lib/queries/tickets";

type Ticket = TicketDetail;

function ticketToSnapshot(t: TicketDetail): TicketSnapshot {
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

function TicketSummaryReadonly({
  ticket,
  variant = "staff",
}: {
  ticket: Ticket;
  variant?: "staff" | "partner";
}) {
  const rows: [string, string][] = [
    ["Requester", ticket.createdByName ?? "—"],
    ["Assigned to", ticket.assignedToName ?? "Unassigned"],
    ["Created", new Date(ticket.createdAt).toLocaleString()],
    [
      "Deadline",
      ticket.deadline
        ? `${new Date(ticket.deadline).toLocaleString()}${ticket.isOverdue ? " · Overdue" : ""}`
        : "—",
    ],
    ["Last updated", new Date(ticket.updatedAt).toLocaleString()],
    ["Status", ticket.status.replace(/_/g, " ")],
    ["Priority", ticket.priority.toUpperCase()],
    ["Progress", `${ticket.progress}%`],
  ];
  if (ticket.status === "completed") {
    rows.push(
      ["Completed at", ticket.completedAt ? new Date(ticket.completedAt).toLocaleString() : "—"],
    );
    if (!ticket.resolution?.trim()) {
      rows.push(["Completed by", ticket.resolutionByName ?? "—"]);
    }
  }
  if (ticket.status === "cancelled") {
    rows.push(["Outcome", "Cancelled"]);
  }
  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Ticket summary</h3>
        <p className="mt-1 text-xs text-slate-500">
          {variant === "partner"
            ? "This ticket is closed. A quick read-only summary is below."
            : "This ticket is closed for editing. Key details are summarized below."}
        </p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="border-t border-slate-200 pt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Description</p>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
          {ticket.description || "—"}
        </p>
      </div>

      {ticket.status === "completed" && ticket.resolution ? (
        <div className="border-t border-slate-200 pt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Resolution</p>
          <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-emerald-950">{ticket.resolution}</p>
            {ticket.resolutionByName ? (
              <p className="mt-3 text-xs text-emerald-800/90">
                Recorded by {ticket.resolutionByName}
                {ticket.completedAt
                  ? ` · ${new Date(ticket.completedAt).toLocaleString()}`
                  : ""}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function TicketDetailClient({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const session = useSession();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<TicketStatus>("in_queue");
  const [priority, setPriority] = useState<TicketPriority>("p2");
  const [assignee, setAssignee] = useState<string>("");
  const [deadlineLocal, setDeadlineLocal] = useState("");
  const [progressEdit, setProgressEdit] = useState<number>(0);
  const [savingTicket, setSavingTicket] = useState(false);
  const [progressModal, setProgressModal] = useState(false);
  const [progressInput, setProgressInput] = useState<number>(0);
  const [activities, setActivities] = useState<TicketActivityItem[]>([]);
  const [completeBlockedModal, setCompleteBlockedModal] = useState(false);
  const [resolutionModal, setResolutionModal] = useState(false);
  const [resolutionText, setResolutionText] = useState("");
  const role = session.user.role;
  const canManage = role === "admin" || role === "support";
  const isPartner = role === "partner";
  const isSupport = role === "support";
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

  const ticketQuery = useQuery({
    queryKey: queryKeys.tickets.detail(ticketId),
    queryFn: () => fetchTicketDetail(ticketId),
    enabled: Boolean(ticketId),
  });

  const ticket = (ticketQuery.data as Ticket | undefined) ?? null;

  const ticketClosed =
    ticket?.status === "completed" || ticket?.status === "cancelled";
  const ticketReadOnly = Boolean(canManage && ticketClosed);
  const partnerComposerDisabled = isPartner && Boolean(ticketClosed);

  const usersQuery = useQuery({
    queryKey: queryKeys.tickets.assignableUsers(ticket?.locationId ?? ""),
    queryFn: () => fetchAssignableUsersForTicket(ticket!),
    enabled: canManage && Boolean(ticket?.locationId),
  });
  const users = (usersQuery.data ?? []) as UserOption[];

  const activitiesQuery = useQuery({
    queryKey: queryKeys.tickets.activities(ticketId),
    queryFn: () => fetchTicketActivitiesForDetail(ticketId, ticket!),
    enabled: showActivityPanel && Boolean(ticket),
  });

  useEffect(() => {
    if (activitiesQuery.data) setActivities(activitiesQuery.data);
    else if (!showActivityPanel) setActivities([]);
  }, [activitiesQuery.data, showActivityPanel]);

  const category = ticket?.category?.trim() ?? "";
  const locId = ticket?.locationId ?? "";
  const relatedEnabled =
    (isSupport || isPartner) && Boolean(ticket) && !ticketClosed && Boolean(category) && Boolean(locId);

  const relatedQuery = useQuery({
    queryKey: queryKeys.tickets.related(ticketId, locId, category),
    queryFn: () => fetchRelatedTickets(ticketId, locId, category),
    enabled: relatedEnabled,
  });
  const relatedTickets = relatedQuery.data ?? [];

  useEffect(() => {
    if (!ticket) return;
    setStatus(ticket.status as TicketStatus);
    setPriority((ticket.priority as TicketPriority) ?? "p2");
    setAssignee(ticket.assignedTo ?? "");
    setProgressEdit(ticket.progress ?? 0);
    setDeadlineLocal(
      ticket.deadline
        ? new Date(ticket.deadline).toISOString().slice(0, 16)
        : "",
    );
  }, [ticket]);

  useEffect(() => {
    if (ticketQuery.error) {
      setError(
        ticketQuery.error instanceof Error
          ? ticketQuery.error.message
          : "Failed to load",
      );
    }
  }, [ticketQuery.error]);

  const mergeActivityAfterMutation = useCallback(
    async (before: TicketDetail, after: TicketDetail) => {
      if (!showActivityPanel) return;
      const diff = buildActivitiesFromTicketDiff(
        ticketToSnapshot(before),
        ticketToSnapshot(after),
        session.user.name,
      );
      if (diff.length > 0) {
        await appendTicketActivitiesRemote(
          ticketId,
          ticketActivityItemsToRemotePayload(diff),
        );
      }
      await queryClient.invalidateQueries({
        queryKey: queryKeys.tickets.activities(ticketId),
      });
    },
    [showActivityPanel, ticketId, session.user.name, queryClient],
  );

  const patchTicketCache = useCallback(
    (data: TicketDetail) => {
      queryClient.setQueryData(queryKeys.tickets.detail(ticketId), data);
    },
    [queryClient, ticketId],
  );

  const applyTicketPatch = useCallback(
    async (body: Record<string, unknown>) => {
      if (!ticket) return;
      const prevSnap = ticket;
      const res = await apiFetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as Ticket & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to update");
      patchTicketCache(data as TicketDetail);
      setStatus(data.status);
      setPriority(data.priority ?? "p2");
      setAssignee(data.assignedTo ?? "");
      setProgressEdit(data.progress ?? 0);
      setDeadlineLocal(
        data.deadline ? new Date(data.deadline).toISOString().slice(0, 16) : "",
      );
      void mergeActivityAfterMutation(prevSnap, data);
      if (canManage) {
        requestSidebarCountsRefresh();
        void queryClient.invalidateQueries({ queryKey: queryKeys.tickets.lists() });
      }
    },
    [mergeActivityAfterMutation, ticket, ticketId, canManage, patchTicketCache, queryClient],
  );

  async function saveTicketMeta(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage || !ticket || ticketReadOnly) return;

    if (status === "completed") {
      if (progressEdit < 100) {
        setError(null);
        setCompleteBlockedModal(true);
        return;
      }
      if (ticket.status !== "completed") {
        setError(null);
        setResolutionModal(true);
        return;
      }
    }

    setSavingTicket(true);
    setError(null);
    try {
      await applyTicketPatch({
        status,
        priority,
        assignedTo: assignee === "" ? null : assignee,
        progress: progressEdit,
        deadline: deadlineLocal ? new Date(deadlineLocal).toISOString() : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSavingTicket(false);
    }
  }

  async function submitResolution() {
    const trimmed = resolutionText.trim();
    if (!trimmed) {
      setError("Resolution is required to complete this ticket.");
      return;
    }
    if (!ticket || ticketReadOnly) return;
    setSavingTicket(true);
    setError(null);
    try {
      await applyTicketPatch({
        status: "completed",
        priority,
        assignedTo: assignee === "" ? null : assignee,
        progress: progressEdit,
        deadline: deadlineLocal ? new Date(deadlineLocal).toISOString() : null,
        resolution: trimmed,
      });
      setResolutionModal(false);
      setResolutionText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSavingTicket(false);
    }
  }

  async function saveProgressFromModal() {
    const v = progressInput;
    if (!ticket || ticketReadOnly) return;
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
      patchTicketCache(data as TicketDetail);
      setProgressEdit(data.progress ?? 0);
      setProgressModal(false);
      void mergeActivityAfterMutation(prevSnap, data as unknown as Ticket);
      if (canManage) requestSidebarCountsRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSavingTicket(false);
    }
  }

  const loading = ticketQuery.isPending && !ticket;

  if (loading) {
    return <TicketDetailPageSkeleton />;
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
    <div className="flex h-[calc(100dvh-8rem)] flex-col gap-6">
      <Modal
        open={progressModal}
        onClose={() => setProgressModal(false)}
        title="Update progress"
        description={ticket.title}
      >
        <div className="space-y-4">
          <Select
            label="Progress"
            value={String(progressInput)}
            onChange={(e) => setProgressInput(Number(e.target.value))}
          >
            <option value="0">0%</option>
            <option value="25">25%</option>
            <option value="50">50%</option>
            <option value="75">75%</option>
            <option value="100">100%</option>
          </Select>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setProgressModal(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => void saveProgressFromModal()}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={completeBlockedModal}
        onClose={() => setCompleteBlockedModal(false)}
        title="Cannot mark complete"
        description="Ticket progress must be 100% before you can complete this ticket."
      >
        <div className="flex justify-end pt-2">
          <Button type="button" onClick={() => setCompleteBlockedModal(false)}>
            OK
          </Button>
        </div>
      </Modal>

      <Modal
        open={resolutionModal}
        onClose={() => {
          setResolutionModal(false);
          setResolutionText("");
        }}
        title="Resolution"
        description="Describe how this ticket was resolved. This is saved with the completed ticket."
      >
        <div className="space-y-4">
          <Textarea
            label="Resolution"
            value={resolutionText}
            onChange={(e) => setResolutionText(e.target.value)}
            rows={5}
            required
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setResolutionModal(false);
                setResolutionText("");
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button type="button" disabled={savingTicket} onClick={() => void submitResolution()}>
              {savingTicket ? "Saving…" : "Complete ticket"}
            </Button>
          </div>
        </div>
      </Modal>

      <Link
        href="/dashboard/tickets"
        className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Tickets
      </Link>

      <div
        className={`grid min-h-0 flex-1 gap-6 lg:items-stretch ${
          isPartner
            ? ""
            : "lg:grid-cols-[minmax(0,1fr)_288px] xl:grid-cols-[minmax(0,1fr)_320px]"
        }`}
      >
        <div className="flex min-h-0 min-w-0 flex-col">
          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="shrink-0 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
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
                  <PriorityBadge priority={ticket.priority} />
                  <div className="flex flex-col items-center gap-1">
                    <ProgressCircle
                      value={ticket.progress}
                      disabled={isPartner || ticketReadOnly || ticket.progress >= 100}
                      onClick={
                        isPartner || ticketReadOnly
                          ? undefined
                          : () => {
                              setProgressInput(ticket.progress);
                              setProgressModal(true);
                            }
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <CardBody className="min-h-0 flex-1 space-y-5 overflow-y-auto">
              {ticketClosed ? (
                <TicketSummaryReadonly
                  ticket={ticket}
                  variant={isPartner ? "partner" : "staff"}
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Deadline
                    </p>
                    <p
                      className={`mt-1 text-sm font-medium ${ticket.isOverdue ? "text-red-600" : "text-slate-900"}`}
                    >
                      {ticket.deadline
                        ? `${new Date(ticket.deadline).toLocaleString()}${ticket.isOverdue ? " · Overdue" : ""}`
                        : "—"}
                    </p>
                  </div>
                </div>
              )}

              {!ticketClosed ? (
                <>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Description
                    </p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                      {ticket.description}
                    </p>
                  </div>

                  {(isSupport || isPartner) && relatedTickets.length > 0 ? (
                    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                      <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
                        <h3 className="text-sm font-semibold text-slate-900">Related tickets</h3>
                        <p className="mt-1 text-xs text-slate-500">
                          Same category as this request:{" "}
                          <span className="font-medium text-slate-700">{ticket.category}</span>
                          {ticket.locationName ? (
                            <span className="text-slate-600"> · {ticket.locationName}</span>
                          ) : null}
                        </p>
                      </div>
                      <ul className="divide-y divide-slate-100">
                        {relatedTickets.map((t) => (
                          <li key={t.id}>
                            <Link
                              href={`/dashboard/tickets/view?id=${encodeURIComponent(t.id)}`}
                              className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50/90"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="font-mono text-xs font-medium text-primary-600">
                                  {t.ticketCode ?? "—"}
                                </p>
                                <p className="mt-0.5 line-clamp-2 text-sm font-medium text-slate-900">
                                  {t.title}
                                </p>
                                <div className="mt-2">
                                  <StatusBadge status={t.status} />
                                </div>
                              </div>
                              <ChevronRight
                                className="mt-1 h-4 w-4 shrink-0 text-slate-400"
                                aria-hidden
                              />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              ) : null}

              {canManage && !ticketReadOnly ? (
                <form
                  onSubmit={saveTicketMeta}
                  className="grid items-end gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-3"
                >
                  <Select
                    label="Status"
                    value={status}
                    disabled={ticketReadOnly}
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
                    disabled={ticketReadOnly}
                    onChange={(e) =>
                      setPriority(e.target.value as TicketPriority)
                    }
                  >
                    <option value="p0">P0</option>
                    <option value="p1">P1</option>
                    <option value="p2">P2</option>
                    <option value="p3">P3</option>
                    <option value="p4">P4</option>
                  </Select>
                  <Select
                    label="Assign to"
                    value={assignee}
                    disabled={ticketReadOnly}
                    onChange={(e) => setAssignee(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.email ? `${u.name} (${u.email})` : u.name}
                      </option>
                    ))}
                  </Select>
                  <Select
                    label="Progress"
                    value={String(progressEdit)}
                    disabled={ticketReadOnly}
                    onChange={(e) => setProgressEdit(Number(e.target.value))}
                  >
                    <option value="0">0%</option>
                    <option value="25">25%</option>
                    <option value="50">50%</option>
                    <option value="75">75%</option>
                    <option value="100">100%</option>
                  </Select>
                  <div className="sm:col-span-1 lg:col-span-2">
                    <Input
                      label="Deadline"
                      type="datetime-local"
                      value={deadlineLocal}
                      disabled={ticketReadOnly}
                      onChange={(e) => setDeadlineLocal(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center justify-end sm:col-span-2 lg:col-span-3">
                    {error && ticket ? (
                      <p className="mr-auto text-sm text-red-600">{error}</p>
                    ) : null}
                    <Button type="submit" disabled={savingTicket || ticketReadOnly}>
                      {savingTicket ? "Saving…" : "Save changes"}
                    </Button>
                  </div>
                </form>
              ) : null}

              {error && ticket && !canManage ? (
                <p className="text-sm text-red-600">{error}</p>
              ) : null}
            </CardBody>
          </Card>
        </div>

        {!isPartner ? (
          <aside className="flex h-full min-h-0 min-w-0 flex-col">
            <TicketDetailStaffSidebar
              ticketId={ticketId}
              activities={activities}
              readOnly={ticketReadOnly}
              currentUserId={session.user.id}
              isAdmin={role === "admin"}
            />
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
