"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  CircleDollarSign,
  Hash,
  Loader2,
  ShieldCheck,
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
  fetchArPaymentSubmissions,
  recordArPayment,
  reviewArPaymentSubmission,
  type ArPayment,
  type ArPaymentSubmission,
} from "@/lib/queries/ar";
import { resolveMediaUrl } from "@/lib/erp/media-url";
import { useSession } from "@/lib/session-context";

const PAYMENT_METHODS = [
  "zelle",
  "check",
  "wire",
  "ach",
  "cash",
  "card",
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
  const canSeePendingQueue = user.role === "admin" || user.role === "support";
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
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [recordingFromSubmissionId, setRecordingFromSubmissionId] = useState<
    string | null
  >(null);

  const submissionsQuery = useQuery({
    queryKey: ["ar", "payment-submissions", "pending"],
    queryFn: () => fetchArPaymentSubmissions("pending"),
    enabled: canSeePendingQueue,
    refetchInterval: canSeePendingQueue ? 15_000 : false,
  });
  const submissions = submissionsQuery.data ?? [];

  function openRecordFromSubmission(s: ArPaymentSubmission) {
    setRecordingFromSubmissionId(s.id);
    setInvoiceId(s.invoiceId);
    setAmount(String(s.amount ?? ""));
    setPaymentDate(
      s.paymentDate
        ? new Date(s.paymentDate).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    );
    setPaymentMethod(s.paymentMethod || "zelle");
    setTransactionReference(s.transactionReference || "");
    setNotes(
      [
        s.notes,
        s.transactionReference ? `Txn ID: ${s.transactionReference}` : "",
        s.source === "public_invoice" ? "From public invoice payment page" : "",
      ]
        .filter(Boolean)
        .join(" · "),
    );
    setModalOpen(true);
  }

  const reviewMutation = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "approve" | "reject" }) => {
      setReviewingId(id);
      return reviewArPaymentSubmission(id, { decision });
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ar", "payment-submissions"] });
      queryClient.invalidateQueries({ queryKey: arDatasetQueryKey });
      queryClient.invalidateQueries({ queryKey: ["ar", "payments"] });
      queryClient.invalidateQueries({ queryKey: ["ar", "invoices"] });
      toast.success(
        variables.decision === "approve" ? "Payment approved" : "Submission rejected",
        variables.decision === "approve"
          ? "The invoice has been updated with this payment."
          : "The partner will need to resubmit if this was a mistake.",
      );
    },
    onError: (e: Error) => toast.error("Could not review submission", e.message),
    onSettled: () => setReviewingId(null),
  });

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
    onSuccess: async () => {
      const submissionId = recordingFromSubmissionId;
      if (submissionId) {
        try {
          await reviewArPaymentSubmission(submissionId, {
            decision: "reject",
            note: "Closed — payment recorded manually by admin",
          });
        } catch {
          // Payment already saved; leave queue item if review fails
        }
      }
      queryClient.invalidateQueries({ queryKey: ["ar", "payment-submissions"] });
      queryClient.invalidateQueries({ queryKey: arDatasetQueryKey });
      queryClient.invalidateQueries({ queryKey: ["ar", "payments"] });
      queryClient.invalidateQueries({ queryKey: ["ar", "invoices"] });
      setModalOpen(false);
      setRecordingFromSubmissionId(null);
      setInvoiceId("");
      setAmount("");
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setPaymentMethod("zelle");
      setTransactionReference("");
      setNotes("");
      toast.success(
        "Payment recorded",
        submissionId
          ? "Pending verification item was closed."
          : undefined,
      );
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
        header: "Transaction ID",
        accessor: (row) => row.transactionReference ?? "",
        cell: (row) =>
          row.transactionReference ? (
            <span className="font-mono text-xs text-slate-800">
              {row.transactionReference}
            </span>
          ) : (
            "—"
          ),
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
      <Panel className="sticky top-0 z-30" padded={false} overflowVisible>
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

      {canSeePendingQueue ? (
        <Panel padded={false}>
          <PanelHeader
            title="Pending verification"
            description="Customer “Payment submitted” confirmations (public invoice & portal) — Approve to post, or record manually"
            icon={
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <ShieldCheck className="h-[18px] w-[18px]" />
              </span>
            }
          />
          {submissionsQuery.isLoading ? (
            <PanelBody className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </PanelBody>
          ) : submissionsQuery.isError ? (
            <PanelBody>
              <p className="text-sm text-rose-600">
                Could not load pending submissions:{" "}
                {(submissionsQuery.error as Error)?.message || "Unknown error"}
              </p>
              <Button
                size="sm"
                variant="secondary"
                className="mt-3"
                onClick={() => void submissionsQuery.refetch()}
              >
                Retry
              </Button>
            </PanelBody>
          ) : submissions.length === 0 ? (
            <PanelBody>
              <p className="text-sm text-slate-400">
                No payment submissions awaiting review.
              </p>
            </PanelBody>
          ) : (
            <div className="divide-y divide-slate-100">
              {submissions.map((s) => {
                const busy = reviewingId === s.id && reviewMutation.isPending;
                const proofHref = s.proofUrl ? resolveMediaUrl(s.proofUrl) : "";
                const sourceLabel =
                  s.source === "public_invoice"
                    ? "Public invoice page"
                    : s.submittedByName
                      ? `Reported by ${s.submittedByName}`
                      : "Partner portal";
                return (
                  <div
                    key={s.id}
                    className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6"
                  >
                    <div className="min-w-0 space-y-2">
                      <p className="text-sm font-medium text-slate-900">
                        Invoice {s.invoiceNumber || s.invoiceId}
                        {s.locationName ? ` · ${s.locationName}` : ""}
                      </p>
                      <p className="text-sm text-slate-600">
                        <span className="font-semibold tabular-nums text-slate-900">
                          {money(s.amount)}
                        </span>
                        {" · "}
                        {humanize(s.paymentMethod)}
                        {s.paymentDate ? ` · paid ${shortDate(s.paymentDate)}` : ""}
                        {" · "}
                        <span className="text-slate-500">{sourceLabel}</span>
                      </p>
                      <div className="rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                          Transaction ID
                        </p>
                        <p className="mt-0.5 font-mono text-sm font-semibold text-slate-900 break-all">
                          {s.transactionReference?.trim() || "— not provided —"}
                        </p>
                      </div>
                      {s.notes ? (
                        <p className="text-xs text-slate-500">Notes: {s.notes}</p>
                      ) : null}
                      {proofHref ? (
                        <a
                          href={proofHref}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex text-xs font-medium text-teal-700 hover:underline"
                        >
                          View payment proof
                        </a>
                      ) : null}
                    </div>
                    {manage ? (
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={reviewMutation.isPending}
                          onClick={() => openRecordFromSubmission(s)}
                        >
                          Record manually
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={reviewMutation.isPending}
                          onClick={() =>
                            reviewMutation.mutate({ id: s.id, decision: "reject" })
                          }
                        >
                          {busy && reviewMutation.variables?.decision === "reject" ? (
                            <>
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Rejecting…
                            </>
                          ) : (
                            "Reject"
                          )}
                        </Button>
                        <Button
                          size="sm"
                          disabled={reviewMutation.isPending}
                          onClick={() =>
                            reviewMutation.mutate({ id: s.id, decision: "approve" })
                          }
                        >
                          {busy && reviewMutation.variables?.decision === "approve" ? (
                            <>
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Approving…
                            </>
                          ) : (
                            "Approve"
                          )}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      ) : null}

      <Panel padded={false}>
        <PanelHeader
          title="Payments"
          description="Recorded payments against invoices"
          action={
            manage ? (
              <Button
                size="sm"
                onClick={() => {
                  setRecordingFromSubmissionId(null);
                  setModalOpen(true);
                }}
              >
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
        onClose={() => {
          setModalOpen(false);
          setRecordingFromSubmissionId(null);
        }}
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
            label="Transaction ID"
            value={transactionReference}
            onChange={(e) => setTransactionReference(e.target.value)}
            placeholder="Zelle / bank confirmation ID"
          />
          <Textarea
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => {
              setModalOpen(false);
              setRecordingFromSubmissionId(null);
            }}>
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
