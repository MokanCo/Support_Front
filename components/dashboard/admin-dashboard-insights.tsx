"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Eye, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { StatusBadge, PriorityBadge, NewBadge } from "@/components/ui/badge";
import { ProgressCircle } from "@/components/ui/progress-circle";
import type { SerializedTicket } from "@/lib/serialize-ticket";
import type { UserRole } from "@/lib/user-roles";
import { USER_ROLES } from "@/lib/user-roles";
import { apiFetch } from "@/lib/auth-fetch";
import { parseUsersListJson } from "@/lib/users-api";

type Loc = { id: string; name: string; createdAt: string };

type TicketListRes = {
  tickets: SerializedTicket[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const STATUS_CHART: { key: string; label: string; fill: string }[] = [
  { key: "in_queue", label: "New", fill: "#22c55e" },
  { key: "in_progress", label: "Open", fill: "#eab308" },
  { key: "completed", label: "Completed", fill: "#38bdf8" },
  { key: "cancelled", label: "Closed", fill: "#1d4ed8" },
];

const SITE_BAR = "#2563eb";

const MAX_TICKETS = 12000;

type PeriodPreset =
  | "today"
  | "this_week"
  | "previous_week"
  | "last_month"
  | "previous_month"
  | "all";

const PERIOD_OPTIONS: { id: PeriodPreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "this_week", label: "This week" },
  { id: "previous_week", label: "Previous week" },
  { id: "last_month", label: "Last 30 days" },
  { id: "previous_month", label: "Previous month" },
  { id: "all", label: "All" },
];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfWeekMonday(from: Date): Date {
  const d = startOfDay(from);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function getPeriodBounds(preset: PeriodPreset, anchor = new Date()): { start: Date; end: Date } | null {
  const now = anchor;
  switch (preset) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "this_week": {
      const mon = startOfWeekMonday(now);
      return { start: mon, end: endOfDay(now) };
    }
    case "previous_week": {
      const thisMon = startOfWeekMonday(now);
      const prevMon = addDays(thisMon, -7);
      const prevSun = addDays(prevMon, 6);
      return { start: prevMon, end: endOfDay(prevSun) };
    }
    case "last_month": {
      const end = endOfDay(now);
      const start = addDays(startOfDay(now), -29);
      return { start, end };
    }
    case "previous_month": {
      const firstThis = startOfMonth(now);
      const end = addDays(firstThis, -1);
      const start = startOfMonth(end);
      return { start, end: endOfDay(end) };
    }
    case "all":
      return null;
    default:
      return null;
  }
}

/** Prior window for KPI delta (same shape as common dashboards). */
function getComparisonBounds(preset: PeriodPreset, anchor = new Date()): { start: Date; end: Date } | null {
  switch (preset) {
    case "today": {
      const y = addDays(startOfDay(anchor), -1);
      return { start: y, end: endOfDay(y) };
    }
    case "this_week":
      return getPeriodBounds("previous_week", anchor);
    case "previous_week": {
      const pw = getPeriodBounds("previous_week", anchor)!;
      const end = addDays(pw.start, -1);
      const start = addDays(end, -6);
      return { start: startOfDay(start), end: endOfDay(end) };
    }
    case "last_month": {
      const cur = getPeriodBounds("last_month", anchor)!;
      const end = addDays(cur.start, -1);
      const start = addDays(cur.start, -30);
      return { start: startOfDay(start), end: endOfDay(end) };
    }
    case "previous_month": {
      const pm = getPeriodBounds("previous_month", anchor)!;
      const end = addDays(pm.start, -1);
      const start = startOfMonth(end);
      return { start, end: endOfDay(end) };
    }
    case "all":
      return null;
    default:
      return null;
  }
}

function formatRangeSubtitle(preset: PeriodPreset, bounds: { start: Date; end: Date } | null): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  if (preset === "all" || !bounds) return "Full history";
  return `${fmt(bounds.start)} → ${fmt(bounds.end)}`;
}

function inRange(d: Date | null, start: Date, end: Date): boolean {
  if (!d || Number.isNaN(d.getTime())) return false;
  return d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
}

