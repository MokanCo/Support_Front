"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  AlarmClock,
  ArrowUpRight,
  CalendarClock,
  CircleDollarSign,
  Clock3,
  HandCoins,
  Layers,
  TrendingDown,
} from "lucide-react";
import { ArFilterBar } from "@/components/ar/ui/filter-bar";
import { HorizontalBarChart, RadialProgressChart } from "@/components/ar/ui/charts";
import { DataTable, type Column } from "@/components/ar/ui/data-table";
import { KpiCard, KpiCardSkeleton } from "@/components/ar/ui/kpi-card";
import { Panel, PanelBody, PanelHeader } from "@/components/ar/ui/panel";
import {
  Amount,
  Chip,
  EmptyState,
  ErrorState,
  Money,
  ProgressBar,
  SkeletonChart,
  StatusBadge,
} from "@/components/ar/ui/primitives";
import {
  agingSummary,
  computeMetrics,
  computePreviousMetrics,
  filterCredits,
  filterInvoices,
  filterPayments,
  outstandingByCustomer,
  paymentStateOf,
  useArDataset,
} from "@/lib/ar/dataset";
import { describeRange, useArFilters } from "@/lib/ar/filters";
import {
  count,
  daysBetween,
  daysPastDue,
  money,
  percentChange,
  ratio,
  shortDate,
  toNumber,
} from "@/lib/ar/format";
import { ACCENTS } from "@/lib/ar/theme";
import type { ArInvoice, ArPayment } from "@/lib/queries/ar";

const AGING_COLORS = [
  ACCENTS.green.hex,
  ACCENTS.blue.hex,
  ACCENTS.orange.hex,
  ACCENTS.red.hex,
  "#9f1239",
];

/** Invoices whose due date lands inside the next N days and still owe money. */
const UPCOMING_WINDOW_DAYS = 30;

