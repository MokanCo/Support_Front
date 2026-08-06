"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  CircleDollarSign,
  Hash,
  TrendingUp,
} from "lucide-react";
import { AreaTrendChart } from "@/components/ar/ui/charts";
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
import { useArToast } from "@/components/ar/ui/toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  arDatasetQueryKey,
  filterPayments,
  monthlySeries,
  useArDataset,
} from "@/lib/ar/dataset";
import { useArFilters } from "@/lib/ar/filters";
import { count, humanize, money, shortDate, toNumber } from "@/lib/ar/format";
import { ACCENTS } from "@/lib/ar/theme";
import { canManageAr } from "@/lib/permissions";
import {
  fetchArInvoices,
  recordArPayment,
  type ArPayment,
} from "@/lib/queries/ar";
import { useSession } from "@/lib/session-context";

const PAYMENT_METHODS = [
  "zelle",
  "check",
  "wire",
  "ach",
  "cash",
  "credit_card",
  "other",
];

function paymentKpis(payments: ArPayment[]) {
  const amounts = payments.map((p) => toNumber(p.amount));
  const total = amounts.reduce((s, n) => s + n, 0);
  return {
    totalReceived: total,
    count: payments.length,
    average: payments.length ? total / payments.length : 0,
    largest: amounts.length ? Math.max(...amounts) : 0,
  };
}

