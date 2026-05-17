"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { DashboardInsightsSkeleton } from "@/components/ui/skeleton";
import type { SerializedTicket } from "@/lib/serialize-ticket";
import { supportDashboardQueryOptions } from "@/lib/queries/dashboard";

type TicketListRes = {
  tickets: SerializedTicket[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const STATUS_CHART: { key: string; label: string; fill: string }[] = [
  { key: "in_queue",    label: "New",       fill: "#22c55e" },
  { key: "in_progress", label: "Open",      fill: "#eab308" },
  { key: "completed",   label: "Completed", fill: "#38bdf8" },
  { key: "cancelled",   label: "Closed",    fill: "#1d4ed8" },
];

const SITE_BAR = "#2563eb";

type PeriodPreset = "today" | "this_week" | "previous_week" | "last_month" | "previous_month" | "all";

const PERIOD_OPTIONS: { id: PeriodPreset; label: string }[] = [
  { id: "today",          label: "Today" },
  { id: "this_week",      label: "This week" },
  { id: "previous_week",  label: "Previous week" },
  { id: "last_month",     label: "Last 30 days" },
  { id: "previous_month", label: "Previous month" },
  { id: "all",            label: "All" },
];

function startOfDay(d: Date): Date { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date): Date   { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
function addDays(d: Date, n: number): Date { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function startOfWeekMonday(from: Date): Date {
  const d = startOfDay(from);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
}
function startOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0); }
function endOfMonth(d: Date): Date   { return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999); }

function getPeriodBounds(preset: PeriodPreset, anchor = new Date()): { start: Date; end: Date } | null {
  switch (preset) {
    case "today":          return { start: startOfDay(anchor), end: endOfDay(anchor) };
    case "this_week":      return { start: startOfWeekMonday(anchor), end: endOfDay(anchor) };
    case "previous_week": { const m = startOfWeekMonday(anchor); const p = addDays(m, -7); return { start: p, end: endOfDay(addDays(p, 6)) }; }
    case "last_month":     return { start: addDays(startOfDay(anchor), -29), end: endOfDay(anchor) };
    case "previous_month": { const f = startOfMonth(anchor); const e = addDays(f, -1); return { start: startOfMonth(e), end: endOfDay(e) }; }
    case "all":            return null;
    default:               return null;
  }
}

function getComparisonBounds(preset: PeriodPreset, anchor = new Date()): { start: Date; end: Date } | null {
  switch (preset) {
    case "today":          { const y = addDays(startOfDay(anchor), -1); return { start: y, end: endOfDay(y) }; }
    case "this_week":      return getPeriodBounds("previous_week", anchor);
    case "previous_week":  { const pw = getPeriodBounds("previous_week", anchor)!; const e = addDays(pw.start, -1); return { start: addDays(e, -6), end: endOfDay(e) }; }
    case "last_month":     { const cur = getPeriodBounds("last_month", anchor)!; const e = addDays(cur.start, -1); return { start: addDays(cur.start, -30), end: endOfDay(e) }; }
    case "previous_month": { const pm = getPeriodBounds("previous_month", anchor)!; const e = addDays(pm.start, -1); return { start: startOfMonth(e), end: endOfDay(e) }; }
    default:               return null;
  }
}

function formatRangeSubtitle(preset: PeriodPreset, bounds: { start: Date; end: Date } | null): string {
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  if (preset === "all" || !bounds) return "Full history";
  return `${fmt(bounds.start)} → ${fmt(bounds.end)}`;
}

function inRange(d: Date | null, start: Date, end: Date): boolean {
  if (!d || Number.isNaN(d.getTime())) return false;
  return d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
}

function ticketCreatedAt(t: SerializedTicket): Date {
  return typeof t.createdAt === "string" ? new Date(t.createdAt) : t.createdAt;
}

function lastSevenSpark(dates: (Date | null)[]): { i: number; v: number }[] {
  const valid = dates.filter((d): d is Date => d != null && !Number.isNaN(d.getTime()));
  return Array.from({ length: 7 }, (_, k) => {
    const day = addDays(startOfDay(new Date()), -(6 - k));
    const t0 = day.getTime();
    const t1 = endOfDay(day).getTime();
    return { i: k, v: valid.filter((d) => d.getTime() >= t0 && d.getTime() <= t1).length };
  });
}

function deltaLabel(cur: number, prev: number | null): { text: string; up: boolean | null } {
  if (prev === null) return { text: "—", up: null };
  if (prev === 0 && cur === 0) return { text: "0%", up: null };
  if (prev === 0) return { text: "+100%", up: true };
  const pct = Math.round(((cur - prev) / prev) * 100);
  return { text: `${pct >= 0 ? "+" : ""}${pct}%`, up: pct >= 0 };
}

function formatRelativeTime(d: Date): string {
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 45) return "Just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 172800) return "Yesterday";
  return `${Math.floor(sec / 86400)}d ago`;
}

