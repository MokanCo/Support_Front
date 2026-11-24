import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { ACCENTS, type Accent } from "@/lib/ar/theme";
import { percent, TONE_CHIP, toneForChange } from "@/lib/ar/format";

export type KpiCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: Accent;
  /** Percentage change vs the comparison window; null renders a neutral chip. */
  changePct?: number | null;
  /** Set false for metrics where an increase is bad (overdue, days to pay). */
  upIsGood?: boolean;
  /** Small line under the value, e.g. "vs previous 30 days". */
  comparison?: string;
  /** Optional secondary figure rendered beside the label. */
  hint?: string;
};

export function KpiCard({
  label,
  value,
  icon: Icon,
  accent = "blue",
  changePct = null,
  upIsGood = true,
  comparison,
  hint,
}: KpiCardProps) {
  const style = ACCENTS[accent];
  const tone = toneForChange(changePct, upIsGood);
  const TrendIcon =
    changePct == null || changePct === 0
      ? ArrowRight
      : changePct > 0
        ? ArrowUpRight
        : ArrowDownRight;

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border ${style.border} ${style.surface} p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          {hint ? (
            <p className="mt-0.5 truncate text-[11px] text-slate-400">{hint}</p>
          ) : null}
        </div>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.icon} transition-transform duration-200 group-hover:scale-105`}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>

      <p
        className={`mt-3 truncate text-[22px] font-semibold tabular-nums tracking-tight ${style.text}`}
      >
        {value}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${TONE_CHIP[tone]}`}
        >
          <TrendIcon className="h-3 w-3" />
          {percent(changePct)}
        </span>
        {comparison ? (
          <span className="truncate text-[11px] text-slate-500">{comparison}</span>
        ) : null}
      </div>
    </div>
  );
}

export function KpiCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="h-3 w-24 rounded bg-slate-200" />
        <div className="h-9 w-9 rounded-xl bg-slate-200" />
      </div>
      <div className="mt-4 h-6 w-32 rounded bg-slate-200" />
      <div className="mt-3 h-4 w-20 rounded-full bg-slate-100" />
    </div>
  );
}

export function KpiGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {children}
    </div>
  );
}
