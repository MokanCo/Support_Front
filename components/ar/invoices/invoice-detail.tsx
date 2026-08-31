"use client";

import Link from "next/link";
import { Landmark, Loader2 } from "lucide-react";
import { Amount, Chip, Money, StatusBadge } from "@/components/ar/ui/primitives";
import { Button } from "@/components/ui/Button";
import { daysPastDue, humanize, shortDate, toNumber } from "@/lib/ar/format";
import type { ArAchPaymentMethod, ArInvoice } from "@/lib/queries/ar";
import { publicInvoicePayHref } from "@/lib/queries/public-invoice";

type PendingAction = "approve" | "send" | "duplicate" | "cancel" | null;

type Props = {
  invoice: ArInvoice;
  canManage: boolean;
  /** Which action, if any, is currently in flight — drives per-button
   *  spinner/text so the user can tell exactly what's processing. */
  pendingAction?: PendingAction;
  downloading?: boolean;
  /** Customer's saved ACH bank account, if any — drives the "Charge saved
   *  ACH" button and its confirmation copy. */
  achMethod?: ArAchPaymentMethod | null;
  chargingAch?: boolean;
  onDownload: () => void;
  onApprove: () => void;
  onSend: () => void;
  onDuplicate: () => void;
  onCancel: () => void;
  onChargeAch?: () => void;
};

export function InvoiceDetail({
  invoice,
  canManage,
  pendingAction = null,
  downloading = false,
  achMethod = null,
  chargingAch = false,
  onDownload,
  onApprove,
  onSend,
  onDuplicate,
  onCancel,
  onChargeAch,
}: Props) {
  const busy = Boolean(pendingAction);
  const balance = toNumber(invoice.balanceDue);
  const overdueDays =
    balance > 0 && !["draft", "cancelled", "void", "paid"].includes(invoice.status)
      ? daysPastDue(invoice.dueDate)
      : 0;
  const publicHref = invoice.publicPaymentToken
    ? publicInvoicePayHref(invoice.publicPaymentToken)
    : null;
  const showPayNow =
    Boolean(publicHref) &&
    balance > 0 &&
    !["draft", "cancelled", "void", "paid"].includes(invoice.status);
  const achAvailable =
    achMethod?.status === "active" &&
    balance > 0 &&
    invoice.achCharge?.status !== "processing" &&
    !["draft", "cancelled", "void", "paid"].includes(invoice.status);

  const summaryRows: { label: string; value: number | undefined; tone?: "pending" | "positive" }[] =
    [
      { label: "Subtotal", value: invoice.subtotal },
      { label: "Tax", value: invoice.taxAmount },
      { label: "Discount", value: invoice.discountAmount },
      { label: "Late fee", value: invoice.lateFeeAmount },
      { label: "Credit applied", value: invoice.creditApplied },
      { label: "Total", value: invoice.total },
      { label: "Paid", value: invoice.amountPaid, tone: "positive" },
      {
        label: "Balance",
        value: invoice.balanceDue,
        tone: balance > 0 ? "pending" : undefined,
      },
    ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={invoice.status} />
            {overdueDays > 0 ? (
              <span className="text-xs font-medium text-rose-600">
                {overdueDays} day{overdueDays === 1 ? "" : "s"} overdue
              </span>
            ) : null}
            {invoice.achCharge?.status === "processing" ? (
              <Chip tone="pending">ACH processing</Chip>
            ) : invoice.achCharge?.status === "failed" ? (
              <Chip tone="negative">
                {invoice.achCharge.failureReason
                  ? `ACH failed · ${invoice.achCharge.failureReason}`
                  : "ACH failed"}
              </Chip>
            ) : null}
          </div>
          <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <div className="flex gap-2">
              <dt className="text-slate-500">Customer</dt>
              <dd className="font-medium text-slate-900">
                {invoice.locationName ?? invoice.locationId}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-slate-500">Issued</dt>
              <dd className="font-medium text-slate-900">
                {shortDate(invoice.invoiceDate)}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-slate-500">Due</dt>
              <dd className="font-medium text-slate-900">
                {shortDate(invoice.dueDate)}
              </dd>
            </div>
          </dl>
        </div>
        <div className="flex flex-wrap gap-2">
          {showPayNow && publicHref ? (
            <Link href={publicHref} target="_blank" rel="noreferrer">
              <Button size="sm">Pay now</Button>
            </Link>
          ) : null}
          {publicHref && !showPayNow ? (
            <Link href={publicHref} target="_blank" rel="noreferrer">
              <Button size="sm" variant="secondary">
                View invoice
              </Button>
            </Link>
          ) : null}
          <Button
            size="sm"
            variant="secondary"
            disabled={downloading}
            onClick={onDownload}
          >
            {downloading ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Downloading…
              </>
            ) : (
              "Download PDF"
            )}
          </Button>
          {canManage && achAvailable && onChargeAch ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={busy || chargingAch}
              onClick={onChargeAch}
            >
              {chargingAch ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Charging…
                </>
              ) : (
                <>
                  <Landmark className="mr-1.5 h-3.5 w-3.5" /> Charge saved ACH
                </>
              )}
            </Button>
          ) : null}
          {canManage ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={onApprove}
              >
                {pendingAction === "approve" ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Approving…
                  </>
                ) : (
                  "Approve"
                )}
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={onSend}>
                {pendingAction === "send" ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Sending…
                  </>
                ) : (
                  "Send"
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={onDuplicate}
              >
                {pendingAction === "duplicate" ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Duplicating…
                  </>
                ) : (
                  "Duplicate"
                )}
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={busy}
                onClick={onCancel}
              >
                {pendingAction === "cancel" ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Cancelling…
                  </>
                ) : (
                  "Cancel"
                )}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
        <div className="min-w-0 space-y-6">
          {invoice.items?.length ? (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2.5">Item</th>
                    <th className="px-4 py-2.5 text-right">Qty</th>
                    <th className="px-4 py-2.5 text-right">Price</th>
                    <th className="px-4 py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, i) => (
                    <tr key={i} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-2.5 text-slate-800">{item.name}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Amount value={item.unitPrice} />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Amount
                          value={
                            item.lineTotal ?? item.quantity * item.unitPrice
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No line items on this invoice.</p>
          )}

          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Timeline</h3>
            {invoice.timeline?.length ? (
              <ol className="relative space-y-0 border-l border-slate-200 pl-5">
                {invoice.timeline.map((ev, i) => (
                  <li key={i} className="relative pb-5 last:pb-0">
                    <span className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-400 ring-1 ring-slate-200" />
                    <p className="text-sm font-medium text-slate-900">
                      {ev.title || humanize(ev.eventType)}
                    </p>
                    {ev.description ? (
                      <p className="mt-0.5 text-sm text-slate-600">
                        {ev.description}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-slate-400">
                      {[ev.userName, shortDate(ev.createdAt)]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-slate-500">No timeline events.</p>
            )}
          </div>
        </div>

        <aside className="h-fit rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Summary
          </p>
          <dl className="space-y-2.5 text-sm">
            {summaryRows.map((row) => (
              <div
                key={row.label}
                className={`flex items-center justify-between gap-3 ${
                  row.label === "Total" || row.label === "Balance"
                    ? "border-t border-slate-200 pt-2.5 font-semibold"
                    : ""
                }`}
              >
                <dt className="text-slate-500">{row.label}</dt>
                <dd className="text-right">
                  {row.tone ? (
                    <Money value={row.value} tone={row.tone} />
                  ) : (
                    <Amount value={row.value} />
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </div>
  );
}
