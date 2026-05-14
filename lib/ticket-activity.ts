import type { TicketPriority, TicketStatus } from "@/lib/ticket-types";
import { apiFetch } from "@/lib/auth-fetch";

export type TicketActivityKind =
  | "ticket_created"
  | "status_changed"
  | "priority_changed"
  | "assignee_changed"
  | "progress_changed"
  | "deadline_changed"
  | "message_sent"
  | "unknown";

export type TicketActivityItem = {
  id: string;
  at: string;
  kind: TicketActivityKind;
  actorName: string;
  summary: string;
  meta?: Record<string, unknown>;
};

export type TicketSnapshot = {
  status: TicketStatus;
  priority: TicketPriority;
  assignedTo: string | null;
  assignedToName?: string | null;
  progress: number;
  deadline: string | null;
  createdAt: string;
  createdByName?: string;
  title: string;
};

const STATUS_LABEL: Record<TicketStatus, string> = {
  in_queue: "In queue",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const PRIORITY_LABEL: Record<string, string> = {
  p0: "P0",
  p1: "P1",
  p2: "P2",
  p3: "P3",
  p4: "P4",
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

function priorityLabel(p: string | null | undefined): string {
  if (!p) return "None";
  return PRIORITY_LABEL[p] ?? p;
}

function displayName(
  name: string | null | undefined,
  fallback: string,
): string {
  const t = name?.trim();
  return t && t.length > 0 ? t : fallback;
}

function formatDeadline(d: string | null): string {
  if (!d) return "None";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
}

function normalizeKind(raw: unknown): TicketActivityKind {
  const s = String(raw ?? "")
    .toLowerCase()
    .replace(/-/g, "_");
  const map: Record<string, TicketActivityKind> = {
    ticket_created: "ticket_created",
    created: "ticket_created",
    status_changed: "status_changed",
    status: "status_changed",
    priority_changed: "priority_changed",
    priority: "priority_changed",
    assignee_changed: "assignee_changed",
    assignment: "assignee_changed",
    assigned: "assignee_changed",
    progress_changed: "progress_changed",
    progress: "progress_changed",
    deadline_changed: "deadline_changed",
    deadline: "deadline_changed",
    message_sent: "message_sent",
    message: "message_sent",
  };
  return map[s] ?? "unknown";
}

function summaryFromServerRow(
  r: Record<string, unknown>,
  kind: TicketActivityKind,
): string {
  const explicit = r.summary ?? r.message ?? r.description ?? r.text;
  if (typeof explicit === "string" && explicit.trim()) return explicit.trim();
  const from = r.from ?? r.previousValue ?? r.old;
  const to = r.to ?? r.newValue ?? r.new;
  if (kind === "status_changed" && (from != null || to != null)) {
    return `Status changed from ${STATUS_LABEL[String(from) as TicketStatus] ?? String(from)} to ${STATUS_LABEL[String(to) as TicketStatus] ?? String(to)}`;
  }
  if (kind === "progress_changed" && (from != null || to != null)) {
    return `Progress updated from ${from}% to ${to}%`;
  }
  if (kind === "assignee_changed") {
    return `Assignee updated`;
  }
  return "Ticket updated";
}

function idFromRow(
  r: Record<string, unknown>,
  at: string,
  kind: TicketActivityKind,
  index: number,
): string {
  if (typeof r.id === "string" && r.id) return r.id;
  if (typeof r._id === "string" && r._id) return r._id;
  if (r._id != null) return String(r._id);
  return `srv-${at}-${kind}-${index}`;
}

function parseActivityRows(raw: unknown[]): TicketActivityItem[] {
  const out: TicketActivityItem[] = [];
  let index = 0;
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const atRaw = r.createdAt ?? r.at ?? r.timestamp ?? r.date;
    const at =
      atRaw instanceof Date
        ? atRaw.toISOString()
        : typeof atRaw === "string" || typeof atRaw === "number"
          ? new Date(atRaw).toISOString()
          : "";
    if (!at || Number.isNaN(new Date(at).getTime())) continue;
    const kind = normalizeKind(r.type ?? r.kind ?? r.action);
    const actorName = displayName(
      typeof r.actorName === "string"
        ? r.actorName
        : typeof r.actor === "string"
          ? r.actor
          : typeof r.userName === "string"
            ? r.userName
            : null,
      "Someone",
    );
    const id = idFromRow(r, at, kind, index);
    index += 1;
    const summary = summaryFromServerRow(r, kind);
    const meta: Record<string, unknown> = {};
    for (const k of ["from", "to", "meta", "payload"]) {
      if (r[k] !== undefined) meta[k] = r[k] as unknown;
    }
    out.push({
      id,
      at,
      kind,
      actorName,
      summary,
      meta: Object.keys(meta).length ? meta : undefined,
    });
  }
  return out;
}

export function parseTicketActivities(json: unknown): TicketActivityItem[] {
  if (Array.isArray(json)) return parseActivityRows(json);
  if (!json || typeof json !== "object") return [];
  const root = json as Record<string, unknown>;
  const raw = root.activities ?? root.items ?? root.data;
  if (!Array.isArray(raw)) return [];
  return parseActivityRows(raw);
}

export async function fetchTicketActivityList(
  ticketId: string,
): Promise<TicketActivityItem[] | null> {
  try {
    const res = await apiFetch(
      `/api/tickets/${encodeURIComponent(ticketId)}/activity`,
    );
    if (!res.ok) return null;
    const json: unknown = await res.json();
    return sortActivitiesAscending(parseTicketActivities(json));
  } catch {
    return null;
  }
}

export type RemoteActivityAppend = {
  kind: string;
  summary: string;
  actorName: string;
  createdAt?: string;
  meta?: Record<string, unknown>;
};

export function ticketActivityItemsToRemotePayload(
  items: TicketActivityItem[],
): RemoteActivityAppend[] {
  return items.map((e) => ({
    kind: e.kind,
    summary: e.summary,
    actorName: e.actorName,
    createdAt: e.at,
    meta: e.meta,
  }));
}

export async function appendTicketActivitiesRemote(
  ticketId: string,
  items: RemoteActivityAppend[],
): Promise<boolean> {
  if (items.length === 0) return true;
  try {
    const res = await apiFetch(
      `/api/tickets/${encodeURIComponent(ticketId)}/activity`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activities: items.map((i) => ({
            type: i.kind,
            kind: i.kind,
            summary: i.summary,
            actorName: i.actorName,
            createdAt: i.createdAt,
            meta: i.meta,
          })),
        }),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

export function buildCreatedActivity(
  ticket: TicketSnapshot,
): TicketActivityItem {
  const title =
    ticket.title.length > 72 ? `${ticket.title.slice(0, 72)}…` : ticket.title;
  return {
    id: `seed-created-${ticket.createdAt}`,
    at: ticket.createdAt,
    kind: "ticket_created",
    actorName: displayName(ticket.createdByName, "Someone"),
    summary: `Created ticket · ${title}`,
  };
}

export function buildActivitiesFromTicketDiff(
  prev: TicketSnapshot,
  next: TicketSnapshot,
  actorName: string,
): TicketActivityItem[] {
  const actor = displayName(actorName, "Someone");
  const mk = (
    kind: TicketActivityKind,
    summary: string,
  ): TicketActivityItem => ({
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    at: new Date().toISOString(),
    kind,
    actorName: actor,
    summary,
  });
  const out: TicketActivityItem[] = [];

  if (prev.status !== next.status) {
    out.push(
      mk(
        "status_changed",
        `Changed status to ${STATUS_LABEL[next.status]} (was ${STATUS_LABEL[prev.status]})`,
      ),
    );
  }
  if (prev.priority !== next.priority) {
    out.push(
      mk(
        "priority_changed",
        `Changed priority to ${priorityLabel(next.priority)} (was ${priorityLabel(prev.priority)})`,
      ),
    );
  }
  const prevAssignee = displayName(
    prev.assignedToName,
    prev.assignedTo ? "Unknown" : "Unassigned",
  );
  const nextAssignee = displayName(
    next.assignedToName,
    next.assignedTo ? "Unknown" : "Unassigned",
  );
  if (
    prev.assignedTo !== next.assignedTo ||
    prev.assignedToName !== next.assignedToName
  ) {
    out.push(
      mk("assignee_changed", `Assignment: ${prevAssignee} → ${nextAssignee}`),
    );
  }
  if (prev.progress !== next.progress) {
    out.push(
      mk(
        "progress_changed",
        `Progress set to ${next.progress}% (was ${prev.progress}%)`,
      ),
    );
  }
  const prevDl = prev.deadline ? new Date(prev.deadline).getTime() : null;
  const nextDl = next.deadline ? new Date(next.deadline).getTime() : null;
  if (prevDl !== nextDl) {
    if (!next.deadline) {
      out.push(mk("deadline_changed", "Removed deadline"));
    } else if (!prev.deadline) {
      out.push(
        mk(
          "deadline_changed",
          `Set deadline to ${formatDeadline(next.deadline)}`,
        ),
      );
    } else {
      out.push(
        mk(
          "deadline_changed",
          `Deadline updated to ${formatDeadline(next.deadline)}`,
        ),
      );
    }
  }

  return out;
}

export function buildMessageSentActivity(
  actorName: string,
): TicketActivityItem {
  return {
    id: `local-msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    at: new Date().toISOString(),
    kind: "message_sent",
    actorName: displayName(actorName, "Someone"),
    summary: "Sent a message on the ticket thread",
  };
}

export function sortActivitiesAscending(
  items: TicketActivityItem[],
): TicketActivityItem[] {
  return [...items].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );
}

export function mergeActivitiesPreferServer(
  remote: TicketActivityItem[] | null,
  seedWhenEmptyOrFailed: TicketActivityItem[],
): TicketActivityItem[] {
  if (remote !== null && remote.length > 0)
    return sortActivitiesAscending(remote);
  return sortActivitiesAscending(seedWhenEmptyOrFailed);
}
