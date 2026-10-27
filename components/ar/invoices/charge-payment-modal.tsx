"use client";

import { useEffect, useState } from "react";
import { CreditCard, Landmark, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/modal";
import { money, toNumber } from "@/lib/ar/format";
import type { ArAchPaymentMethod, ArCardPaymentMethod, ArInvoice } from "@/lib/queries/ar";
import { payableBreakdown } from "@/lib/stripe/payable";

type Method = "ach" | "card";

type Props = {
  invoice: ArInvoice | null;
  achMethod: ArAchPaymentMethod | null | undefined;
  cardMethod: ArCardPaymentMethod | null | undefined;
  pending: boolean;
  onConfirm: (method: Method) => void;
  onClose: () => void;
};

/** Confirms an off-session charge against one of the customer's saved
 *  payment methods before firing it — a real charge with no customer-facing
 *  undo, so it gets the same click-through weight as cancelling an invoice.
 *  When both a bank account and a card are on file, a radio list lets the
 *  admin pick which one to charge for this invoice. */
export function ChargePaymentModal({
  invoice,
  achMethod,
  cardMethod,
  pending,
  onConfirm,
  onClose,
}: Props) {
  const open = Boolean(invoice);
  const achActive = achMethod?.status === "active";
  const cardActive = cardMethod?.status === "active";
  const [selected, setSelected] = useState<Method>("ach");

  // Default the radio to whichever method is actually available whenever a
  // new invoice is opened in this modal (or the set of available methods
  // changes) — never leave it pointed at a method that isn't on file.
  useEffect(() => {
    if (!open) return;
    if (achActive) setSelected("ach");
    else if (cardActive) setSelected("card");
  }, [open, invoice?.id, achActive, cardActive]);

  const amount = toNumber(invoice?.balanceDue);
  const breakdown = payableBreakdown(selected, amount);

  return (
    <Modal open={open} title="Charge Payment" onClose={onClose} size="md">
      {invoice ? (
        <div className="space-y-4">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Invoice</dt>
              <dd className="font-medium text-slate-900">{invoice.invoiceNumber}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Customer</dt>
              <dd className="font-medium text-slate-900">
                {invoice.locationName ?? invoice.locationId}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Amount due</dt>
              <dd className="tabular-nums text-slate-900">{money(amount)}</dd>
            </div>
          </dl>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              Charge which account?
            </p>
            {achActive ? (
              <label
                className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                  selected === "ach"
                    ? "border-sky-400 bg-sky-50 ring-1 ring-sky-200"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="charge-method"
                  checked={selected === "ach"}
                  onChange={() => setSelected("ach")}
                />
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                  <Landmark className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 text-sm">
                  <span className="block font-medium text-slate-900">
                    {achMethod?.bankName || "Bank account"}
                  </span>
                  <span className="block text-slate-600">
                    Account ending in {achMethod?.last4 || "****"}
                  </span>
                </span>
              </label>
            ) : null}
            {cardActive ? (
              <label
                className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                  selected === "card"
                    ? "border-violet-400 bg-violet-50 ring-1 ring-violet-200"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="charge-method"
                  checked={selected === "card"}
                  onChange={() => setSelected("card")}
                />
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                  <CreditCard className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 text-sm">
                  <span className="block font-medium text-slate-900">
                    {cardMethod?.brand || "Card"}
                  </span>
                  <span className="block text-slate-600">
                    Card ending in {cardMethod?.last4 || "****"}
                  </span>
                </span>
              </label>
            ) : null}
          </div>

          <dl className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Invoice amount</dt>
              <dd className="tabular-nums text-slate-900">{money(breakdown.invoiceAmount)}</dd>
            </div>
            {breakdown.showFee ? (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">
                  {selected === "ach" ? "ACH" : "Card"} processing fee
                  {breakdown.percentLabel ? ` (${breakdown.percentLabel})` : ""}
                </dt>
                <dd className="tabular-nums text-slate-900">{money(breakdown.processingFee)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4 border-t border-slate-200 pt-2">
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
            This immediately{" "}
            {selected === "ach" ? "initiates a bank debit" : "charges the card on file"} — no
            email or link is sent to the customer.{" "}
            {selected === "ach"
              ? "ACH is not instant; it typically takes 3–5 business days to settle, and this invoice will show “ACH processing” until Stripe confirms the debit. The pull can still fail later (insufficient funds, closed account, disputed as unauthorized)."
              : "Card charges resolve almost instantly, but can still be declined."}
          </p>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={() => onConfirm(selected)} disabled={pending}>
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
