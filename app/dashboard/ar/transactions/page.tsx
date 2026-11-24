"use client";

import { useMemo } from "react";
import {
  ArrowLeftRight,
  BadgePercent,
  CircleDollarSign,
  FileText,
} from "lucide-react";
import { BarTrendChart } from "@/components/ar/ui/charts";
import { DataTable, type Column } from "@/components/ar/ui/data-table";
import { ArFilterBar } from "@/components/ar/ui/filter-bar";
import { KpiCard, KpiCardSkeleton } from "@/components/ar/ui/kpi-card";
import { Panel, PanelBody, PanelHeader } from "@/components/ar/ui/panel";
import {
  Chip,
  ErrorState,
  Money,
  SkeletonChart,
} from "@/components/ar/ui/primitives";
import {
  filterCredits,
  filterInvoices,
  filterPayments,
  monthlySeries,
  useArDataset,
} from "@/lib/ar/dataset";
import { useArFilters } from "@/lib/ar/filters";
import {
  humanize,
  money,
  shortDate,
  signedMoney,
  toDate,
  toNumber,
  type Tone,
} from "@/lib/ar/format";
import { ACCENTS } from "@/lib/ar/theme";
import type { ArCredit } from "@/lib/queries/ar";

type LedgerType = "invoice" | "payment" | "credit";

type LedgerRow = {
  id: string;
  date?: string;
  type: LedgerType;
  reference: string;
  customer: string;
  description: string;
  amount: number;
};

const TYPE_TONE: Record<LedgerType, Tone> = {
  invoice: "pending",
  payment: "positive",
  credit: "neutral",
};

const TYPE_LABEL: Record<LedgerType, string> = {
  invoice: "Invoice",
  payment: "Payment",
  credit: "Credit",
};

function creditDate(c: ArCredit): string | undefined {
  const raw = (c as ArCredit & { createdAt?: string }).createdAt;
  return raw || undefined;
}

export default function ArTransactionsPage() {
  const { filters } = useArFilters();
  const { data, isLoading, error, refetch } = useArDataset();

  const view = useMemo(() => {
    const now = new Date();
    const invoices = filterInvoices(data.invoices, filters, now);
    const payments = filterPayments(data.payments, filters, data.invoices, now);
    const credits = filterCredits(data.credits, filters);

    const rows: LedgerRow[] = [];

    for (const inv of invoices) {
      rows.push({
        id: `inv-${inv.id}`,
        date: inv.invoiceDate,
        type: "invoice",
        reference: inv.invoiceNumber,
        customer: inv.locationName ?? "—",
        description: `Invoice ${inv.invoiceNumber}`,
        amount: toNumber(inv.total),
      });
    }

    for (const p of payments) {
      rows.push({
        id: `pay-${p.id}`,
        date: p.paymentDate,
        type: "payment",
        reference: p.invoiceNumber ?? p.transactionReference ?? p.id,
        customer: p.locationName ?? "—",
        description: p.notes?.trim() || `Payment on ${p.invoiceNumber ?? "invoice"}`,
        amount: -toNumber(p.amount),
      });
    }

    for (const c of credits) {
      const ref = [c.type, c.reason].filter(Boolean).join(" — ") || c.id;
      rows.push({
        id: `crd-${c.id}`,
        date: creditDate(c),
        type: "credit",
        reference: ref,
        customer: c.locationName ?? "—",
        description: c.reason?.trim() || humanize(c.type) || "Credit applied",
        amount: -toNumber(c.amount),
      });
    }

    const invoiced = invoices
      .filter((i) => !["draft", "cancelled", "void"].includes(i.status))
      .reduce((s, i) => s + toNumber(i.total), 0);
    const received = payments.reduce((s, p) => s + toNumber(p.amount), 0);
    const creditsApplied = credits.reduce((s, c) => s + toNumber(c.amount), 0);
    const net = invoiced - received - creditsApplied;

    return {
      rows,
      months: monthlySeries(invoices, payments, 12, now),
      invoiced,
      received,
      creditsApplied,
      net,
    };
  }, [data, filters]);

  const columns = useMemo<Column<LedgerRow>[]>(
    () => [
      {
        id: "date",
        header: "Date",
        accessor: (r) => {
          const d = toDate(r.date);
          return d ? d.getTime() : 0;
        },
        cell: (r) => shortDate(r.date),
      },
      {
        id: "type",
        header: "Type",
        accessor: (r) => r.type,
        cell: (r) => (
          <Chip tone={TYPE_TONE[r.type]}>{TYPE_LABEL[r.type]}</Chip>
        ),
      },
      {
        id: "reference",
        header: "Reference",
        accessor: (r) => r.reference,
        cell: (r) => (
          <span className="font-medium text-slate-900">{r.reference}</span>
        ),
      },
      {
        id: "customer",
        header: "Customer",
        accessor: (r) => r.customer,
      },
      {
        id: "description",
        header: "Description",
        accessor: (r) => r.description,
      },
      {
        id: "amount",
        header: "Amount",
        accessor: (r) => r.amount,
        align: "right",
        cell: (r) => <Money value={r.amount} signed />,
      },
    ],
    [],
  );

  if (error) {
    return (
      <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
    );
  }

  return (
    <div className="space-y-5">
      <Panel className="sticky top-0 z-30" padded={false} overflowVisible>
        <div className="px-4 py-3 sm:px-5">
          <ArFilterBar />
        </div>
      </Panel>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Invoiced"
            value={money(view.invoiced)}
            icon={FileText}
            accent="blue"
            changePct={null}
          />
          <KpiCard
            label="Received"
            value={money(view.received)}
            icon={CircleDollarSign}
            accent="green"
            changePct={null}
          />
          <KpiCard
            label="Credits applied"
            value={money(view.creditsApplied)}
            icon={BadgePercent}
            accent="orange"
            changePct={null}
          />
          <KpiCard
            label="Net movement"
            value={signedMoney(view.net)}
            icon={ArrowLeftRight}
            accent="indigo"
            changePct={null}
          />
        </div>
      )}

      <Panel padded={false}>
        <PanelHeader
          title="Invoiced vs received"
          description="Monthly ledger movement across the filtered range"
        />
        <PanelBody className="pt-2">
          {isLoading ? (
            <SkeletonChart height={220} />
          ) : (
            <BarTrendChart
              data={view.months}
              xKey="label"
              height={220}
              stacked
              series={[
                { key: "revenue", label: "Invoiced", color: ACCENTS.blue.hex },
                {
                  key: "collected",
                  label: "Received",
                  color: ACCENTS.green.hex,
                },
              ]}
              emptyMessage="No ledger activity in this range."
            />
          )}
        </PanelBody>
      </Panel>

      <Panel padded={false}>
        <PanelHeader
          title="Ledger"
          description="Invoices, payments, and credits in one chronological view"
        />
        <DataTable
          columns={columns}
          rows={view.rows}
          getRowId={(r) => r.id}
          loading={isLoading}
          searchPlaceholder="Search transactions…"
          exportFileName="accounts-transactions"
          emptyTitle="No transactions yet"
          emptyDescription="Invoices, payments, and credits will appear here as activity is recorded."
          initialSort={{ id: "date", dir: "desc" }}
        />
      </Panel>
    </div>
  );
}
