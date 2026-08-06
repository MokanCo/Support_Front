"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  Hourglass,
  Percent,
  Send,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  AreaTrendChart,
  BarTrendChart,
  CollectionsHeatmap,
  DonutChart,
  HorizontalBarChart,
  RadialProgressChart,
  RevenueTreemap,
} from "@/components/ar/ui/charts";
import { ArFilterBar } from "@/components/ar/ui/filter-bar";
import { KpiCard, KpiCardSkeleton } from "@/components/ar/ui/kpi-card";
import { Panel, PanelBody, PanelHeader } from "@/components/ar/ui/panel";
import {
  Amount,
  ErrorState,
  SkeletonChart,
} from "@/components/ar/ui/primitives";
import {
  agingSummary,
  collectionsHeatmap,
  computeMetrics,
  computePreviousMetrics,
  filterCredits,
  filterInvoices,
  filterPayments,
  monthlySeries,
  outstandingByCustomer,
  revenueByCustomer,
  statusDistribution,
  useArDataset,
} from "@/lib/ar/dataset";
import { describeRange, useArFilters } from "@/lib/ar/filters";
import { count, money, percentChange, ratio } from "@/lib/ar/format";
import { ACCENTS, invoiceStatus } from "@/lib/ar/theme";

const HEATMAP_WEEKS = 14;

