"use client";

import { money } from "@/lib/ar/format";
import type { ArInvoiceBlock } from "@/lib/queries/ar";

const SAMPLE = money(100);

/** Full live preview of enabled invoice template blocks. */
export function TemplatePreview({
  blocks,
  compact = false,
}: {
  blocks: ArInvoiceBlock[];
  compact?: boolean;
}) {
  const enabled = blocks.filter((b) => b.enabled);

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white shadow-sm ${
        compact ? "p-3" : "p-5"
      }`}
    >
      {!compact ? (
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Live preview
        </p>
      ) : null}
      <div
        className={`space-y-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 text-sm text-slate-700 ${
          compact ? "min-h-[200px] p-3" : "min-h-[420px] p-4"
        }`}
      >
        {enabled.length === 0 ? (
          <p className="text-slate-400">Enable or add blocks to preview the invoice.</p>
        ) : null}
        {enabled.map((b) => {
          const align =
            b.align === "center"
              ? "text-center"
              : b.align === "right"
                ? "text-right"
                : "text-left";
          const size = b.fontSize ? { fontSize: `${b.fontSize}px` } : undefined;

          if (b.type === "company_header") {
            return (
              <div key={b.id} className={`space-y-0.5 ${align}`} style={size}>
                <p className="text-lg font-semibold text-slate-900">Your Company</p>
                <p className="text-xs text-slate-500">Address · billing@company.com</p>
              </div>
            );
          }
          if (b.type === "invoice_meta") {
            return (
              <div key={b.id} className={`text-right ${align}`} style={size}>
                <p className="font-semibold">INVOICE</p>
                <p className="text-xs text-slate-500"># INV-2026-000001</p>
                <p className="text-xs text-slate-500">Date / Due</p>
              </div>
            );
          }
          if (b.type === "bill_to") {
            return (
              <div key={b.id} className={align} style={size}>
                <p className="text-xs font-semibold uppercase text-slate-500">Bill To</p>
                <p>Partner Location</p>
                <p className="text-xs text-slate-500">billing@partner.com</p>
              </div>
            );
          }
          if (b.type === "line_items") {
            return (
              <div
                key={b.id}
                className={`rounded-lg border border-slate-200 bg-white p-2 ${align}`}
                style={size}
              >
                <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Items</p>
                <p>Service item × 1 @ {SAMPLE} = {SAMPLE}</p>
              </div>
            );
          }
          if (b.type === "totals") {
            return (
              <div key={b.id} className={`text-right ${align}`} style={size}>
                <p>Subtotal: {SAMPLE}</p>
                <p className="font-semibold">Total: {SAMPLE}</p>
                <p>Balance due: {SAMPLE}</p>
              </div>
            );
          }
          if (b.type === "notes") {
            return (
              <div key={b.id} className={align} style={size}>
                <p className="text-xs font-semibold uppercase text-slate-500">Notes</p>
                <p className="text-slate-500">Invoice notes appear here…</p>
              </div>
            );
          }
          if (b.type === "payment_instructions") {
            return (
              <p key={b.id} className={`text-xs text-slate-500 ${align}`} style={size}>
                Payment instructions from AR settings…
              </p>
            );
          }
          if (b.type === "terms") {
            return (
              <div key={b.id} className={align} style={size}>
                <p className="text-xs font-semibold uppercase text-slate-500">Terms</p>
                <p className="text-xs text-slate-500">Terms & conditions…</p>
              </div>
            );
          }
          if (b.type === "custom_text") {
            return (
              <p key={b.id} className={`whitespace-pre-wrap ${align}`} style={size}>
                {b.content || "Custom text block"}
              </p>
            );
          }
          if (b.type === "spacer") {
            return <div key={b.id} className="h-6" />;
          }
          return (
            <p key={b.id} className={`text-xs text-slate-400 ${align}`} style={size}>
              {b.label || b.type}
            </p>
          );
        })}
      </div>
    </div>
  );
}
