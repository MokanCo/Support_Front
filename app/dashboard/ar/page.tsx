"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { fetchArDashboard, moneyFmt } from "@/lib/queries/ar";

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function BarList({
  items,
}: {
  items: { label: string; total: number }[];
}) {
  const max = Math.max(1, ...items.map((i) => i.total));
  return (
    <div className="space-y-2">
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No data yet</p>
      ) : (
        items.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex justify-between text-xs text-slate-600">
              <span>{item.label}</span>
              <span>{moneyFmt(item.total)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-primary-500"
                style={{ width: `${(item.total / max) * 100}%` }}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default function ArDashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["ar", "dashboard"],
    queryFn: () => fetchArDashboard(),
  });

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading AR dashboard…</p>;
  }
  if (error || !data) {
    return (
      <p className="text-sm text-red-600">
        {(error as Error)?.message || "Failed to load dashboard"}
      </p>
    );
  }

  const { kpis, charts } = data;
  const monthLabel = (r: { year?: number; month?: number; total: number }) => ({
    label: r.year && r.month ? `${r.year}-${String(r.month).padStart(2, "0")}` : "—",
    total: r.total,
  });

  const agingRaw = charts.aging as unknown;
  const agingItems = Array.isArray(agingRaw)
    ? (agingRaw as { bucket: string; total: number }[]).map((a) => ({
        label: a.bucket,
        total: Number(a.total) || 0,
      }))
    : agingRaw && typeof agingRaw === "object"
      ? Object.entries(agingRaw as Record<string, number>).map(([bucket, total]) => ({
          label: bucket,
          total: Number(total) || 0,
        }))
      : [];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="Outstanding" value={moneyFmt(kpis.outstandingBalance)} />
        <Kpi label="Current" value={moneyFmt(kpis.currentBalance)} />
        <Kpi label="Overdue" value={moneyFmt(kpis.overdueBalance)} />
        <Kpi label="Collected (Month)" value={moneyFmt(kpis.collectedThisMonth)} />
        <Kpi label="Collected (Year)" value={moneyFmt(kpis.collectedThisYear)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="Total Invoices" value={kpis.totalInvoices} />
        <Kpi label="Paid" value={kpis.paidInvoices} />
        <Kpi label="Partially Paid" value={kpis.partiallyPaid} />
        <Kpi label="Overdue Invoices" value={kpis.overdueInvoices} />
        <Kpi label="Draft" value={kpis.draftInvoices} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Monthly Revenue" />
          <CardBody>
            <BarList
              items={(charts.monthlyRevenue || []).map((r) =>
                monthLabel(r as { year?: number; month?: number; total: number }),
              )}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Monthly Collections" />
          <CardBody>
            <BarList
              items={(charts.monthlyCollections || []).map((r) =>
                monthLabel(r as { year?: number; month?: number; total: number }),
              )}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Invoice Status" />
          <CardBody>
            <div className="space-y-2">
              {(charts.statusDistribution || []).map((s) => (
                <div
                  key={s.status}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="capitalize text-slate-700">
                    {String(s.status).replace(/_/g, " ")}
                  </span>
                  <span className="font-medium text-slate-900">{s.count}</span>
                </div>
              ))}
              {!charts.statusDistribution?.length ? (
                <p className="text-sm text-slate-500">No invoices yet</p>
              ) : null}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Aging (30 / 60 / 90)" />
          <CardBody>
            <BarList items={agingItems} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
