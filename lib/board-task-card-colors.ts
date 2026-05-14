export const BOARD_TASK_CARD_COLOR_IDS = [
  "gray",
  "sky",
  "amber",
  "emerald",
  "violet",
  "rose",
  "orange",
] as const;

export type BoardTaskCardColorId = (typeof BOARD_TASK_CARD_COLOR_IDS)[number];

export function isBoardTaskCardColorId(v: string): v is BoardTaskCardColorId {
  return (BOARD_TASK_CARD_COLOR_IDS as readonly string[]).includes(v);
}

/** Left accent + progress fill (reference-style bar). */
export const boardTaskCardAccent: Record<
  BoardTaskCardColorId,
  { borderL: string; progressFill: string; swatch: string }
> = {
  gray: {
    borderL: "border-l-4 border-l-slate-400",
    progressFill: "bg-slate-500",
    swatch: "bg-slate-400",
  },
  sky: {
    borderL: "border-l-4 border-l-sky-500",
    progressFill: "bg-sky-500",
    swatch: "bg-sky-500",
  },
  amber: {
    borderL: "border-l-4 border-l-amber-500",
    progressFill: "bg-amber-500",
    swatch: "bg-amber-500",
  },
  emerald: {
    borderL: "border-l-4 border-l-emerald-500",
    progressFill: "bg-emerald-500",
    swatch: "bg-emerald-500",
  },
  violet: {
    borderL: "border-l-4 border-l-violet-500",
    progressFill: "bg-violet-500",
    swatch: "bg-violet-500",
  },
  rose: {
    borderL: "border-l-4 border-l-rose-500",
    progressFill: "bg-rose-500",
    swatch: "bg-rose-500",
  },
  orange: {
    borderL: "border-l-4 border-l-orange-500",
    progressFill: "bg-orange-500",
    swatch: "bg-orange-500",
  },
};

export function normalizeCardColorId(v: string | undefined | null): BoardTaskCardColorId {
  if (v && isBoardTaskCardColorId(v)) return v;
  return "gray";
}

export function clampProgress(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}