export default function ReceivablePage() {
  const { filters } = useArFilters();
  const { data, isLoading, error, refetch } = useArDataset();

  const view = useMemo(() => {
    const now = new Date();
    const invoices = filterInvoices(data.invoices, filters, now);
    const payments = filterPayments(data.payments, filters, data.invoices, now);
    const credits = filterCredits(data.credits, filters);
    const metrics = computeMetrics(invoices, payments, credits, now, data.invoices);
    const previous = computePreviousMetrics(data, filters, now);

    const outstanding = invoices.filter(
      (i) =>
        toNumber(i.balanceDue) > 0 &&
        !["draft", "cancelled", "void"].includes(i.status),
    );

    const upcoming = outstanding
      .filter((i) => {
        const days = daysBetween(now, i.dueDate);
        return days != null && days >= 0 && days <= UPCOMING_WINDOW_DAYS;
      })
      .sort(
        (a, b) =>
          (daysBetween(now, a.dueDate) ?? 0) - (daysBetween(now, b.dueDate) ?? 0),
      );

    const recent = [...payments]
      .sort(
        (a, b) =>
          new Date(b.paymentDate ?? 0).getTime() -
          new Date(a.paymentDate ?? 0).getTime(),
      )
      .slice(0, 8);

    return {
      metrics,
      previous,
      outstanding,
      upcoming,
      recent,
      aging: agingSummary(invoices, now),
      byCustomer: outstandingByCustomer(invoices, 8),
      now,
    };
  }, [data, filters]);

  const { metrics, previous } = view;
  const comparison = previous ? "vs previous period" : describeRange(filters);
  const agingTotal = view.aging.reduce((s, b) => s + b.total, 0);

  const outstandingColumns: Column<ArInvoice>[] = [
    {
      id: "invoiceNumber",
      header: "Invoice",
      accessor: (r) => r.invoiceNumber,
      cell: (r) => (
        <Link
          href="/dashboard/ar/invoices"
          className="font-medium text-slate-900 underline-offset-2 hover:underline"
        >
          {r.invoiceNumber}
        </Link>
      ),
      width: "w-36",
    },
    {
      id: "customer",
      header: "Customer",
      accessor: (r) => r.locationName ?? "",
      cell: (r) => (
        <span className="text-slate-700">{r.locationName || "Unassigned"}</span>
      ),
    },
    {
      id: "issued",
      header: "Issued",
      accessor: (r) => r.invoiceDate ?? "",
      cell: (r) => <span className="text-slate-500">{shortDate(r.invoiceDate)}</span>,
    },
    {
      id: "due",
      header: "Due",
      accessor: (r) => r.dueDate ?? "",
      cell: (r) => {
        const past = daysPastDue(r.dueDate, view.now);
        return (
          <div>
            <span className="text-slate-700">{shortDate(r.dueDate)}</span>
            {past > 0 ? (
              <span className="ml-2 text-xs font-medium text-rose-600">
                {past}d overdue
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      accessor: (r) => r.status,
      cell: (r) => <StatusBadge status={r.status} />,
      width: "w-40",
    },
    {
      id: "total",
      header: "Total",
      accessor: (r) => toNumber(r.total),
      cell: (r) => <Amount value={r.total} />,
      align: "right",
    },
    {
      id: "paid",
      header: "Paid",
      accessor: (r) => toNumber(r.amountPaid),
      cell: (r) => (
        <span className="tabular-nums text-slate-500">{money(r.amountPaid)}</span>
      ),
      align: "right",
      defaultHidden: true,
    },
    {
      id: "balance",
      header: "Balance due",
      accessor: (r) => toNumber(r.balanceDue),
      cell: (r) => (
        <Money
          value={r.balanceDue}
          tone={paymentStateOf(r, view.now) === "overdue" ? "negative" : "pending"}
        />
      ),
      align: "right",
    },
  ];

  const upcomingColumns: Column<ArInvoice>[] = [
    {
      id: "due",
      header: "Due",
      accessor: (r) => r.dueDate ?? "",
      cell: (r) => {
        const days = daysBetween(view.now, r.dueDate) ?? 0;
        return (
          <div>
            <span className="font-medium text-slate-900">{shortDate(r.dueDate)}</span>
            <span className="ml-2 text-xs text-slate-400">
              {days === 0 ? "today" : `in ${days}d`}
            </span>
          </div>
        );
      },
    },
    {
      id: "invoiceNumber",
      header: "Invoice",
      accessor: (r) => r.invoiceNumber,
    },
    {
      id: "customer",
      header: "Customer",
      accessor: (r) => r.locationName ?? "",
    },
    {
      id: "balance",
      header: "Expected",
      accessor: (r) => toNumber(r.balanceDue),
      cell: (r) => <Money value={r.balanceDue} tone="pending" />,
      align: "right",
    },
  ];

  const receivedColumns: Column<ArPayment>[] = [
    {
      id: "date",
      header: "Received",
      accessor: (r) => r.paymentDate ?? "",
      cell: (r) => (
        <span className="font-medium text-slate-900">{shortDate(r.paymentDate)}</span>
      ),
    },
    {
      id: "invoice",
      header: "Invoice",
      accessor: (r) => r.invoiceNumber ?? "",
    },
    {
      id: "customer",
      header: "Customer",
      accessor: (r) => r.locationName ?? "",
    },
    {
      id: "method",
      header: "Method",
      accessor: (r) => r.paymentMethod ?? "",
      cell: (r) =>
        r.paymentMethod ? <Chip>{r.paymentMethod}</Chip> : <span>—</span>,
    },
    {
      id: "amount",
      header: "Amount",
      accessor: (r) => toNumber(r.amount),
      cell: (r) => <Money value={r.amount} tone="positive" />,
      align: "right",
    },
  ];

  if (error) {
    return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-5">
      <Panel className="sticky top-0 z-30" padded={false} overflowVisible>
        <div className="px-4 py-3 sm:px-5">
          <ArFilterBar searchPlaceholder="Search invoices or customers…" />
        </div>
      </Panel>

      {/* KPIs */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Total outstanding"
            value={money(metrics.outstanding)}
            icon={HandCoins}
            accent="purple"
            changePct={
              previous ? percentChange(metrics.outstanding, previous.outstanding) : null
            }
            upIsGood={false}
            comparison={comparison}
            hint={`${count(metrics.pendingPayments)} open invoices`}
          />
          <KpiCard
            label="Overdue"
            value={money(metrics.overdue)}
            icon={AlarmClock}
            accent="red"
            changePct={
              previous ? percentChange(metrics.overdue, previous.overdue) : null
            }
            upIsGood={false}
            comparison={comparison}
            hint={ratio(
              metrics.outstanding > 0
                ? (metrics.overdue / metrics.outstanding) * 100
                : 0,
              0,
            )}
          />
          <KpiCard
            label="Not yet due"
            value={money(metrics.currentDue)}
            icon={CalendarClock}
            accent="blue"
            changePct={
              previous ? percentChange(metrics.currentDue, previous.currentDue) : null
            }
            comparison={comparison}
            hint={`${count(view.upcoming.length)} due within ${UPCOMING_WINDOW_DAYS} days`}
          />
          <KpiCard
            label="Collected"
            value={money(metrics.collected)}
            icon={CircleDollarSign}
            accent="green"
            changePct={
              previous ? percentChange(metrics.collected, previous.collected) : null
            }
            comparison={comparison}
            hint={`Avg ${
              metrics.avgPaymentDays == null
                ? "—"
                : `${metrics.avgPaymentDays.toFixed(0)} days`
            } to pay`}
          />
        </div>
      )}

      {/* aging + collection progress */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2" padded={false}>
          <PanelHeader
            title="Aging summary"
            description="How long each open balance has been sitting past its due date"
            icon={<Layers className="h-4 w-4 text-slate-400" />}
          />
          <PanelBody className="space-y-3">
            {isLoading ? (
              <SkeletonChart height={200} />
            ) : agingTotal === 0 ? (
              <EmptyState
                compact
                icon={TrendingDown}
                title="Nothing outstanding"
                description="Every invoice in this range has been settled."
              />
            ) : (
              view.aging.map((bucket, i) => (
                <div key={bucket.bucket}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium text-slate-700">{bucket.label}</span>
                    <span className="flex items-baseline gap-2">
                      <span className="text-xs text-slate-400">
                        {count(bucket.count)} invoice{bucket.count === 1 ? "" : "s"}
                      </span>
                      <span className="tabular-nums font-semibold text-slate-900">
                        {money(bucket.total)}
                      </span>
                      <span className="w-12 text-right text-xs tabular-nums text-slate-400">
                        {ratio((bucket.total / agingTotal) * 100, 0)}
                      </span>
                    </span>
                  </div>
                  <ProgressBar
                    value={bucket.total}
                    max={agingTotal}
                    color={AGING_COLORS[i] ?? ACCENTS.slate.hex}
                  />
                </div>
              ))
            )}
          </PanelBody>
        </Panel>

        <Panel padded={false}>
          <PanelHeader
            title="Collection progress"
            description="Share of invoiced value already received"
          />
          <PanelBody>
            {isLoading ? (
              <SkeletonChart height={200} />
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
                    <dt className="text-slate-500">Received</dt>
                    <dd>
                      <Money value={metrics.collected} tone="positive" />
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Outstanding</dt>
                    <dd>
                      <Money value={metrics.outstanding} tone="pending" />
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Overdue</dt>
                    <dd>
                      <Money value={metrics.overdue} tone="negative" />
                    </dd>
                  </div>
                </dl>
              </>
            )}
          </PanelBody>
        </Panel>
      </div>

      {/* outstanding invoices */}
      <Panel padded={false}>
        <PanelHeader
          title="Outstanding invoices"
          description="Every invoice still carrying a balance in this range"
          action={
            <Link
              href="/dashboard/ar/invoices"
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition hover:text-slate-900"
            >
              Open invoices
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        <DataTable
          columns={outstandingColumns}
          rows={view.outstanding}
          getRowId={(r) => r.id}
          loading={isLoading}
          searchPlaceholder="Search outstanding invoices…"
          initialSort={{ id: "balance", dir: "desc" }}
          exportFileName="accounts-outstanding-invoices"
          emptyTitle="No outstanding balances"
          emptyDescription="Every invoice matching these filters has been paid in full."
        />
      </Panel>

      {/* upcoming + recently received */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel padded={false}>
          <PanelHeader
            title="Upcoming payments"
            description={`Due within the next ${UPCOMING_WINDOW_DAYS} days`}
            icon={<Clock3 className="h-4 w-4 text-slate-400" />}
          />
          <DataTable
            columns={upcomingColumns}
            rows={view.upcoming}
            getRowId={(r) => r.id}
            loading={isLoading}
            searchable={false}
            dense
            pageSize={6}
            exportFileName="accounts-upcoming-payments"
            emptyTitle="Nothing due soon"
            emptyDescription="No invoices fall due in the next 30 days."
          />
        </Panel>

        <Panel padded={false}>
          <PanelHeader
            title="Recently received"
            description="Latest payments applied against invoices"
            icon={<CircleDollarSign className="h-4 w-4 text-slate-400" />}
          />
          <DataTable
            columns={receivedColumns}
            rows={view.recent}
            getRowId={(r) => r.id}
            loading={isLoading}
            searchable={false}
            dense
            pageSize={6}
            exportFileName="accounts-recent-payments"
            emptyTitle="No payments yet"
            emptyDescription="Recorded receipts will show up here."
          />
        </Panel>
      </div>

      {/* who owes the most */}
      <Panel padded={false}>
        <PanelHeader
          title="Outstanding by customer"
          description="Where the open balance is concentrated"
        />
        <PanelBody className="pt-2">
          {isLoading ? (
            <SkeletonChart />
          ) : (
            <HorizontalBarChart
              data={view.byCustomer.map((c) => ({ name: c.name, value: c.value }))}
              color={ACCENTS.orange.hex}
              emptyMessage="Every account is settled in this range."
            />
          )}
        </PanelBody>
      </Panel>
    </div>
  );
}
