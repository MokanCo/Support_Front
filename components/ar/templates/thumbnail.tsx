"use client";

import type { ArInvoiceBlock } from "@/lib/queries/ar";

const BLOCK_HEIGHT: Record<string, string> = {
  company_header: "h-3 w-[55%]",
  invoice_meta: "h-2.5 w-[35%] ml-auto",
  bill_to: "h-2.5 w-[40%]",
  line_items: "h-6 w-full",
  totals: "h-2.5 w-[30%] ml-auto",
  notes: "h-2 w-[70%]",
  payment_instructions: "h-1.5 w-[60%]",
  terms: "h-1.5 w-[50%]",
  custom_text: "h-2 w-[65%]",
  spacer: "h-1.5 w-full opacity-30",
};

/**
 * Scaled stylised sketch of enabled blocks — enough to tell templates apart
 * without rendering a full invoice.
 */
export function TemplateThumbnail({ blocks }: { blocks: ArInvoiceBlock[] }) {
  const enabled = blocks.filter((b) => b.enabled).slice(0, 8);

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-white p-3">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-white/80 to-transparent" />
      <div className="space-y-1.5">
        {enabled.length === 0 ? (
          <div className="flex h-20 items-center justify-center">
            <span className="text-[10px] font-medium text-slate-400">No blocks</span>
          </div>
        ) : (
          enabled.map((b) => (
            <div
              key={b.id}
              className={`rounded-sm bg-slate-200/90 ${BLOCK_HEIGHT[b.type] ?? "h-2 w-[45%]"}`}
              title={b.label || b.type}
            />
          ))
        )}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent" />
    </div>
  );
}
