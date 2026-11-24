"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { isoDate, toDate } from "@/lib/ar/format";

export type DateRangePreset =
  | "last_7"
  | "last_30"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "this_year"
  | "last_12_months"
  | "all"
  | "custom";

export type PaymentStatus = "all" | "unpaid" | "partial" | "paid" | "overdue";

export type ArFilters = {
  preset: DateRangePreset;
  /** Only meaningful when preset is "custom". */
  from: string;
  to: string;
  /** Customer / partner location id. Empty means all. */
  locationId: string;
  /** Invoice statuses; empty array means all. */
  statuses: string[];
  paymentStatus: PaymentStatus;
  search: string;
};

export const DEFAULT_FILTERS: ArFilters = {
  preset: "last_12_months",
  from: "",
  to: "",
  locationId: "",
  statuses: [],
  paymentStatus: "all",
  search: "",
};

export const DATE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "last_7", label: "Last 7 days" },
  { value: "last_30", label: "Last 30 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "this_quarter", label: "This quarter" },
  { value: "this_year", label: "This year" },
  { value: "last_12_months", label: "Last 12 months" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom range" },
];

export const PAYMENT_STATUSES: { value: PaymentStatus; label: string }[] = [
  { value: "all", label: "Any payment status" },
  { value: "unpaid", label: "Unpaid" },
  { value: "partial", label: "Partially paid" },
  { value: "paid", label: "Paid in full" },
  { value: "overdue", label: "Overdue" },
];

export const INVOICE_STATUS_OPTIONS = [
  "draft",
  "pending_approval",
  "scheduled",
  "sent",
  "viewed",
  "partially_paid",
  "paid",
  "overdue",
  "cancelled",
  "void",
];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

/** Resolves the active preset into concrete boundaries (null = unbounded). */
export function resolveRange(filters: ArFilters, now: Date = new Date()): {
  start: Date | null;
  end: Date | null;
} {
  const today = startOfDay(now);
  switch (filters.preset) {
    case "last_7": {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return { start, end: endOfDay(now) };
    }
    case "last_30": {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      return { start, end: endOfDay(now) };
    }
    case "this_month":
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: endOfDay(now),
      };
    case "last_month":
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    case "this_quarter": {
      const q = Math.floor(now.getMonth() / 3);
      return {
        start: new Date(now.getFullYear(), q * 3, 1),
        end: endOfDay(now),
      };
    }
    case "this_year":
      return { start: new Date(now.getFullYear(), 0, 1), end: endOfDay(now) };
    case "last_12_months": {
      const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      return { start, end: endOfDay(now) };
    }
    case "custom": {
      const start = toDate(filters.from);
      const end = toDate(filters.to);
      return {
        start: start ? startOfDay(start) : null,
        end: end ? endOfDay(end) : null,
      };
    }
    case "all":
    default:
      return { start: null, end: null };
  }
}

/**
 * Equivalent range immediately before the active one, used for the
 * "vs previous period" comparison on KPI cards.
 */
export function previousRange(
  filters: ArFilters,
  now: Date = new Date(),
): { start: Date | null; end: Date | null } {
  const { start, end } = resolveRange(filters, now);
  if (!start || !end) return { start: null, end: null };
  const span = end.getTime() - start.getTime();
  return {
    start: new Date(start.getTime() - span - 1),
    end: new Date(start.getTime() - 1),
  };
}

export function inRange(
  value: unknown,
  range: { start: Date | null; end: Date | null },
): boolean {
  const d = toDate(value);
  if (!d) return range.start == null && range.end == null ? true : false;
  if (range.start && d < range.start) return false;
  if (range.end && d > range.end) return false;
  return true;
}

export function countActiveFilters(f: ArFilters): number {
  let n = 0;
  if (f.preset !== DEFAULT_FILTERS.preset) n += 1;
  if (f.locationId) n += 1;
  if (f.statuses.length) n += 1;
  if (f.paymentStatus !== "all") n += 1;
  if (f.search.trim()) n += 1;
  return n;
}

/* ------------------------------------------------------------- provider */

const STORAGE_KEY = "mokanco_accounts_filters";

type FilterContextValue = {
  filters: ArFilters;
  setFilters: (patch: Partial<ArFilters>) => void;
  reset: () => void;
  range: { start: Date | null; end: Date | null };
  activeCount: number;
};

const FilterContext = createContext<FilterContextValue | null>(null);

function readStored(): ArFilters {
  if (typeof window === "undefined") return DEFAULT_FILTERS;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FILTERS;
    const parsed = JSON.parse(raw) as Partial<ArFilters>;
    return {
      ...DEFAULT_FILTERS,
      ...parsed,
      statuses: Array.isArray(parsed.statuses) ? parsed.statuses : [],
    };
  } catch {
    return DEFAULT_FILTERS;
  }
}

export function ArFilterProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFiltersState] = useState<ArFilters>(DEFAULT_FILTERS);

  // Hydrate after mount so the static export renders deterministic markup.
  useEffect(() => {
    setFiltersState(readStored());
  }, []);

  const setFilters = useCallback((patch: Partial<ArFilters>) => {
    setFiltersState((prev) => {
      const next = { ...prev, ...patch };
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const value = useMemo<FilterContextValue>(
    () => ({
      filters,
      setFilters,
      reset,
      range: resolveRange(filters),
      activeCount: countActiveFilters(filters),
    }),
    [filters, setFilters, reset],
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useArFilters(): FilterContextValue {
  const ctx = useContext(FilterContext);
  if (!ctx) {
    throw new Error("useArFilters must be used inside <ArFilterProvider>");
  }
  return ctx;
}

/** Human summary of the active range, e.g. "Aug 1 – Aug 31, 2026". */
export function describeRange(filters: ArFilters): string {
  const preset = DATE_PRESETS.find((p) => p.value === filters.preset);
  if (filters.preset !== "custom") return preset?.label ?? "All time";
  const from = filters.from ? isoDate(filters.from) : "";
  const to = filters.to ? isoDate(filters.to) : "";
  if (from && to) return `${from} → ${to}`;
  if (from) return `From ${from}`;
  if (to) return `Until ${to}`;
  return "Custom range";
}