export default function ArPaymentsPage() {
  const { user } = useSession();
  const manage = canManageAr(user.role);
  const toast = useArToast();
  const queryClient = useQueryClient();
  const { filters } = useArFilters();
  const { data, isLoading, error, refetch } = useArDataset();

  const [modalOpen, setModalOpen] = useState(false);
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [paymentMethod, setPaymentMethod] = useState("zelle");
  const [transactionReference, setTransactionReference] = useState("");
  const [notes, setNotes] = useState("");

  const payments = useMemo(
    () => filterPayments(data.payments, filters, data.invoices),
    [data.payments, data.invoices, filters],
  );
  const kpis = useMemo(() => paymentKpis(payments), [payments]);
  const months = useMemo(
    () => monthlySeries([], payments, 12),
    [payments],
  );

  const { data: invoiceData } = useQuery({
    queryKey: ["ar", "invoices", "payable"],
    queryFn: () => fetchArInvoices({ pageSize: 200 }),
    enabled: manage && modalOpen,
  });

  const payableInvoices = (invoiceData?.invoices ?? []).filter(
    (inv) => !["draft", "void", "cancelled"].includes(inv.status),
  );

  const recordMutation = useMutation({
    mutationFn: () =>
      recordArPayment({
        invoiceId: invoiceId.trim(),
        amount: Number(amount) || 0,
        paymentDate,
        paymentMethod,
        transactionReference: transactionReference.trim() || undefined,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: arDatasetQueryKey });
      queryClient.invalidateQueries({ queryKey: ["ar", "payments"] });
      queryClient.invalidateQueries({ queryKey: ["ar", "invoices"] });
      setModalOpen(false);
      setInvoiceId("");
      setAmount("");
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setPaymentMethod("zelle");
      setTransactionReference("");
      setNotes("");
      toast.success("Payment recorded");
    },
    onError: (e: Error) => toast.error("Could not record payment", e.message),
  });

  const columns = useMemo<Column<ArPayment>[]>(
    () => [
      {
        id: "date",
        header: "Date",
        accessor: (row) => row.paymentDate ?? "",
        cell: (row) => shortDate(row.paymentDate),
      },
      {
        id: "invoice",
        header: "Invoice #",
        accessor: (row) => row.invoiceNumber ?? row.invoiceId,
        cell: (row) => (
          <span className="font-medium font-mono text-slate-900">
            {row.invoiceNumber ?? row.invoiceId}
          </span>
        ),
      },
      {
        id: "customer",
        header: "Customer",
        accessor: (row) => row.locationName ?? "—",
      },
      {
        id: "method",
        header: "Method",
        accessor: (row) => row.paymentMethod ?? "",
        cell: (row) => (
          <Chip>{humanize(row.paymentMethod ?? "—")}</Chip>
        ),
      },
      {
        id: "reference",
        header: "Reference",
        accessor: (row) => row.transactionReference ?? "",
        cell: (row) => row.transactionReference || "—",
      },
      {
        id: "amount",
        header: "Amount",
        accessor: (row) => toNumber(row.amount),
        align: "right",
        cell: (row) => <Money value={row.amount} tone="positive" />,
      },
    ],
    [],
  );

  if (error) {
    return (
      <ErrorState
        message={(error as Error).message}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-5">
      <Panel className="sticky top-0 z-30" padded={false}>
        <div className="px-4 py-3 sm:px-5">
          <ArFilterBar showStatus={false} />
        </div>
      </Panel>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Total received"
            value={money(kpis.totalReceived)}
            icon={CircleDollarSign}
            accent="green"
          />
          <KpiCard
            label="Payments recorded"
            value={count(kpis.count)}
            icon={Hash}
            accent="blue"
          />
          <KpiCard
            label="Average payment size"
            value={money(kpis.average)}
            icon={Banknote}
            accent="teal"
          />
          <KpiCard
            label="Largest payment"
            value={money(kpis.largest)}
            icon={TrendingUp}
            accent="purple"
          />
        </div>
      )}

      <Panel padded={false}>
        <PanelHeader
          title="Collections over time"
          description="Cash received month by month in the filtered set"
        />
        <PanelBody className="pt-2">
          {isLoading ? (
            <SkeletonChart />
          ) : (
            <AreaTrendChart
              data={months}
              xKey="label"
              series={[
                {
                  key: "collected",
                  label: "Collected",
                  color: ACCENTS.green.hex,
                },
              ]}
              emptyMessage="No payments in this range yet."
            />
          )}
        </PanelBody>
      </Panel>

      <Panel padded={false}>
        <PanelHeader
          title="Payments"
          description="Recorded payments against invoices"
          action={
            manage ? (
              <Button size="sm" onClick={() => setModalOpen(true)}>
                Record payment
              </Button>
            ) : undefined
          }
        />
        <DataTable
          columns={columns}
          rows={payments}
          getRowId={(row) => row.id}
          loading={isLoading}
          searchable={false}
          initialSort={{ id: "date", dir: "desc" }}
          exportFileName="accounts-payments"
          emptyTitle="No payments recorded"
          emptyDescription="Adjust filters or record a payment to see activity here."
          emptyAction={
            manage ? (
              <Button size="sm" onClick={() => setModalOpen(true)}>
                Record payment
              </Button>
            ) : undefined
          }
        />
      </Panel>

      <Modal
        open={modalOpen}
        title="Record payment"
        onClose={() => setModalOpen(false)}
      >
        <div className="space-y-4">
          <Select
            label="Invoice"
            value={invoiceId}
            onChange={(e) => setInvoiceId(e.target.value)}
            required
          >
            <option value="">Select an invoice…</option>
            {payableInvoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.invoiceNumber}
                {inv.locationName ? ` · ${inv.locationName}` : ""} ·{" "}
                {money(inv.balanceDue)} due
              </option>
            ))}
          </Select>
          <Input
            label="Amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <Input
            label="Payment date"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            required
          />
          <Select
            label="Payment method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {humanize(m)}
              </option>
            ))}
          </Select>
          <Input
            label="Transaction reference"
            value={transactionReference}
            onChange={(e) => setTransactionReference(e.target.value)}
          />
          <Textarea
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!invoiceId.trim() || !amount || recordMutation.isPending}
              onClick={() => recordMutation.mutate()}
            >
              {recordMutation.isPending ? "Saving…" : "Record payment"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
