"use client";

import { Landmark, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/modal";
import { money, toNumber } from "@/lib/ar/format";
import type { ArAchPaymentMethod, ArInvoice } from "@/lib/queries/ar";
import { payableBreakdown } from "@/lib/stripe/payable";

type Props = {
  invoice: ArInvoice | null;
  achMethod: ArAchPaymentMethod | null | undefined;
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/** Confirms an off-session ACH debit against a customer's saved bank account
 *  before firing it — this is a real bank pull with no customer-facing undo,
 *  so it gets the same click-through weight as cancelling an invoice. */
export function ChargeAchModal({
  invoice,
  achMethod,
  pending,
  onConfirm,
  onClose,
}: Props) {
  const open = Boolean(invoice);
  const amount = toNumber(invoice?.balanceDue);
  const breakdown = payableBreakdown("ach", amount);

  return (
    <Modal open={open} title="Charge saved ACH" onClose={onClose} size="md">
      {invoice ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-sky-100 bg-sky-50/60 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
              <Landmark className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0 text-sm">
              <p className="font-medium text-slate-900">
                {invoice.locationName ?? invoice.locationId}
              </p>
              <p className="mt-0.5 text-slate-600">
                {achMethod?.bankName ? `${achMethod.bankName} · ` : ""}
                Account ending in {achMethod?.last4 ?? "****"}
              </p>
              {achMethod?.authorizedAt ? (
                <p className="mt-1 text-xs text-slate-500">
                  Authorized on{" "}
                  {new Date(achMethod.authorizedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              ) : null}
            </div>
          </div>

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Invoice</dt>
              <dd className="font-medium text-slate-900">{invoice.invoiceNumber}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Invoice amount</dt>
              <dd className="tabular-nums text-slate-900">{money(breakdown.invoiceAmount)}</dd>
            </div>
            {breakdown.showFee ? (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">
                  ACH processing fee{breakdown.percentLabel ? ` (${breakdown.percentLabel})` : ""}
                </dt>
                <dd className="tabular-nums text-slate-900">{money(breakdown.processingFee)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4 border-t border-slate-100 pt-2">
              <dt className="font-medium text-slate-700">Amount to charge</dt>
              <dd className="text-lg font-semibold tabular-nums text-slate-900">
                {money(breakdown.total)}
              </dd>
            </div>
          </dl>

          <p className="text-xs text-slate-500">
            {breakdown.showFee
              ? "The processing fee is added so the business receives the invoice amount in full. "
              : ""}
            This immediately initiates a bank debit — no email or link is sent to
            the customer. ACH is not instant; it typically takes 3–5 business
            days to settle, and this invoice will show &ldquo;ACH
            processing&rdquo; until Stripe confirms the debit. The pull can
            still fail later (insufficient funds, closed account, disputed as
            unauthorized).
          </p>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={onConfirm} disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Charging…
                </>
              ) : (
                `Charge ${money(breakdown.total)} now`
              )}
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
