/**
 * Pastel design tokens for the Accounts module.
 * Keeping the palette in one place is what makes KPI cards, badges, and charts
 * feel like a single system rather than a set of unrelated screens.
 */

export type Accent =
  | "blue"
  | "green"
  | "orange"
  | "purple"
  | "red"
  | "teal"
  | "indigo"
  | "slate";

export type AccentStyle = {
  /** Card surface — soft tint. */
  surface: string;
  /** Hairline border matching the tint. */
  border: string;
  /** Icon chip background + foreground. */
  icon: string;
  /** Strong text/number colour. */
  text: string;
  /** Hex used by charts (recharts needs raw colours). */
  hex: string;
  /** Lighter hex for gradient stops and fills. */
  hexSoft: string;
};

export const ACCENTS: Record<Accent, AccentStyle> = {
  blue: {
    surface: "bg-sky-50/70",
    border: "border-sky-200/70",
    icon: "bg-sky-100 text-sky-700",
    text: "text-sky-900",
    hex: "#0284c7",
    hexSoft: "#7dd3fc",
  },
  green: {
    surface: "bg-emerald-50/70",
    border: "border-emerald-200/70",
    icon: "bg-emerald-100 text-emerald-700",
    text: "text-emerald-900",
    hex: "#059669",
    hexSoft: "#6ee7b7",
  },
  orange: {
    surface: "bg-amber-50/70",
    border: "border-amber-200/70",
    icon: "bg-amber-100 text-amber-700",
    text: "text-amber-900",
    hex: "#d97706",
    hexSoft: "#fcd34d",
  },
  purple: {
    surface: "bg-violet-50/70",
    border: "border-violet-200/70",
    icon: "bg-violet-100 text-violet-700",
    text: "text-violet-900",
    hex: "#7c3aed",
    hexSoft: "#c4b5fd",
  },
  red: {
    surface: "bg-rose-50/70",
    border: "border-rose-200/70",
    icon: "bg-rose-100 text-rose-700",
    text: "text-rose-900",
    hex: "#e11d48",
    hexSoft: "#fda4af",
  },
  teal: {
    surface: "bg-teal-50/70",
    border: "border-teal-200/70",
    icon: "bg-teal-100 text-teal-700",
    text: "text-teal-900",
    hex: "#0d9488",
    hexSoft: "#5eead4",
  },
  indigo: {
    surface: "bg-indigo-50/70",
    border: "border-indigo-200/70",
    icon: "bg-indigo-100 text-indigo-700",
    text: "text-indigo-900",
    hex: "#4f46e5",
    hexSoft: "#a5b4fc",
  },
  slate: {
    surface: "bg-slate-50",
    border: "border-slate-200",
    icon: "bg-slate-100 text-slate-600",
    text: "text-slate-900",
    hex: "#475569",
    hexSoft: "#cbd5e1",
  },
};

/** Ordered palette for charts that need N distinct series. */
export const CHART_SERIES: string[] = [
  ACCENTS.blue.hex,
  ACCENTS.green.hex,
  ACCENTS.purple.hex,
  ACCENTS.orange.hex,
  ACCENTS.teal.hex,
  ACCENTS.red.hex,
  ACCENTS.indigo.hex,
  ACCENTS.slate.hex,
];

/* --------------------------------------------------------- status mapping */

export type StatusVariant = {
  label: string;
  className: string;
  /** Accent used when the status drives a chart segment. */
  hex: string;
};

const BADGE = (tone: string) =>
  `inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tone}`;

export const INVOICE_STATUS: Record<string, StatusVariant> = {
  draft: {
    label: "Draft",
    className: BADGE("bg-slate-100 text-slate-700 ring-slate-500/20"),
    hex: "#94a3b8",
  },
  pending_approval: {
    label: "Pending approval",
    className: BADGE("bg-amber-50 text-amber-700 ring-amber-600/20"),
    hex: "#f59e0b",
  },
  scheduled: {
    label: "Scheduled",
    className: BADGE("bg-indigo-50 text-indigo-700 ring-indigo-600/20"),
    hex: "#6366f1",
  },
  sent: {
    label: "Sent",
    className: BADGE("bg-sky-50 text-sky-700 ring-sky-600/20"),
    hex: "#0ea5e9",
  },
  viewed: {
    label: "Viewed",
    className: BADGE("bg-cyan-50 text-cyan-700 ring-cyan-600/20"),
    hex: "#06b6d4",
  },
  partially_paid: {
    label: "Partially paid",
    className: BADGE("bg-teal-50 text-teal-700 ring-teal-600/20"),
    hex: "#14b8a6",
  },
  paid: {
    label: "Paid",
    className: BADGE("bg-emerald-50 text-emerald-700 ring-emerald-600/20"),
    hex: "#10b981",
  },
  overdue: {
    label: "Overdue",
    className: BADGE("bg-rose-50 text-rose-700 ring-rose-600/20"),
    hex: "#f43f5e",
  },
  cancelled: {
    label: "Cancelled",
    className: BADGE("bg-slate-100 text-slate-500 ring-slate-500/20"),
    hex: "#cbd5e1",
  },
  void: {
    label: "Void",
    className: BADGE("bg-slate-100 text-slate-500 ring-slate-500/20"),
    hex: "#e2e8f0",
  },
};

export const FALLBACK_STATUS: StatusVariant = {
  label: "Unknown",
  className: BADGE("bg-slate-100 text-slate-600 ring-slate-500/20"),
  hex: "#cbd5e1",
};

export function invoiceStatus(status: string | undefined | null): StatusVariant {
  if (!status) return FALLBACK_STATUS;
  return (
    INVOICE_STATUS[status] ?? {
      ...FALLBACK_STATUS,
      label: status.replace(/_/g, " "),
    }
  );
}

/** Invoice statuses that still carry a collectable balance. */
export const OPEN_STATUSES = [
  "sent",
  "viewed",
  "partially_paid",
  "overdue",
  "scheduled",
];

/* ------------------------------------------------------- shared class sets */

/** Standard card surface used across every Accounts screen. */
export const CARD =
  "rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.05)]";

/** Grid gap + section rhythm so spacing never drifts between pages. */
export const SECTION_GAP = "space-y-5";
export const GRID_GAP = "gap-4";