function parseUserRow(raw: unknown): { id: string; role: UserRole; createdAt: Date | null } | null {
  if (!raw || typeof raw !== "object") return null;
  const u = raw as Record<string, unknown>;
  const id = u.id != null ? String(u.id) : u._id != null ? String(u._id) : null;
  if (!id) return null;
  const role = u.role as string;
  if (!USER_ROLES.includes(role as UserRole)) return null;
  const c = u.createdAt;
  const createdAt =
    c instanceof Date ? c : typeof c === "string" || typeof c === "number" ? new Date(c) : null;
  if (createdAt && Number.isNaN(createdAt.getTime())) return { id, role: role as UserRole, createdAt: null };
  return { id, role: role as UserRole, createdAt };
}

function ticketCreatedAt(t: SerializedTicket): Date {
  const c = t.createdAt;
  return typeof c === "string" ? new Date(c) : c;
}

/** Items opened: tickets in range that are not completed (still active or cancelled). */
function isItemsOpened(t: SerializedTicket): boolean {
  return t.status !== "completed";
}

function formatRelativeTime(d: Date): string {
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 45) return "Just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 172800) return "Yesterday";
  return `${Math.floor(sec / 86400)}d ago`;
}

/** Up to two letters for assignee display (e.g. "Ada Lovelace" → "AL"). */
function assigneeInitials(name: string | null | undefined): string | null {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) {
    const w = parts[0];
    return w.length >= 2 ? w.slice(0, 2).toUpperCase() : w.slice(0, 1).toUpperCase();
  }
  const a = parts[0][0];
  const b = parts[parts.length - 1][0];
  if (!a || !b) return null;
  return `${a}${b}`.toUpperCase();
}

function deltaLabel(cur: number, prev: number | null): { text: string; up: boolean | null } {
  if (prev === null) return { text: "—", up: null };
  if (prev === 0 && cur === 0) return { text: "0%", up: null };
  if (prev === 0) return { text: "+100%", up: true };
  const pct = Math.round(((cur - prev) / prev) * 100);
  const text = `${pct >= 0 ? "+" : ""}${pct}%`;
  return { text, up: pct >= 0 };
}

function lastSevenSpark(dates: (Date | null)[]): { i: number; v: number }[] {
  const valid = dates.filter((d): d is Date => d != null && !Number.isNaN(d.getTime()));
  const out: { i: number; v: number }[] = [];
  for (let k = 6; k >= 0; k -= 1) {
    const day = addDays(startOfDay(new Date()), -k);
    const t0 = day.getTime();
    const t1 = endOfDay(day).getTime();
    out.push({ i: 6 - k, v: valid.filter((d) => d.getTime() >= t0 && d.getTime() <= t1).length });
  }
  return out;
}

