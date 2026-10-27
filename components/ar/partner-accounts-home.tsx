"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  AlertTriangle,
  CircleDollarSign,
  FileText,
  Wallet,
} from "lucide-react";
import { KpiCard, KpiCardSkeleton } from "@/components/ar/ui/kpi-card";
import { Panel, PanelBody, PanelHeader } from "@/components/ar/ui/panel";
import { DataTable, type Column } from "@/components/ar/ui/data-table";
import { Amount, ErrorState, StatusBadge } from "@/components/ar/ui/primitives";
import { Button } from "@/components/ui/Button";
import { paymentStateOf, useArDataset } from "@/lib/ar/dataset";
import { money, shortDate, toNumber, count } from "@/lib/ar/format";
import type { ArInvoice } from "@/lib/queries/ar";
import { publicInvoicePayHref } from "@/lib/queries/public-invoice";
import { useSession } from "@/lib/session-context";

/** Partner-only Accounts home — own invoices only, no company-wide finance. */
export function PartnerAccountsHome() {
  const { user } = useSession();
  const { data, isLoading, error, refetch } = useArDataset();

  const view = useMemo(() => {
    const now = new Date();
    const invoices = data.invoices.filter(
      (i) => !["draft", "cancelled", "void"].includes(i.status),
    );
    const pending = invoices.filter((i) => {
      const state = paymentStateOf(i, now);
      return state === "unpaid" || state === "partial";
    });
    const overdue = invoices.filter((i) => paymentStateOf(i, now) === "overdue");
    const paid = invoices.filter((i) => paymentStateOf(i, now) === "paid");
    return {
      total: invoices.length,
      pendingAmount: pending.reduce((s, i) => s + toNumber(i.balanceDue), 0),
      overdueAmount: overdue.reduce((s, i) => s + toNumber(i.balanceDue), 0),
      paidAmount: paid.reduce((s, i) => s + toNumber(i.amountPaid), 0),
      recent: [...invoices]
        .sort(
          (a, b) =>
            new Date(b.invoiceDate || 0).getTime() - new Date(a.invoiceDate || 0).getTime(),
        )
        .slice(0, 8),
    };
  }, [data.invoices]);

  const columns: Column<ArInvoice>[] = [
    {
      id: "number",
      header: "Invoice",
      accessor: (r) => r.invoiceNumber,
      cell: (r) => <span className="font-medium text-slate-900">{r.invoiceNumber}</span>,
    },
    {
      id: "date",
      header: "Date",
      accessor: (r) => r.invoiceDate || "",
      cell: (r) => shortDate(r.invoiceDate),
    },
    {
      id: "due",
      header: "Due",
      accessor: (r) => r.dueDate || "",
      cell: (r) => shortDate(r.dueDate),
    },
    {
      id: "amount",
      header: "Amount due",
      accessor: (r) => toNumber(r.balanceDue),
      align: "right",
      cell: (r) => <Amount value={r.balanceDue} />,
    },
    {
      id: "status",
      header: "Status",
      accessor: (r) => r.status,
      cell: (r) => <StatusBadge status={r.status} />,
    },
    {
      id: "actions",
      header: "",
      accessor: () => "",
      sortable: false,
      cell: (r) => {
        const due = toNumber(r.balanceDue);
        if (due > 0 && r.publicPaymentToken) {
          return (
            <Link
              href={publicInvoicePayHref(r.publicPaymentToken)}
              className="text-xs font-semibold text-teal-700 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Pay now
            </Link>
          );
        }
        if (r.publicPaymentToken) {
          return (
            <Link
              href={publicInvoicePayHref(r.publicPaymentToken)}
              className="text-xs font-medium text-slate-600 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              View
            </Link>
          );
        }
        return null;
      },
    },
  ];

  if (error) {
    return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Welcome{user.name ? `, ${user.name}` : ""}
        </h2>
        <p className="text-sm text-slate-500">
          Payable insights for your location — amounts due, paid, and overdue.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Total invoices" value={count(view.total)} icon={FileText} accent="blue" />
          <KpiCard
            label="Amount to pay"
            value={money(view.pendingAmount)}
            icon={Wallet}
            accent="purple"
          />
          <KpiCard
            label="Paid"
            value={money(view.paidAmount)}
            icon={CircleDollarSign}
            accent="green"
          />
          <KpiCard
            label="Overdue"
            value={money(view.overdueAmount)}
            icon={AlertTriangle}
            accent="red"
          />
        </div>
      )}

      <Panel padded={false}>
        <PanelHeader
          title="Recent invoices"
          description="Open Pay now to view Zelle instructions on the secure invoice page"
          action={
            <Link href="/dashboard/ar/invoices">
              <Button size="sm" variant="secondary">
                All invoices
              </Button>
            </Link>
          }
        />
        <PanelBody>
          <DataTable
            columns={columns}
            rows={view.recent}
            getRowId={(r) => r.id}
            loading={isLoading}
            emptyTitle="No invoices yet"
            emptyDescription="When invoices are sent to your location, they appear here."
          />
        </PanelBody>
      </Panel>
    </div>
  );
}