export default function AccountsInsightsPage() {
  const { filters } = useArFilters();
  const { data, isLoading, error, refetch } = useArDataset();

  const view = useMemo(() => {
    const now = new Date();
    const invoices = filterInvoices(data.invoices, filters, now);
    const payments = filterPayments(data.payments, filters, data.invoices, now);
    const credits = filterCredits(data.credits, filters);
    const metrics = computeMetrics(invoices, payments, credits, now, data.invoices);
    const previous = computePreviousMetrics(data, filters, now);

    return {
      invoices,
      payments,
      metrics,
      previous,
      months: monthlySeries(invoices, payments, 12, now),
      aging: agingSummary(invoices, now),
      byCustomer: revenueByCustomer(invoices),
      outstandingBy: outstandingByCustomer(invoices),
      statuses: statusDistribution(invoices),
      heatmap: collectionsHeatmap(payments, HEATMAP_WEEKS, now),
    };
  }, [data, filters]);

  const { metrics, previous } = view;
  const comparison = previous ? "vs previous period" : describeRange(filters);
  const change = (current: number, key: keyof typeof metrics) =>
    previous ? percentChange(current, Number(previous[key]) || 0) : null;

  const cashFlow = view.months.map((m) => ({
    ...m,
    net: m.collected - m.revenue,
  }));

  if (error) {
    return (
      <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
    );
  }

  return (
    <div className="space-y-5">
      {/* filters */}
      <Panel className="sticky top-0 z-30" padded={false}>
        <div className="px-4 py-3 sm:px-5">
          <ArFilterBar />
        </div>
      </Panel>

      {/* KPI cards */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <KpiCard
            label="Total revenue"
            value={money(metrics.totalRevenue)}
            icon={TrendingUp}
            accent="blue"
            changePct={change(metrics.totalRevenue, "totalRevenue")}
            comparison={comparison}
          />
          <KpiCard
            label="Outstanding receivables"
            value={money(metrics.outstanding)}
            icon={Wallet}
            accent="purple"
            changePct={change(metrics.outstanding, "outstanding")}
            upIsGood={false}
            comparison={comparison}
          />
          <KpiCard
            label="Overdue amount"
            value={money(metrics.overdue)}
            icon={AlertTriangle}
            accent="red"
            changePct={change(metrics.overdue, "overdue")}
            upIsGood={false}
            comparison={comparison}
          />
          <KpiCard
            label="Collected"
            value={money(metrics.collected)}
            icon={CircleDollarSign}
            accent="green"
            changePct={change(metrics.collected, "collected")}
            comparison={comparison}
          />
          <KpiCard
            label="Monthly cash flow"
            value={money(
              cashFlow.length ? cashFlow[cashFlow.length - 1].collected : 0,
            )}
            icon={Banknote}
            accent="teal"
            changePct={
              cashFlow.length > 1
                ? percentChange(
                    cashFlow[cashFlow.length - 1].collected,
                    cashFlow[cashFlow.length - 2].collected,
                  )
                : null
            }
            comparison="vs previous month"
          />
          <KpiCard
            label="Invoices sent"
            value={count(metrics.invoicesSent)}
            icon={Send}
            accent="indigo"
            changePct={change(metrics.invoicesSent, "invoicesSent")}
            comparison={comparison}
          />
          <KpiCard
            label="Invoices paid"
            value={count(metrics.invoicesPaid)}
            icon={FileCheck2}
            accent="green"
            changePct={change(metrics.invoicesPaid, "invoicesPaid")}
            comparison={comparison}
          />
          <KpiCard
            label="Pending payments"
            value={count(metrics.pendingPayments)}
            icon={Hourglass}
            accent="orange"
            changePct={change(metrics.pendingPayments, "pendingPayments")}
            upIsGood={false}
            comparison={comparison}
          />
          <KpiCard
            label="Average payment time"
            value={
              metrics.avgPaymentDays == null
                ? "—"
                : `${metrics.avgPaymentDays.toFixed(1)} days`
            }
            icon={Clock3}
            accent="slate"
            changePct={
              previous && metrics.avgPaymentDays != null && previous.avgPaymentDays
                ? percentChange(metrics.avgPaymentDays, previous.avgPaymentDays)
                : null
            }
            upIsGood={false}
            comparison={comparison}
          />
          <KpiCard
            label="Late fees collected"
            value={money(metrics.lateFees)}
            icon={Percent}
            accent="orange"
            changePct={change(metrics.lateFees, "lateFees")}
            comparison={comparison}
          />
        </div>
      )}

      {/* revenue + collections */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2" padded={false}>
          <PanelHeader
            title="Monthly revenue & collections"
            description="Invoiced value against cash actually received"
          />
          <PanelBody className="pt-2">
            {isLoading ? (
              <SkeletonChart />
            ) : (
              <AreaTrendChart
                data={view.months}
                xKey="label"
                stacked={false}
                series={[
                  { key: "revenue", label: "Invoiced", color: ACCENTS.blue.hex },
                  { key: "collected", label: "Collected", color: ACCENTS.green.hex },
                ]}
              />
            )}
          </PanelBody>
        </Panel>

        <Panel padded={false}>
          <PanelHeader
            title="Collection progress"
            description="Share of invoiced value received"
          />
          <PanelBody>
            {isLoading ? (
              <SkeletonChart height={220} />
            ) : (
              <>
                <RadialProgressChart
                  value={metrics.collectionRate ?? 0}
                  label="Collected"
                  color={ACCENTS.green.hex}
                />
                <dl className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Invoiced</dt>
                    <dd>
                      <Amount value={metrics.totalRevenue} />
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Collected</dt>
                    <dd className="tabular-nums font-medium text-emerald-600">
                      {money(metrics.collected)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Still outstanding</dt>
                    <dd className="tabular-nums font-medium text-amber-600">
                      {money(metrics.outstanding)}
                    </dd>
                  </div>
                </dl>
              </>
            )}
          </PanelBody>
        </Panel>
      </div>

      {/* status + aging */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel padded={false}>
          <PanelHeader
            title="Invoice status"
            description="Distribution across the lifecycle"
          />
          <PanelBody>
            {isLoading ? (
              <SkeletonChart height={240} />
            ) : (
              <DonutChart
                data={view.statuses.map((s) => ({
                  name: invoiceStatus(s.name).label,
                  value: s.count,
                  color: invoiceStatus(s.name).hex,
                }))}
                centerValue={count(view.invoices.length)}
                centerLabel="Invoices"
                valueFormatter={(n) => `${count(n)} invoices`}
              />
            )}
          </PanelBody>
        </Panel>

        <Panel className="xl:col-span-2" padded={false}>
          <PanelHeader
            title="Outstanding aging"
            description="Balance still due by how far past the due date it sits"
          />
          <PanelBody className="pt-2">
            {isLoading ? (
              <SkeletonChart height={240} />
            ) : (
              <>
                <BarTrendChart
                  data={view.aging}
                  xKey="label"
                  height={220}
                  series={[
                    { key: "total", label: "Balance due", color: ACCENTS.orange.hex },
                  ]}
                  emptyMessage="Nothing is outstanding in this range."
                />
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 sm:grid-cols-5">
                  {view.aging.map((bucket) => (
                    <div key={bucket.bucket} className="rounded-xl bg-slate-50 p-2.5">
                      <p className="truncate text-[11px] font-medium text-slate-500">
                        {bucket.label}
                      </p>
                      <p className="mt-0.5 truncate text-sm font-semibold tabular-nums text-slate-900">
                        {money(bucket.total)}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {count(bucket.count)} invoice
                        {bucket.count === 1 ? "" : "s"}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </PanelBody>
        </Panel>
      </div>

      {/* cash flow + top customers */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel padded={false}>
          <PanelHeader
            title="Cash flow"
            description="Invoiced versus collected, month by month"
          />
          <PanelBody className="pt-2">
            {isLoading ? (
              <SkeletonChart />
            ) : (
              <BarTrendChart
                data={cashFlow}
                xKey="label"
                series={[
                  { key: "revenue", label: "Invoiced", color: ACCENTS.indigo.hex },
                  { key: "collected", label: "Collected", color: ACCENTS.teal.hex },
                ]}
              />
            )}
          </PanelBody>
        </Panel>

        <Panel padded={false}>
          <PanelHeader
            title="Top customers by revenue"
            description="Highest invoiced accounts in this range"
          />
          <PanelBody className="pt-2">
            {isLoading ? (
              <SkeletonChart />
            ) : (
              <HorizontalBarChart
                data={view.byCustomer.map((c) => ({ name: c.name, value: c.value }))}
              />
            )}
          </PanelBody>
        </Panel>
      </div>

      {/* treemap + outstanding by customer */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel padded={false}>
          <PanelHeader
            title="Revenue by partner"
            description="Relative contribution of each partner location"
          />
          <PanelBody className="pt-2">
            {isLoading ? (
              <SkeletonChart />
            ) : (
              <RevenueTreemap
                data={view.byCustomer.map((c) => ({ name: c.name, value: c.value }))}
              />
            )}
          </PanelBody>
        </Panel>

        <Panel padded={false}>
          <PanelHeader
            title="Who owes the most"
            description="Open balance ranked by customer"
          />
          <PanelBody className="pt-2">
            {isLoading ? (
              <SkeletonChart />
            ) : (
              <HorizontalBarChart
                data={view.outstandingBy.map((c) => ({
                  name: c.name,
                  value: c.value,
                }))}
                color={ACCENTS.red.hex}
                emptyMessage="Every account is settled in this range."
              />
            )}
          </PanelBody>
        </Panel>
      </div>

      {/* collections heatmap */}
      <Panel padded={false}>
        <PanelHeader
          title="Collection activity"
          description={`Payments received over the last ${HEATMAP_WEEKS} weeks`}
          action={
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              <CalendarClock className="h-3.5 w-3.5" />
              {ratio(metrics.collectionRate, 0)} collected
            </span>
          }
        />
        <PanelBody>
          {isLoading ? (
            <SkeletonChart height={160} />
          ) : (
            <CollectionsHeatmap cells={view.heatmap} weeks={HEATMAP_WEEKS} />
          )}
        </PanelBody>
      </Panel>

      {data.truncated ? (
        <p className="text-center text-xs text-slate-400">
          Showing the most recent 2,000 records. Narrow the date range for an exact
          view of older periods.
        </p>
      ) : null}
    </div>
  );
}
