"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock3, Loader2, ShieldCheck } from "lucide-react";
import { useSession } from "@/lib/session-context";
import { canViewAr } from "@/lib/permissions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Panel, PanelBody, PanelHeader } from "@/components/ar/ui/panel";
import { EmptyState, ErrorState } from "@/components/ar/ui/primitives";
import { useArToast } from "@/components/ar/ui/toast";
import {
  fetchArInvoice,
  fetchArSettings,
  submitArInvoicePayment,
} from "@/lib/queries/ar";

type PaymentMethodSetting = {
  type: string;
  label: string;
  details?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  qrCodeUrl?: string;
  enabled?: boolean;
};

const TYPE_LABELS: Record<string, string> = {
  zelle: "Zelle",
  wire: "Wire Transfer",
  ach: "ACH / Bank Transfer",
  check: "Check",
  card: "Credit Card",
  cash: "Cash",
  other: "Other",
};

function PayInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const invoiceId = sp.get("invoice") ?? "";
  const preferredMethod = sp.get("method") ?? "";
  const { user } = useSession();
  const toast = useArToast();

  const [amount, setAmount] = useState("");
  const [methodType, setMethodType] = useState("");
  const [transactionReference, setTransactionReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const invoiceQuery = useQuery({
    queryKey: ["ar", "invoice", invoiceId],
    queryFn: () => fetchArInvoice(invoiceId),
    enabled: Boolean(invoiceId) && canViewAr(user.role),
  });

  const settingsQuery = useQuery({
    queryKey: ["ar", "settings"],
    queryFn: fetchArSettings,
    enabled: canViewAr(user.role),
  });

  const invoice = invoiceQuery.data;
  const settings = settingsQuery.data as { paymentMethods?: PaymentMethodSetting[] } | undefined;

  const methods = useMemo(
    () => (settings?.paymentMethods ?? []).filter((m) => m.enabled !== false),
    [settings],
  );
  const zelle = methods.find((m) => m.type === "zelle");
  const otherMethods = methods.filter((m) => m.type !== "zelle");

  useEffect(() => {
    if (invoice && !amount) {
      setAmount(String(invoice.balanceDue ?? 0));
    }
  }, [invoice, amount]);

  useEffect(() => {
    if (!methodType && methods.length) {
      const preferred = methods.find((m) => m.type === preferredMethod);
      setMethodType((preferred ?? methods[0]).type);
    }
  }, [methods, preferredMethod, methodType]);

  const submitMutation = useMutation({
    mutationFn: () =>
      submitArInvoicePayment(invoiceId, {
        amount: Number(amount),
        paymentMethod: methodType,
        transactionReference: transactionReference.trim() || undefined,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      setSubmitted(true);
      toast.success(
        "Payment reported",
        "We'll notify you once it's been verified and applied to your invoice.",
      );
    },
    onError: (e: Error) => {
      toast.error("Could not submit payment", e.message);
    },
  });

  if (!canViewAr(user.role)) {
    return (
      <EmptyState
        title="Access required"
        description="You don't have permission to view this page."
      />
    );
  }

  if (!invoiceId) {
    return (
      <div className="p-6 text-sm text-slate-600">
        Missing invoice reference.{" "}
        <Link href="/dashboard/ar/invoices" className="text-primary-600 underline">
          Back to invoices
        </Link>
      </div>
    );
  }

  if (invoiceQuery.isLoading || settingsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (invoiceQuery.error || !invoice) {
    return (
      <ErrorState
        message={(invoiceQuery.error as Error)?.message || "Invoice not found"}
        onRetry={() => invoiceQuery.refetch()}
      />
    );
  }

  const activeMethod = methods.find((m) => m.type === methodType);
  const zelleRecipient = zelle
    ? [zelle.recipientEmail, zelle.recipientPhone].filter(Boolean).join(" or ") || zelle.details
    : "";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Panel padded={false}>
        <PanelHeader
          title={`Invoice ${invoice.invoiceNumber}`}
          description={`${invoice.locationName ?? ""}`.trim() || undefined}
        />
        <PanelBody>
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-slate-500">Total</p>
              <p className="font-medium text-slate-900">
                ${Number(invoice.total ?? 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Balance due</p>
              <p className="font-medium text-slate-900">
                ${Number(invoice.balanceDue ?? 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Due date</p>
              <p className="font-medium text-slate-900">
                {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "—"}
              </p>
            </div>
          </div>
        </PanelBody>
      </Panel>

      {submitted ? (
        <Panel padded={false}>
          <PanelBody className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <Clock3 className="h-6 w-6" />
            </span>
            <p className="text-base font-semibold text-slate-900">
              Payment submitted — pending verification
            </p>
            <p className="max-w-sm text-sm text-slate-500">
              Your invoice will remain unpaid until an administrator reviews and verifies
              this payment. You&apos;ll be notified once it&apos;s been approved.
            </p>
            <Button
              variant="secondary"
              onClick={() => router.push("/dashboard/ar/invoices")}
            >
              Back to invoices
            </Button>
          </PanelBody>
        </Panel>
      ) : invoice.balanceDue <= 0 ? (
        <Panel padded={false}>
          <PanelBody className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <p className="text-base font-semibold text-slate-900">This invoice is paid</p>
            <p className="text-sm text-slate-500">There is no remaining balance due.</p>
          </PanelBody>
        </Panel>
      ) : (
        <>
          {zelle ? (
            <Panel padded={false}>
              <PanelHeader
                title="Pay with Zelle"
                description="Send the payment yourself, then confirm it below."
              />
              <PanelBody className="space-y-3">
                <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-600">
                  <li>Open your banking app and select Zelle.</li>
                  <li>Choose &ldquo;Send Money with Zelle&rdquo;.</li>
                  <li>Enter the Zelle recipient shown below.</li>
                  <li>Enter the exact invoice amount.</li>
                  <li>Enter the invoice number in the memo/message.</li>
                  <li>Review the payment details and send the payment.</li>
                  <li>Confirm your payment using the form below.</li>
                </ol>
                {zelle.qrCodeUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={zelle.qrCodeUrl}
                    alt="Zelle QR code"
                    className="h-36 w-36 rounded-lg border border-slate-200"
                  />
                ) : null}
                {zelleRecipient ? (
                  <div className="rounded-lg bg-slate-50 p-3 text-sm">
                    <p className="text-slate-500">Zelle recipient</p>
                    <p className="font-medium text-slate-900">{zelleRecipient}</p>
                  </div>
                ) : null}
                <div className="rounded-lg bg-slate-50 p-3 text-sm">
                  <p className="text-slate-500">Memo / reference</p>
                  <p className="font-medium text-slate-900">{invoice.invoiceNumber}</p>
                </div>
              </PanelBody>
            </Panel>
          ) : null}

          <Panel padded={false}>
            <PanelHeader
              title="Confirm your payment"
              icon={
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                  <ShieldCheck className="h-[18px] w-[18px]" />
                </span>
              }
              description="Submitting this reports the payment for admin verification — it does not mark the invoice as paid."
            />
            <PanelBody className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Payment method"
                  value={methodType}
                  onChange={(e) => setMethodType(e.target.value)}
                >
                  {methods.map((m) => (
                    <option key={m.type} value={m.type}>
                      {m.label || TYPE_LABELS[m.type] || m.type}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <Input
                label="Transaction reference (optional)"
                value={transactionReference}
                onChange={(e) => setTransactionReference(e.target.value)}
                placeholder="Confirmation number from your bank"
              />
              <Textarea
                label="Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              {!methods.length ? (
                <p className="text-sm text-rose-600">
                  No payment methods are configured for this account yet.
                </p>
              ) : null}
              {activeMethod?.type !== "zelle" && activeMethod?.details ? (
                <p className="text-sm text-slate-500">{activeMethod.details}</p>
              ) : null}
              <div className="flex justify-end">
                <Button
                  disabled={
                    submitMutation.isPending ||
                    !methods.length ||
                    !amount ||
                    Number(amount) <= 0
                  }
                  onClick={() => submitMutation.mutate()}
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…
                    </>
                  ) : (
                    "I've Completed Payment"
                  )}
                </Button>
              </div>
            </PanelBody>
          </Panel>

          {otherMethods.length ? (
            <Panel padded={false}>
              <PanelHeader title="Other ways to pay" />
              <PanelBody className="space-y-3">
                {otherMethods.map((m) => (
                  <div key={m.type} className="rounded-lg border border-slate-200 p-3 text-sm">
                    <p className="font-medium text-slate-900">
                      {m.label || TYPE_LABELS[m.type] || m.type}
                    </p>
                    {m.details ? <p className="mt-1 text-slate-500">{m.details}</p> : null}
                  </div>
                ))}
              </PanelBody>
            </Panel>
          ) : null}
        </>
      )}
    </div>
  );
}

export default function ArPayPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      }
    >
      <PayInner />
    </Suspense>
  );
}
