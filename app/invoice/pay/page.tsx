"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
  fetchPublicInvoice,
  submitPublicInvoicePayment,
} from "@/lib/queries/public-invoice";
import { resolveMediaUrl } from "@/lib/erp/media-url";

function money(n: number | undefined) {
  return `$${Number(n || 0).toFixed(2)}`;
}

function formatDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function PublicPayInner() {
  const sp = useSearchParams();
  const token = sp.get("token") || "";
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [transactionReference, setTransactionReference] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const query = useQuery({
    queryKey: ["public-invoice", token],
    queryFn: () => fetchPublicInvoice(token),
    enabled: Boolean(token),
    retry: false,
  });

  const submit = useMutation({
    mutationFn: () =>
      submitPublicInvoicePayment(token, {
        amount: query.data?.invoice.balanceDue ?? 0,
        paymentMethod: "zelle",
        transactionReference,
        paymentDate,
        notes,
        proof,
      }),
    onSuccess: () => {
      setDone(true);
      setConfirmOpen(false);
      setError(null);
      void qc.invalidateQueries({ queryKey: ["public-invoice", token] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const data = query.data;
  const invoice = data?.invoice;
  const zelle = data?.zelle;
  const qrSrc = useMemo(
    () => resolveMediaUrl(zelle?.qrCodeUrl || ""),
    [zelle?.qrCodeUrl],
  );

  if (!token) {
    return (
      <Shell>
        <Card>
          <h1 className="text-xl font-semibold text-slate-900">Invalid payment link</h1>
          <p className="mt-2 text-sm text-slate-600">
            This invoice link is missing a secure token. Please use the Pay Now button from your
            invoice email.
          </p>
        </Card>
      </Shell>
    );
  }

  if (query.isLoading) {
    return (
      <Shell>
        <Card>
          <p className="text-sm text-slate-500">Loading invoice…</p>
        </Card>
      </Shell>
    );
  }

  if (query.error || !invoice || !data) {
    return (
      <Shell>
        <Card>
          <h1 className="text-xl font-semibold text-slate-900">Invoice unavailable</h1>
          <p className="mt-2 text-sm text-rose-700">
            {(query.error as Error)?.message || "Could not load this invoice."}
          </p>
        </Card>
      </Shell>
    );
  }

  const recipient =
    [zelle?.recipientEmail, zelle?.recipientPhone].filter(Boolean).join(" · ") ||
    zelle?.details ||
    "";

  return (
    <Shell company={data.company.name} logoUrl={data.company.logoUrl}>
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
                Invoice
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                #{invoice.invoiceNumber}
              </h1>
            </div>
            <StatusPill status={invoice.status} isPaid={invoice.isPaid} pending={invoice.hasPendingSubmission} />
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Bill to</p>
              <p className="mt-1 font-medium text-slate-900">{data.billing.companyName || "—"}</p>
              {data.billing.billingEmail ? (
                <p className="mt-0.5 text-sm text-slate-600">{data.billing.billingEmail}</p>
              ) : null}
              {data.billing.billingAddress ? (
                <p className="mt-1 whitespace-pre-line text-sm text-slate-500">
                  {data.billing.billingAddress}
                </p>
              ) : null}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Invoice date</span>
                <span className="font-medium text-slate-900">{formatDate(invoice.invoiceDate)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Due date</span>
                <span className="font-medium text-slate-900">{formatDate(invoice.dueDate)}</span>
              </div>
              <div className="flex justify-between gap-4 border-t border-slate-100 pt-2">
                <span className="text-slate-500">Amount due</span>
                <span className="text-lg font-semibold tabular-nums text-slate-900">
                  {money(invoice.balanceDue)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-sm font-semibold text-slate-900">Invoice items</h2>
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Description</th>
                    <th className="px-3 py-2 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, idx) => (
                    <tr key={idx} className="border-t border-slate-100">
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-slate-900">{item.name}</div>
                        {item.description ? (
                          <div className="text-xs text-slate-500">{item.description}</div>
                        ) : null}
                        <div className="text-xs text-slate-400">
                          {item.quantity} × {money(item.unitPrice)}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-800">
                        {money(item.lineTotal ?? item.quantity * item.unitPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="mt-4 space-y-1.5 text-sm">
              <Row label="Subtotal" value={money(invoice.subtotal)} />
              {invoice.discountAmount > 0 ? (
                <Row label="Discount" value={`−${money(invoice.discountAmount)}`} />
              ) : null}
              {invoice.taxAmount > 0 ? <Row label="Tax" value={money(invoice.taxAmount)} /> : null}
              {invoice.lateFeeAmount > 0 ? (
                <Row label="Late fee" value={money(invoice.lateFeeAmount)} />
              ) : null}
              {invoice.creditApplied > 0 ? (
                <Row label="Credits" value={`−${money(invoice.creditApplied)}`} />
              ) : null}
              <Row label="Total" value={money(invoice.total)} bold />
              <Row label="Amount paid" value={money(invoice.amountPaid)} />
              <Row label="Amount due" value={money(invoice.balanceDue)} bold accent />
            </dl>
            {invoice.notes ? (
              <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                {invoice.notes}
              </p>
            ) : null}
          </div>
        </Card>

        <Card className="h-fit lg:sticky lg:top-6">
          {invoice.isPaid ? (
            <PaidState />
          ) : invoice.hasPendingSubmission || done ? (
            <PendingState
              amount={invoice.pendingSubmission?.amount ?? invoice.balanceDue}
              submittedAt={invoice.pendingSubmission?.submittedAt}
              transactionReference={
                invoice.pendingSubmission?.transactionReference ||
                (done ? transactionReference : undefined)
              }
              paymentMethod={invoice.pendingSubmission?.paymentMethod}
              paymentDate={invoice.pendingSubmission?.paymentDate}
            />
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
                Pay with Zelle
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">
                Scan the QR code below
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Use your bank&apos;s mobile app. This page shows your invoice amount and memo —
                the QR is your business Zelle recipient code.
              </p>

              {zelle?.enabled && qrSrc ? (
                <div className="mt-5 flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrSrc}
                    alt="Zelle QR code"
                    className="h-52 w-52 rounded-2xl border border-slate-200 bg-white object-contain p-3 shadow-sm"
                  />
                </div>
              ) : zelle?.enabled ? (
                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Zelle is enabled, but no QR code has been configured yet. Use the recipient details
                  below in your banking app.
                </p>
              ) : (
                <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  Online Zelle payment details are not configured. Contact billing for payment
                  instructions.
                </p>
              )}

              <dl className="mt-5 space-y-2 text-sm">
                {zelle?.displayName ? (
                  <Row label="Display name" value={zelle.displayName} />
                ) : null}
                {recipient ? <Row label="Zelle recipient" value={recipient} /> : null}
                <Row label="Amount" value={money(invoice.balanceDue)} bold />
                <Row label="Memo" value={invoice.invoiceNumber} bold />
              </dl>

              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900">How to pay with Zelle</h3>
                <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-sm text-slate-600">
                  <li>Open your bank&apos;s mobile app.</li>
                  <li>Open Zelle.</li>
                  <li>Scan the Zelle QR code above (or enter the recipient).</li>
                  <li>Confirm the recipient.</li>
                  <li>Confirm the invoice amount ({money(invoice.balanceDue)}).</li>
                  <li>Include {invoice.invoiceNumber} in the memo if your bank allows it.</li>
                  <li>Send the payment.</li>
                  <li>Return here and select &ldquo;I&apos;ve Completed Payment&rdquo;.</li>
                </ol>
              </div>

              {!confirmOpen ? (
                <Button className="mt-5 w-full" onClick={() => setConfirmOpen(true)}>
                  I&apos;ve Completed Payment
                </Button>
              ) : (
                <div className="mt-5 space-y-3 rounded-xl border border-slate-200 p-4">
                  <h3 className="text-sm font-semibold text-slate-900">Confirm Zelle payment</h3>
                  <p className="text-xs text-slate-500">
                    Submitting does not mark the invoice paid. An administrator will verify your
                    payment.
                  </p>
                  <Input
                    label="Invoice"
                    value={invoice.invoiceNumber}
                    readOnly
                  />
                  <Input label="Amount" value={money(invoice.balanceDue)} readOnly />
                  <Input
                    label="Zelle transaction ID"
                    value={transactionReference}
                    onChange={(e) => setTransactionReference(e.target.value)}
                    placeholder="From your bank confirmation"
                    required
                  />
                  <Input
                    label="Payment date"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Upload payment proof
                    </label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="block w-full text-sm text-slate-600"
                      onChange={(e) => setProof(e.target.files?.[0] || null)}
                    />
                  </div>
                  <Textarea
                    label="Notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional"
                  />
                  {error ? <p className="text-sm text-rose-600">{error}</p> : null}
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={() => setConfirmOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1"
                      disabled={submit.isPending || !transactionReference.trim()}
                      onClick={() => {
                        if (!transactionReference.trim()) {
                          setError("Zelle transaction ID is required");
                          return;
                        }
                        setError(null);
                        submit.mutate();
                      }}
                    >
                      {submit.isPending ? "Submitting…" : "Payment submitted"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </Shell>
  );
}

function Shell({
  children,
  company,
  logoUrl,
}: {
  children: React.ReactNode;
  company?: string;
  logoUrl?: string;
}) {
  return (
    <div className="min-h-dvh bg-[radial-gradient(ellipse_at_top,_#ecfdf5_0%,_#f8fafc_45%,_#f1f5f9_100%)]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={resolveMediaUrl(logoUrl)} alt="" className="h-10 w-auto" />
            ) : (
              <BrandLogo className="h-9 w-auto" />
            )}
            {company ? (
              <span className="text-sm font-semibold text-slate-700">{company}</span>
            ) : null}
          </div>
          <p className="text-xs text-slate-500">Secure invoice payment</p>
        </header>
        {children}
        <p className="mt-8 text-center text-xs text-slate-400">
          Do not share this link publicly. It is unique to your invoice.
        </p>
      </div>
    </div>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

function Row({
  label,
  value,
  bold,
  accent,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd
        className={`tabular-nums ${
          accent ? "text-teal-800" : "text-slate-900"
        } ${bold ? "font-semibold" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

function StatusPill({
  status,
  isPaid,
  pending,
}: {
  status: string;
  isPaid: boolean;
  pending: boolean;
}) {
  const label = isPaid
    ? "Paid"
    : pending
      ? "Payment pending verification"
      : status.replace(/_/g, " ");
  const tone = isPaid
    ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
    : pending
      ? "bg-amber-50 text-amber-900 ring-amber-200"
      : "bg-slate-100 text-slate-700 ring-slate-200";
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${tone}`}>
      {label}
    </span>
  );
}

function PaidState() {
  return (
    <div className="text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Paid</p>
      <h2 className="mt-2 text-xl font-semibold text-slate-900">Thank you</h2>
      <p className="mt-2 text-sm text-slate-600">This invoice has been paid in full.</p>
    </div>
  );
}

function PendingState({
  amount,
  submittedAt,
  transactionReference,
  paymentMethod,
  paymentDate,
}: {
  amount: number;
  submittedAt?: string;
  transactionReference?: string;
  paymentMethod?: string;
  paymentDate?: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
        Payment submitted
      </p>
      <h2 className="mt-2 text-xl font-semibold text-slate-900">Pending verification</h2>
      <p className="mt-2 text-sm text-slate-600">
        We received your payment confirmation. An administrator will verify it before the invoice is
        marked paid. You can leave this page and return anytime — your submission stays on file.
      </p>
      <dl className="mt-5 space-y-2 text-sm">
        <Row label="Amount" value={money(amount)} bold />
        {paymentMethod ? (
          <Row label="Method" value={paymentMethod.replace(/_/g, " ")} />
        ) : null}
        {transactionReference ? (
          <Row label="Transaction ID" value={transactionReference} bold />
        ) : null}
        {paymentDate ? <Row label="Payment date" value={formatDate(paymentDate)} /> : null}
        <Row label="Submitted" value={formatDate(submittedAt)} />
        <Row label="Status" value="Pending verification" />
      </dl>
    </div>
  );
}

export default function PublicInvoicePayPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center text-sm text-slate-500">
          Loading invoice…
        </div>
      }
    >
      <PublicPayInner />
    </Suspense>
  );
}
