"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import type { UserRole } from "@/lib/user-roles";
import { apiFetch } from "@/lib/auth-fetch";
import { AdminDashboardInsights } from "@/components/dashboard/admin-dashboard-insights";

type Analytics = {
  totals: {
    total: number;
    inProgress: number;
    completed: number;
    newTickets: number;
  };
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
  "support",
  { title: string; subtitle: string }
> = {
  support: {
    title: "Support queue",
    subtitle: "Metrics for tickets assigned to you.",
  },
};

export function StaffDashboardHome({ role }: { role: UserRole }) {
  if (role === "admin") {
    return <AdminDashboardInsights />;
  }
  if (role !== "support") {
    return null;
  }

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
      const full = json as Analytics & {
        ticketsPerDay?: unknown;
        byStatus?: unknown;
        recentTickets?: unknown;
      };
      setData({
        totals: full.totals,
      });
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

  const hero = heroCopy.support;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{hero.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{hero.subtitle}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Assigned to you" value={data.totals.total} />
        <StatCard label="In progress" value={data.totals.inProgress} />
        <StatCard label="Completed" value={data.totals.completed} />
        <StatCard
          label="New (24h)"
          value={data.totals.newTickets}
          hint="New assignments in the last 24 hours"
        />
      </div>
    </div>
  );
}
