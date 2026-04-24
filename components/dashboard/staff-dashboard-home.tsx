"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardBody } from "@/components/ui/Card";
import { ChartCard } from "@/components/ui/chart-card";
import { StatusBadge, NewBadge } from "@/components/ui/badge";
import type { SerializedTicket } from "@/lib/serialize-ticket";
import type { UserRole } from "@/models/User";
import { apiFetch } from "@/lib/auth-fetch";

type Analytics = {
  totals: {
    total: number;
    inProgress: number;
    completed: number;
    newTickets: number;
  };
  ticketsPerDay: { date: string; count: number }[];
  byStatus: { status: string; count: number }[];
  recentTickets: SerializedTicket[];
};

const PIE_COLORS: Record<string, string> = {
  in_queue: "#94a3b8",
  in_progress: "#f59e0b",
  completed: "#10b981",
  cancelled: "#ef4444",
};

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardBody className="p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
        {hint ? <p className="mt-2 text-xs text-slate-400">{hint}</p> : null}
      </CardBody>
    </Card>
  );
}

const heroCopy: Record<
  "admin" | "support",
  { title: string; subtitle: string; recentTitle: string; recentHint: string }
> = {
  admin: {
    title: "Overview",
    subtitle: "Live ticket health across every location.",
    recentTitle: "Recent tickets",
    recentHint: "Latest updates across the workspace",
  },
  support: {
    title: "Support queue",
    subtitle: "Metrics and tickets assigned to you.",
    recentTitle: "Recent assignments",
    recentHint: "Latest updates on tickets you own",
  },
};

export function StaffDashboardHome({ role }: { role: "admin" | "support" }) {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/analytics/dashboard");
      const json: unknown = await res.json();
      if (!res.ok) {
        const err = json as { error?: string; message?: string };
        throw new Error(
          err.error ?? err.message ?? `Failed to load (${res.status})`
        );
      }
      setData(json as Analytics);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-slate-500">Loading dashboard…</p>;
  }

  if (error || !data) {
    return <p className="text-sm text-red-600">{error ?? "No data"}</p>;
  }

  const pieData = data.byStatus.map((b) => ({
    name: b.status.replace("_", " "),
    value: b.count,
    key: b.status,
  }));

  const hero = heroCopy[role];
  const totalLabel = role === "support" ? "Assigned to you" : "Total tickets";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{hero.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{hero.subtitle}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={totalLabel} value={data.totals.total} />
        <StatCard label="In progress" value={data.totals.inProgress} />
        <StatCard label="Completed" value={data.totals.completed} />
        <StatCard
          label="New (24h)"
          value={data.totals.newTickets}
          hint={
            role === "support"
              ? "New assignments in the last 24 hours"
              : "Created in the last 24 hours"
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <ChartCard
          title="Tickets per day"
          description={
            role === "support"
              ? "Created tickets assigned to you — last 14 days"
              : "Created tickets — last 14 days"
          }
          className="lg:col-span-3"
        >
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.ticketsPerDay} margin={{ left: 0, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" width={32} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  fill="url(#fill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="By status"
          description="Current distribution"
          className="lg:col-span-2"
        >
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={56}
                  outerRadius={88}
                  paddingAngle={2}
                >
                  {pieData.map((entry) => (
                    <Cell
                      key={entry.key}
                      fill={PIE_COLORS[entry.key] ?? "#94a3b8"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <Card>
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">{hero.recentTitle}</h2>
          <p className="mt-1 text-sm text-slate-500">{hero.recentHint}</p>
        </div>
        <CardBody className="p-0">
          {data.recentTickets.length === 0 ? (
            <p className="px-6 py-10 text-sm text-slate-500">No tickets yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-6 py-3">ID</th>
                    <th className="px-6 py-3">Title</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recentTickets.map((t) => (
                    <tr key={t.id} className="text-slate-700">
                      <td className="px-6 py-4 font-mono text-xs text-slate-600">
                        {t.ticketCode ?? "—"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/dashboard/tickets/view?id=${encodeURIComponent(t.id)}`}
                            className="font-medium text-slate-900 hover:text-primary-600 hover:underline"
                          >
                            {t.title}
                          </Link>
                          {t.isNew ? <NewBadge /> : null}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/dashboard/tickets/view?id=${encodeURIComponent(t.id)}`}
                          className="text-xs font-medium text-primary-600 hover:underline"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
