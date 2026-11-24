/**
 * Shared number, currency, and date formatting for the Accounts module.
 * Every monetary value rendered anywhere under /dashboard/ar should go through
 * these helpers so alignment, precision, and colour coding stay consistent.
 */

export type Tone = "positive" | "negative" | "pending" | "neutral";

const currencyCache = new Map<string, Intl.NumberFormat>();

function currencyFormatter(currency: string): Intl.NumberFormat {
  const cached = currencyCache.get(currency);
  if (cached) return cached;
  const fmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  currencyCache.set(currency, fmt);
  return fmt;
}

export function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** `$12,430.00` — always two decimals, never a leading sign. */
export function money(value: unknown, currency = "USD"): string {
  return currencyFormatter(currency).format(Math.abs(toNumber(value)));
}

/** `+$12,430.00` / `-$1,250.00` — explicit sign for deltas and ledger rows. */
export function signedMoney(value: unknown, currency = "USD"): string {
  const n = toNumber(value);
  if (n === 0) return currencyFormatter(currency).format(0);
  return `${n > 0 ? "+" : "-"}${currencyFormatter(currency).format(Math.abs(n))}`;
}

/** `$1.2M` / `$18.4k` — for axis ticks and dense chart labels. */
export function compactMoney(value: unknown, currency = "USD"): string {
  const n = toNumber(value);
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  const symbol = currency === "USD" ? "$" : "";
  if (abs >= 1_000_000) return `${sign}${symbol}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${symbol}${(abs / 1_000).toFixed(1)}k`;
  return `${sign}${symbol}${abs.toFixed(0)}`;
}

export function count(value: unknown): string {
  return new Intl.NumberFormat("en-US").format(Math.round(toNumber(value)));
}

/** `+12.4%` / `-3.0%`. Returns `—` when the change is not computable. */
export function percent(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const n = toNumber(value);
  return `${n > 0 ? "+" : n < 0 ? "-" : ""}${Math.abs(n).toFixed(digits)}%`;
}

/** Plain ratio percentage (no sign), e.g. collection rate `68.2%`. */
export function ratio(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${toNumber(value).toFixed(digits)}%`;
}

/**
 * Percentage change from `previous` to `current`.
 * Returns null when there is no meaningful baseline to compare against.
 */
export function percentChange(
  current: number,
  previous: number,
): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/** Money tone: earned/received is positive, owed/refunded is negative. */
export function toneForAmount(value: unknown): Tone {
  const n = toNumber(value);
  if (n > 0) return "positive";
  if (n < 0) return "negative";
  return "neutral";
}

/** Growth tone where "up is good" (revenue) or "up is bad" (overdue). */
export function toneForChange(
  changePct: number | null | undefined,
  upIsGood = true,
): Tone {
  if (changePct == null || !Number.isFinite(changePct) || changePct === 0) {
    return "neutral";
  }
  const up = changePct > 0;
  return up === upIsGood ? "positive" : "negative";
}

export const TONE_TEXT: Record<Tone, string> = {
  positive: "text-emerald-600",
  negative: "text-rose-600",
  pending: "text-amber-600",
  neutral: "text-slate-600",
};

export const TONE_CHIP: Record<Tone, string> = {
  positive: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  negative: "bg-rose-50 text-rose-700 ring-rose-600/15",
  pending: "bg-amber-50 text-amber-700 ring-amber-600/15",
  neutral: "bg-slate-100 text-slate-600 ring-slate-500/15",
};

/* ------------------------------------------------------------------ dates */

export function toDate(value: unknown): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** `Aug 1, 2026` */
export function shortDate(value: unknown): string {
  const d = toDate(value);
  if (!d) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** `2026-08-01` — for inputs and sortable cells. */
export function isoDate(value: unknown): string {
  const d = toDate(value);
  if (!d) return "";
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
}

/** `Aug 2026` — monthly chart labels. */
export function monthLabel(year?: number, month?: number): string {
  if (!year || !month) return "—";
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function daysBetween(from: unknown, to: unknown): number | null {
  const a = toDate(from);
  const b = toDate(to);
  if (!a || !b) return null;
  const dayA = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const dayB = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((dayB - dayA) / 86_400_000);
}

/** Whole days a due date is past today; negative means still upcoming. */
export function daysPastDue(dueDate: unknown, now: Date = new Date()): number {
  return daysBetween(dueDate, now) ?? 0;
}

export function agingBucket(days: number): "current" | "d30" | "d60" | "d90" | "d90plus" {
  if (days <= 0) return "current";
  if (days <= 30) return "d30";
  if (days <= 60) return "d60";
  if (days <= 90) return "d90";
  return "d90plus";
}

export const AGING_BUCKET_LABEL: Record<string, string> = {
  current: "Current",
  d30: "1–30 days",
  d60: "31–60 days",
  d90: "61–90 days",
  d90plus: "90+ days",
};

/** Turns `partially_paid` into `Partially paid` for labels. */
export function humanize(value: unknown): string {
  const s = String(value ?? "").replace(/[_-]+/g, " ").trim();
  if (!s) return "—";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