function assigneeInitials(name: string | null | undefined): string | null {
  const t = name?.trim();
  if (!t) return null;
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
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

export function SupportDashboardInsights() {
  const [period, setPeriod] = useState<PeriodPreset>("all");
  const dashboardQuery = useQuery(supportDashboardQueryOptions);

  const loading = dashboardQuery.isPending && !dashboardQuery.data;
  const loadError = dashboardQuery.error
    ? dashboardQuery.error instanceof Error
      ? dashboardQuery.error.message
      : "Failed to load"
    : null;
  const tickets = dashboardQuery.data?.tickets ?? [];
  const ticketTotal = dashboardQuery.data?.total ?? 0;

  const bounds        = useMemo(() => getPeriodBounds(period), [period]);
  const compareBounds = useMemo(() => getComparisonBounds(period), [period]);

  const filtered = useMemo(() => {
    if (!bounds) return tickets;
    const { start, end } = bounds;
    return tickets.filter((t) => inRange(ticketCreatedAt(t), start, end));
  }, [tickets, bounds]);

  const prevFiltered = useMemo(() => {
    if (!compareBounds) return null;
    const { start, end } = compareBounds;
    return tickets.filter((t) => inRange(ticketCreatedAt(t), start, end));
  }, [tickets, compareBounds]);

  const kpi = useMemo(() => ({
    total:      filtered.length,
    inProgress: filtered.filter((t) => t.status === "in_progress").length,
    completed:  filtered.filter((t) => t.status === "completed").length,
    overdue:    filtered.filter((t) => t.isOverdue).length,
  }), [filtered]);

  const prevKpi = useMemo(() => {
    if (!prevFiltered) return null;
    return {
      total:     prevFiltered.length,
      completed: prevFiltered.filter((t) => t.status === "completed").length,
    };
  }, [prevFiltered]);

  const ticketSpark    = useMemo(() => lastSevenSpark(tickets.map(ticketCreatedAt)), [tickets]);
  const completedSpark = useMemo(() =>
    lastSevenSpark(tickets.filter((t) => t.status === "completed").map((t) =>
      typeof t.updatedAt === "string" ? new Date(t.updatedAt) : t.updatedAt
    )),
    [tickets]
  );
  const inProgressSpark = useMemo(() =>
    lastSevenSpark(tickets.filter((t) => t.status === "in_progress").map(ticketCreatedAt)),
    [tickets]
  );

  const statusDonut = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of STATUS_CHART) map[s.key] = 0;
    for (const t of filtered) if (map[t.status] !== undefined) map[t.status] += 1;
    const total = filtered.length || 1;
    return STATUS_CHART.map((s) => ({
      ...s,
      value: map[s.key] ?? 0,
      pct: Math.round(((map[s.key] ?? 0) / total) * 100),
    }));
  }, [filtered]);

  const pieData = useMemo(
    () => statusDonut.filter((d) => d.value > 0).map((d) => ({ name: d.label, value: d.value, fill: d.fill })),
    [statusDonut]
  );

  const activeQueue = useMemo(() =>
    filtered
      .filter((t) => t.status === "in_queue" || t.status === "in_progress")
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 40),
    [filtered]
  );

  const recentActivity = useMemo(() =>
    [...filtered]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6),
    [filtered]
  );

  const locationBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of filtered) {
      const name = t.locationName?.trim() || "Other";
      map.set(name, (map.get(name) ?? 0) + 1);
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({
        label: name.length > 26 ? `${name.slice(0, 26)}…` : name,
        count,
      }));
  }, [filtered]);

  const tooltipStyle = {
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
  };

  if (loading) {
    return (
      <DashboardInsightsSkeleton title="My queue" subtitle="Loading your queue…" />
    );
  }
  if (loadError) return <p className="text-sm text-red-600">{loadError}</p>;

  const dTotal     = deltaLabel(kpi.total, prevKpi?.total ?? null);
  const dCompleted = deltaLabel(kpi.completed, prevKpi?.completed ?? null);

  return (
    <div className="space-y-6">
      {/* Header + period filter */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">My queue</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Tickets assigned to you · {formatRangeSubtitle(period, bounds)}
          </p>
        </div>
        <div
          className="flex flex-wrap items-center gap-1.5 self-start rounded-xl border border-slate-200/80 bg-slate-50/80 p-1.5 lg:shrink-0"
          role="toolbar"
        >
          {PERIOD_OPTIONS.map((opt) => (
            <Button
              key={opt.id}
              type="button"
              variant={period === opt.id ? "primary" : "ghost"}
              size="sm"
              onClick={() => setPeriod(opt.id)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* KPI stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatSparkCard
          title="Assigned to you"
          value={ticketTotal.toLocaleString()}
          delta={{ text: "All time total", up: null }}
          deltaVsPrior={false}
          spark={ticketSpark}
          stroke="#ef4444"
        />
        <StatSparkCard
          title="Completed"
          value={String(kpi.completed)}
          delta={period === "all" ? { text: "—", up: null } : dCompleted}
          spark={completedSpark}
          stroke="#22c55e"
        />
        <StatSparkCard
          title="In progress"
          value={String(kpi.inProgress)}
          delta={period === "all" ? { text: "—", up: null } : dTotal}
          spark={inProgressSpark}
          stroke="#6366f1"
        />
        <Card className="min-h-0 overflow-hidden border-0 bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg">
          <CardBody className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-100">Overdue</p>
            <p className="mt-3 text-4xl font-bold tabular-nums leading-none">
              {kpi.overdue}
            </p>
            <p className="mt-2 text-sm text-primary-200/90">
              {kpi.overdue === 0 ? "All caught up" : "Tickets past deadline"}
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Active queue + status donut */}
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
                    <div key={t.id} className="flex gap-4 px-6 py-4 transition hover:bg-slate-50/80">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                          initials
                            ? "bg-primary-100 text-[11px] font-semibold tracking-tight text-primary-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                        aria-hidden
                      >
                        {initials ? <span>{initials}</span> : <UserRound className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                            <span className="font-medium text-slate-900">
                              {t.assignedToName?.trim() || "Unassigned"}
                            </span>
                            <span className="text-xs text-slate-400">·</span>
                            <span className="text-xs text-slate-500">{t.locationName ?? "—"}</span>
                          </div>
                          <Link
                            href={`/dashboard/tickets/view?id=${encodeURIComponent(t.id)}`}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-primary-600"
                            aria-label="View ticket"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-slate-600">{t.title}</p>
                        <div className="mt-1 flex flex-wrap items-center justify-end gap-1.5">
                          <span className="whitespace-nowrap rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            {t.category}
                          </span>
                          <PriorityBadge priority={t.priority} />
                          <StatusBadge status={t.status} />
                          {t.isNew ? <NewBadge /> : null}
                          <ProgressCircle value={t.progress} disabled size={40} />
                          <time className="text-xs text-slate-500" dateTime={new Date(t.updatedAt).toISOString()}>
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
          <CardHeader title="Ticket status" description="Items in the selected range" />
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
                      {pieData.map((e) => <Cell key={e.name} fill={e.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Recent tickets + priority breakdown */}
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
                      <p className="line-clamp-1 font-medium text-slate-900">{t.title}</p>
                      <p className="text-xs text-slate-500">{t.locationName ?? "—"}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">{t.description}</p>
                      <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
                        <span className="font-medium text-slate-700">{t.category}</span>
                        <span>{t.priority?.toUpperCase()}</span>
                        <span>
                          {new Date(t.createdAt).toLocaleDateString(undefined, {
                            day: "numeric", month: "short", year: "numeric",
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
          <CardHeader title="Tickets by location" description="Ticket volume in the selected range" />
          <CardBody className="flex min-h-0 flex-1 flex-col pt-2">
            {locationBreakdown.length === 0 ? (
              <p className="flex h-80 items-center justify-center text-sm text-slate-500">No tickets.</p>
            ) : (
              <div className="h-80 w-full shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={locationBreakdown}
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
