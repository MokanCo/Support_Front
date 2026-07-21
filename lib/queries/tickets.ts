import { apiFetch } from "@/lib/auth-fetch";
import { parseUsersListJson } from "@/lib/users-api";
import {
  fetchTicketActivityList,
  mergeActivitiesPreferServer,
  buildCreatedActivity,
  type TicketActivityItem,
  type TicketSnapshot,
} from "@/lib/ticket-activity";
import type { SerializedTicket } from "@/lib/serialize-ticket";
import type { TicketPriority, TicketStatus } from "@/lib/ticket-types";
import { queryKeys, type TicketListFilters } from "@/lib/query-keys";

export type TicketDetail = {
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
  resolution?: string;
  resolutionByName?: string | null;
  completedAt?: string | null;
};

export type AssignableUser = { id: string; name: string; email: string };

export type TicketListResponse = {
  tickets: SerializedTicket[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function fetchTicketDetail(ticketId: string): Promise<TicketDetail> {
  const res = await apiFetch(`/api/tickets/${ticketId}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Not found");
  return json as TicketDetail;
}

export async function fetchAssignableUsersForTicket(
  ticket: TicketDetail,
): Promise<AssignableUser[]> {
  const locId = ticket.locationId;
  if (!locId) return [];

  const locRes = await apiFetch(
    `/api/locations/${encodeURIComponent(locId)}?forTicketAssignment=1`,
  );
  const locJson: unknown = await locRes.json();
  if (!locRes.ok) return [];

  const list = parseUsersListJson(locJson) as {
    id: string;
    name: string;
    email: string;
    role?: string;
  }[];
  return list
    .filter((u) => u.role === "support" || u.role === "admin")
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
    }));
}

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

export async function fetchTicketActivitiesForDetail(
  ticketId: string,
  ticket: TicketDetail,
): Promise<TicketActivityItem[]> {
  const remote = await fetchTicketActivityList(ticketId);
  const seed = [buildCreatedActivity(ticketToSnapshot(ticket))];
  return mergeActivitiesPreferServer(remote, seed);
}

export async function fetchTicketsList(
  filters: TicketListFilters,
): Promise<TicketListResponse> {
  const params = new URLSearchParams();
  params.set("page", String(filters.page));
  params.set("pageSize", String(filters.pageSize));
  params.set("sort", filters.sort);
  params.set("order", filters.order);
  if (filters.status) params.set("status", filters.status);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.overdue) params.set("overdue", "1");
  if (filters.locationId) params.set("locationId", filters.locationId);
  if (filters.search?.trim()) params.set("search", filters.search.trim());

  const res = await apiFetch(`/api/tickets?${params.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed");
  return data as TicketListResponse;
}

export async function fetchRelatedTickets(
  ticketId: string,
  locationId: string,
  category: string,
): Promise<SerializedTicket[]> {
  const params = new URLSearchParams();
  params.set("page", "1");
  params.set("pageSize", "100");
  params.set("sort", "updatedAt");
  params.set("order", "desc");
  params.set("locationId", locationId);
  params.set("category", category);

  let res = await apiFetch(`/api/tickets?${params.toString()}`);
  let data = (await res.json()) as { tickets?: SerializedTicket[]; error?: string };
  if (!res.ok) {
    params.delete("category");
    res = await apiFetch(`/api/tickets?${params.toString()}`);
    data = (await res.json()) as { tickets?: SerializedTicket[]; error?: string };
  }
  if (!res.ok) return [];

  const list = Array.isArray(data.tickets) ? data.tickets : [];
  return list
    .filter((t) => t.id !== ticketId && (t.category ?? "").trim() === category)
    .slice(0, 20);
}

export function ticketListQueryKey(filters: TicketListFilters) {
  return queryKeys.tickets.list(filters);
}
