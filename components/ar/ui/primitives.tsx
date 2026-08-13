import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { FileQuestion, Loader2 } from "lucide-react";
import {
  money,
  signedMoney,
  TONE_TEXT,
  toneForAmount,
  type Tone,
} from "@/lib/ar/format";
import { invoiceStatus } from "@/lib/ar/theme";

/* ------------------------------------------------------------ money cells */

/**
 * Right-aligned, tabular monetary figure. Amounts stay column-aligned because
 * the whole module uses `tabular-nums` and a fixed two-decimal format.
 */
export function Money({
  value,
  currency = "USD",
  signed = false,
  tone,
  className = "",
}: {
  value: number | null | undefined;
  currency?: string;
  signed?: boolean;
  /** Override the automatic sign-based tone (e.g. force "pending"). */
  tone?: Tone;
  className?: string;
}) {
  const resolved = tone ?? (signed ? toneForAmount(value) : "neutral");
  const text = signed ? signedMoney(value, currency) : money(value, currency);
  return (
    <span
      className={`tabular-nums font-medium ${TONE_TEXT[resolved]} ${className}`}
    >
      {text}
    </span>
  );
}

/** Neutral dark figure for totals where colour would add noise. */
export function Amount({
  value,
  currency = "USD",
  className = "",
}: {
  value: number | null | undefined;
  currency?: string;
  className?: string;
}) {
  return (
    <span className={`tabular-nums font-medium text-slate-900 ${className}`}>
      {money(value, currency)}
    </span>
  );
}

/* ---------------------------------------------------------------- badges */

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const variant = invoiceStatus(status);
  return (
    <span className={variant.className}>
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: variant.hex }}
      />
      {variant.label}
    </span>
  );
}

export function Chip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  const map: Record<Tone, string> = {
    positive: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
    negative: "bg-rose-50 text-rose-700 ring-rose-600/15",
    pending: "bg-amber-50 text-amber-700 ring-amber-600/15",
    neutral: "bg-slate-100 text-slate-600 ring-slate-500/15",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${map[tone]}`}
    >
      {children}
    </span>
  );
}

/* ----------------------------------------------------------- page states */

export function EmptyState({
  title,
  description,
  icon: Icon = FileQuestion,
  action,
  compact = false,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? "px-4 py-8" : "px-6 py-14"
      }`}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-4 text-sm font-semibold text-slate-900">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50/60 px-5 py-4">
      <p className="text-sm font-medium text-rose-800">
        Something went wrong loading this view
      </p>
      <p className="mt-1 text-sm text-rose-700">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200 transition hover:bg-rose-50"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function InlineSpinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-slate-500">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label ?? "Loading…"}
    </span>
  );
}

/* -------------------------------------------------------------- skeletons */

export function SkeletonRows({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-slate-100">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex animate-pulse items-center gap-4 px-5 py-3.5">
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className="h-3 rounded bg-slate-200"
              style={{ width: c === 0 ? "22%" : `${Math.max(10, 60 / cols)}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart({ height = 260 }: { height?: number }) {
  return (
    <div
      className="flex animate-pulse items-end gap-2 rounded-xl bg-slate-50 p-4"
      style={{ height }}
    >
      {[45, 70, 55, 85, 60, 95, 72, 50, 80, 65].map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-lg bg-slate-200"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ misc bits */

/** Thin horizontal progress meter used for collection / aging summaries. */
export function ProgressBar({
  value,
  max,
  color = "#0284c7",
  className = "",
}: {
  value: number;
  max: number;
  color?: string;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-slate-100 ${className}`}>
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}
