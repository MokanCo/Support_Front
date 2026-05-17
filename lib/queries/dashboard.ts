import { apiFetch } from "@/lib/auth-fetch";
import { parseUsersListJson } from "@/lib/users-api";
import type { SerializedTicket } from "@/lib/serialize-ticket";
import type { UserRole } from "@/lib/user-roles";
import { queryKeys } from "@/lib/query-keys";

type TicketListRes = {
  tickets: SerializedTicket[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type DashboardLoc = { id: string; name: string; createdAt: string };

export type AdminDashboardUser = {
  id: string;
  role: UserRole;
  createdAt: Date | null;
};

export type AdminDashboardData = {
  users: AdminDashboardUser[];
  locations: DashboardLoc[];
  tickets: SerializedTicket[];
  ticketApiTotal: number;
  truncated: boolean;
};

export type SupportDashboardData = {
  tickets: SerializedTicket[];
  total: number;
};

const MAX_TICKETS = 12000;

function parseUserRow(raw: unknown): AdminDashboardUser | null {
  if (!raw || typeof raw !== "object") return null;
  const u = raw as Record<string, unknown>;
  const id = u.id != null ? String(u.id) : "";
  if (!id) return null;
  const role = u.role;
  if (typeof role !== "string") return null;
  const createdRaw = u.createdAt;
  let createdAt: Date | null = null;
  if (createdRaw) {
    const d = new Date(String(createdRaw));
    createdAt = Number.isNaN(d.getTime()) ? null : d;
  }
  return { id, role: role as UserRole, createdAt };
}

export async function fetchAllLocationsForDashboard(): Promise<DashboardLoc[]> {
  const out: DashboardLoc[] = [];
  let page = 1;
  const pageSize = 100;
  for (;;) {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      sort: "createdAt",
      order: "asc",
    });
    const res = await apiFetch(`/api/locations?${params}`);
    const data = (await res.json()) as {
      locations?: DashboardLoc[];
      totalPages?: number;
      error?: string;
    };
    if (!res.ok) throw new Error(data.error ?? "Failed to load locations");
    out.push(...(data.locations ?? []));
    if (page >= (data.totalPages ?? 1)) break;
    page += 1;
  }
  return out;
}

export async function fetchTicketsForInsights(): Promise<{
  tickets: SerializedTicket[];
  total: number;
  truncated: boolean;
}> {
  const pageSize = 200;
  const res1 = await apiFetch(
    `/api/tickets?page=1&pageSize=${pageSize}&sort=createdAt&order=asc`,
  );
  const j1 = (await res1.json()) as TicketListRes & { error?: string };
  if (!res1.ok) throw new Error(j1.error ?? "Failed to load tickets");
  const total = j1.total ?? 0;
  const totalPages = Math.max(1, j1.totalPages ?? 1);
  const out: SerializedTicket[] = [...(j1.tickets ?? [])];
  let page = 2;
  while (page <= totalPages && out.length < Math.min(total, MAX_TICKETS)) {
    const res = await apiFetch(
      `/api/tickets?page=${page}&pageSize=${pageSize}&sort=createdAt&order=asc`,
    );
    const data = (await res.json()) as TicketListRes & { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Failed to load tickets");
    out.push(...(data.tickets ?? []));
    page += 1;
  }
  return { tickets: out, total, truncated: total > out.length };
}

export async function fetchAdminDashboardData(): Promise<AdminDashboardData> {
  const [uRes, locs, pack] = await Promise.all([
    apiFetch("/api/users"),
    fetchAllLocationsForDashboard(),
    fetchTicketsForInsights(),
  ]);
  const uJson: unknown = await uRes.json();
  if (!uRes.ok) throw new Error((uJson as { error?: string }).error ?? "Failed to load data");
  const rawList = parseUsersListJson(uJson);
  const users = rawList.map(parseUserRow).filter(Boolean) as AdminDashboardUser[];
  return {
    users,
    locations: locs,
    tickets: pack.tickets,
    ticketApiTotal: pack.total,
    truncated: pack.truncated,
  };
}

export async function fetchSupportDashboardData(): Promise<SupportDashboardData> {
  const pack = await fetchTicketsForInsights();
  return { tickets: pack.tickets, total: pack.total };
}

export const adminDashboardQueryOptions = {
  queryKey: queryKeys.dashboard.admin(),
  queryFn: fetchAdminDashboardData,
} as const;

export const supportDashboardQueryOptions = {
  queryKey: queryKeys.dashboard.support(),
  queryFn: fetchSupportDashboardData,
} as const;