async function fetchAllLocations(): Promise<Loc[]> {
  const out: Loc[] = [];
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
      locations?: Loc[];
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

async function fetchTicketsCapped(): Promise<{ tickets: SerializedTicket[]; total: number; truncated: boolean }> {
  const pageSize = 200;
  const res1 = await apiFetch(
    `/api/tickets?page=1&pageSize=${pageSize}&sort=createdAt&order=asc`
  );
  const j1 = (await res1.json()) as TicketListRes & { error?: string };
  if (!res1.ok) throw new Error(j1.error ?? "Failed to load tickets");
  const total = j1.total ?? 0;
  const totalPages = Math.max(1, j1.totalPages ?? 1);
  const out: SerializedTicket[] = [...(j1.tickets ?? [])];
  let page = 2;
  while (page <= totalPages && out.length < Math.min(total, MAX_TICKETS)) {
    const res = await apiFetch(
      `/api/tickets?page=${page}&pageSize=${pageSize}&sort=createdAt&order=asc`
    );
    const data = (await res.json()) as TicketListRes & { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Failed to load tickets");
    out.push(...(data.tickets ?? []));
    page += 1;
  }
  return { tickets: out, total, truncated: total > out.length };
}

function StatSparkCard({
  title,
  value,
  delta,
  spark,
  stroke,
  deltaVsPrior = true,
}: {
  title: string;
  value: string;
  delta: { text: string; up: boolean | null };
  spark: { v: number }[];
  stroke: string;
  /** When false, `delta.text` is shown alone (e.g. caption, not a comparison). */
  deltaVsPrior?: boolean;
}) {
  const deltaClass =
    delta.up === null ? "text-slate-400" : delta.up ? "text-emerald-600" : "text-red-600";

  return (
    <Card className="overflow-hidden">
      <CardBody className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
            <p className={`mt-1 text-xs font-semibold ${deltaClass}`}>
              {delta.text}
              {deltaVsPrior && delta.text !== "—" ? " vs prior" : ""}
            </p>
          </div>
          <div className="h-14 w-[5.5rem] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spark} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <XAxis dataKey="i" type="number" hide />
                <YAxis hide domain={["dataMin - 0.5", "dataMax + 0.5"]} />
                <Line type="monotone" dataKey="v" stroke={stroke} strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export function AdminDashboardInsights() {
  const [period, setPeriod] = useState<PeriodPreset>("all");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [truncated, setTruncated] = useState(false);

  const [users, setUsers] = useState<{ id: string; role: UserRole; createdAt: Date | null }[]>([]);
  const [locations, setLocations] = useState<Loc[]>([]);
  const [tickets, setTickets] = useState<SerializedTicket[]>([]);
  const [ticketApiTotal, setTicketApiTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [uRes, locs, pack] = await Promise.all([
        apiFetch("/api/users"),
        fetchAllLocations(),
        fetchTicketsCapped(),
      ]);
      const uJson: unknown = await uRes.json();
      if (!uRes.ok) throw new Error((uJson as { error?: string }).error ?? "Failed to load data");
      const rawList = parseUsersListJson(uJson);
      const parsed = rawList.map(parseUserRow).filter(Boolean) as {
        id: string;
        role: UserRole;
        createdAt: Date | null;
      }[];
      setUsers(parsed);
      setLocations(locs);
      setTickets(pack.tickets);
      setTicketApiTotal(pack.total);
      setTruncated(pack.truncated);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const bounds = useMemo(() => getPeriodBounds(period), [period]);
  const compareBounds = useMemo(() => getComparisonBounds(period), [period]);

  const filtered = useMemo(() => {
    if (bounds === null) {
      return {
        users,
        locations,
        tickets,
        userDates: users.map((u) => u.createdAt),
        locDates: locations.map((l) => new Date(l.createdAt)),
        ticketDates: tickets.map(ticketCreatedAt),
      };
    }
    const { start, end } = bounds;
    return {
      users: users.filter((u) => inRange(u.createdAt, start, end)),
      locations: locations.filter((l) => inRange(new Date(l.createdAt), start, end)),
      tickets: tickets.filter((t) => inRange(ticketCreatedAt(t), start, end)),
      userDates: users.map((u) => u.createdAt).filter((d) => inRange(d, start, end)),
      locDates: locations
        .map((l) => new Date(l.createdAt))
        .filter((d) => inRange(d, start, end)),
      ticketDates: tickets.map(ticketCreatedAt).filter((d) => inRange(d, start, end)),
    };
  }, [users, locations, tickets, bounds]);

  const prevCounts = useMemo(() => {
    if (!compareBounds) return null;
    const { start, end } = compareBounds;
    return {
      opened: tickets.filter(
        (t) => inRange(ticketCreatedAt(t), start, end) && isItemsOpened(t)
      ).length,
      completed: tickets.filter(
        (t) =>
          inRange(ticketCreatedAt(t), start, end) && t.status === "completed"
      ).length,
    };
  }, [compareBounds, tickets]);

  const kpi = useMemo(() => {
    const opened = filtered.tickets.filter(isItemsOpened).length;
    const completed = filtered.tickets.filter((t) => t.status === "completed").length;
    return {
      opened,
      completed,
    };
  }, [filtered]);

  const ticketSpark = useMemo(() => lastSevenSpark(tickets.map(ticketCreatedAt)), [tickets]);
  const completedSpark = useMemo(
    () =>
      lastSevenSpark(
        tickets
          .filter((t) => t.status === "completed")
          .map((t) => (typeof t.updatedAt === "string" ? new Date(t.updatedAt) : t.updatedAt))
      ),
    [tickets]
  );

  const statusDonut = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of STATUS_CHART) map[s.key] = 0;
    for (const t of filtered.tickets) {
      if (map[t.status] !== undefined) map[t.status] += 1;
    }
    const total = filtered.tickets.length || 1;
    return STATUS_CHART.map((s) => ({
      ...s,
      value: map[s.key] ?? 0,
      pct: Math.round(((map[s.key] ?? 0) / total) * 100),
    }));
  }, [filtered.tickets]);

  const activeQueue = useMemo(() => {
    return filtered.tickets
      .filter((t) => t.status === "in_queue" || t.status === "in_progress")
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, 40);
  }, [filtered.tickets]);

  const recentActivity = useMemo(() => {
    return [...filtered.tickets]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 6);
  }, [filtered.tickets]);

  const siteWorkload = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    for (const t of filtered.tickets) {
      const name = t.locationName?.trim() || "Other";
      const cur = map.get(name) ?? { name, count: 0 };
      cur.count += 1;
      map.set(name, cur);
    }
    return [...map.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((r) => ({
        label: r.name.length > 26 ? `${r.name.slice(0, 26)}…` : r.name,
        count: r.count,
      }));
  }, [filtered.tickets]);

  const spotlightCloser = useMemo(() => {
    const done = filtered.tickets.filter((t) => t.status === "completed");
    const byAssignee = new Map<string, number>();
    for (const t of done) {
      const raw = t.assignedToName?.trim();
      if (!raw) continue;
      const n = raw.slice(0, 40);
      byAssignee.set(n, (byAssignee.get(n) ?? 0) + 1);
    }
    let best = "";
    let bestN = 0;
    for (const [n, c] of byAssignee) {
      if (c > bestN) {
        best = n;
        bestN = c;
      }
    }
    return { name: best, tickets: bestN };
  }, [filtered.tickets]);

  const pieData = useMemo(
    () => statusDonut.filter((d) => d.value > 0).map((d) => ({ name: d.label, value: d.value, fill: d.fill })),
    [statusDonut]
  );

  const tooltipStyle = {
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Loading dashboard…</p>;
  }

  if (loadError) {
    return <p className="text-sm text-red-600">{loadError}</p>;
  }

  const d2 = deltaLabel(kpi.completed, prevCounts?.completed ?? null);
  const d3 = deltaLabel(kpi.opened, prevCounts?.opened ?? null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">Operations</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Smart ticket workspace · {formatRangeSubtitle(period, bounds)}
          </p>
          {truncated ? (
            <p className="mt-2 max-w-xl text-xs text-amber-800">
              Charts use up to {MAX_TICKETS.toLocaleString()} loaded items
              {ticketApiTotal > MAX_TICKETS ? ` of ${ticketApiTotal.toLocaleString()} total.` : "."}
            </p>
          ) : null}
        </div>
        <div
          className="flex flex-wrap items-center gap-1.5 self-start rounded-xl border border-slate-200/80 bg-slate-50/80 p-1.5 lg:shrink-0"
          role="toolbar"
          aria-label={`Date range · ${formatRangeSubtitle(period, bounds)}`}
        >
          {PERIOD_OPTIONS.map((opt) => (
            <Button
              key={opt.id}
              type="button"
              variant={period === opt.id ? "primary" : "ghost"}
              className="!rounded-lg !px-3 !py-2 !text-xs font-medium"
              onClick={() => setPeriod(opt.id)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatSparkCard
          title="Total tickets"
          value={ticketApiTotal.toLocaleString()}
          delta={{ text: "Workspace total", up: null }}
          deltaVsPrior={false}
          spark={ticketSpark}
          stroke="#ef4444"
        />
        <StatSparkCard
          title="Completed"
          value={String(kpi.completed)}
          delta={period === "all" ? { text: "—", up: null } : d2}
          spark={completedSpark}
          stroke="#22c55e"
        />
        <StatSparkCard
          title="Items opened"
          value={String(kpi.opened)}
          delta={period === "all" ? { text: "—", up: null } : d3}
          spark={ticketSpark}
          stroke="#6366f1"
        />
        <Card className="min-h-0 overflow-hidden border-0 bg-gradient-to-br from-primary-600 to-indigo-700 text-white shadow-lg">
          <CardBody className="p-5">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-100">Top closer</p>
                {spotlightCloser.name ? (
                  <p className="mt-2 truncate text-lg font-semibold leading-tight sm:text-xl">
                    {spotlightCloser.name}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-indigo-200/90">No assignee data</p>
                )}
              </div>
              <div className="shrink-0 border-t border-white/20 pt-4 text-left sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0 sm:text-right">
                <p className="text-3xl font-bold tabular-nums leading-none sm:text-4xl">
                  {spotlightCloser.tickets}
                </p>
                <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-indigo-100">
                  Items closed
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-5 lg:items-stretch">
        <Card className="flex flex-col lg:col-span-3">
          <CardHeader title="Active queue" description="Open work — latest activity first" />
          <CardBody className="flex min-h-0 flex-1 flex-col p-0">
            {activeQueue.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-slate-500">No active items.</p>
            ) : (
              <div className="max-h-[19.5rem] divide-y divide-slate-100 overflow-y-auto overscroll-contain">
              {activeQueue.map((t) => {
                const initials = assigneeInitials(t.assignedToName);
                return (
                <div
                  key={t.id}
                  className="flex gap-4 px-6 py-4 transition hover:bg-slate-50/80"
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                      initials
                        ? "bg-primary-100 text-[11px] font-semibold tracking-tight text-primary-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                    aria-hidden
                  >
                    {initials ? (
                      <span>{initials}</span>
                    ) : (
                      <UserRound className="h-5 w-5" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                        <span className="font-medium text-slate-900">
                          {t.assignedToName?.trim() || "Unassigned"}
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-500">{t.locationName ?? "—"}</span>
                      </div>
                      <div className="flex max-w-[58%] shrink-0 flex-nowrap items-center justify-end gap-1.5 overflow-x-auto">
                        <span className="whitespace-nowrap rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          {t.category}
                        </span>
                        <PriorityBadge priority={t.priority} />
                        <StatusBadge status={t.status} />
                        {t.isNew ? <NewBadge /> : null}
                        <ProgressCircle value={t.progress} disabled size={32} />
                        <Link
                          href={`/dashboard/tickets/view?id=${encodeURIComponent(t.id)}`}
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-primary-600"
                          aria-label="View ticket"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-slate-600">{t.title}</p>
                    <div className="mt-1 flex justify-end">
                      <time
                        className="text-xs text-slate-500"
                        dateTime={new Date(t.updatedAt).toISOString()}
                        title={new Date(t.updatedAt).toLocaleString()}
                      >
                        {formatRelativeTime(new Date(t.updatedAt))}
                      </time>
                    </div>
                  </div>
                </div>
                );
              })}
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="flex flex-col lg:col-span-2">
          <CardHeader
            title="Ticket status"
            description="Items in the selected range"
          />
          <CardBody className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center">
            <ul className="shrink-0 space-y-2.5 text-sm">
              {statusDonut.map((s) => (
                <li key={s.key} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.fill }} />
                  <span className="font-medium text-slate-700">{s.label}</span>
                  <span className="text-slate-400">—</span>
                  <span className="tabular-nums text-slate-500">{s.pct}%</span>
                </li>
              ))}
            </ul>
            <div className="h-56 min-h-[14rem] flex-1">
              {pieData.length === 0 ? (
                <p className="flex h-full items-center justify-center text-sm text-slate-500">No data.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={2}
                    >
                      {pieData.map((e) => (
                        <Cell key={e.name} fill={e.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-5 lg:items-stretch">
        <Card className="flex flex-col lg:col-span-3">
          <CardHeader title="Recent tickets" description="Newest in your selected range" />
          <CardBody className="flex min-h-0 flex-1 flex-col p-0">
            {recentActivity.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-slate-500">Nothing in this range.</p>
            ) : (
              <div className="h-80 divide-y divide-slate-100 overflow-y-auto overscroll-contain">
              {recentActivity.map((t) => (
                <div key={t.id} className="flex gap-4 px-6 py-4 hover:bg-slate-50/80">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-100 to-indigo-100 text-xs font-bold text-primary-700">
                    {t.ticketCode?.slice(0, 3) ?? "—"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 line-clamp-1">{t.title}</p>
                    <p className="text-xs text-slate-500">{t.locationName ?? "—"}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">{t.description}</p>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
                      <span className="font-medium text-slate-700">{t.category}</span>
                      <span>{t.priority}</span>
                      <span>
                        {new Date(t.createdAt).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/tickets/view?id=${encodeURIComponent(t.id)}`}
                    className="shrink-0 self-center text-xs font-semibold text-primary-600 hover:underline"
                  >
                    View
                  </Link>
                </div>
              ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="flex flex-col lg:col-span-2">
          <CardHeader
            title="Tickets by location"
            description="Ticket volume in the selected range"
          />
          <CardBody className="flex min-h-0 flex-1 flex-col pt-2">
            {siteWorkload.length === 0 ? (
              <p className="flex h-80 items-center justify-center text-sm text-slate-500">No tickets.</p>
            ) : (
              <div className="h-80 w-full shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={siteWorkload}
                    layout="vertical"
                    margin={{ left: 4, right: 12, top: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={108}
                      tick={{ fontSize: 11 }}
                      stroke="#64748b"
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} fill={SITE_BAR} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
