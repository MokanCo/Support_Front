"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchArCredits,
  fetchArInvoices,
  fetchArPayments,
  type ArCredit,
  type ArInvoice,
  type ArPayment,
} from "@/lib/queries/ar";
import {
  agingBucket,
  daysBetween,
  daysPastDue,
  toDate,
  toNumber,
} from "@/lib/ar/format";
import {
  inRange,
  previousRange,
  resolveRange,
  type ArFilters,
} from "@/lib/ar/filters";

/** The list endpoints cap pageSize at 100; page through up to this many rows. */
const PAGE_SIZE = 100;
const MAX_ROWS = 2000;

async function fetchAllPages<T>(
  load: (page: number) => Promise<{ items: T[]; total: number }>,
): Promise<{ items: T[]; truncated: boolean }> {
  const first = await load(1);
  const items = [...first.items];
  const total = Math.min(first.total || items.length, MAX_ROWS);
  let page = 2;
  while (items.length < total && items.length < MAX_ROWS) {
    const next = await load(page);
    if (!next.items.length) break;
    items.push(...next.items);
    page += 1;
  }
  return { items, truncated: (first.total || 0) > MAX_ROWS };
}

export type ArDataset = {
  invoices: ArInvoice[];
  payments: ArPayment[];
  credits: ArCredit[];
  truncated: boolean;
};

const EMPTY: ArDataset = {
  invoices: [],
  payments: [],
  credits: [],
  truncated: false,
};

async function loadDataset(): Promise<ArDataset> {
  const [invoices, payments, credits] = await Promise.all([
    fetchAllPages<ArInvoice>(async (page) => {
      const res = await fetchArInvoices({ page, pageSize: PAGE_SIZE });
      return { items: res.invoices ?? [], total: res.total ?? 0 };
    }),
    fetchAllPages<ArPayment>(async (page) => {
      const res = await fetchArPayments({ page, pageSize: PAGE_SIZE });
      return { items: res.payments ?? [], total: res.total ?? 0 };
    }),
    fetchAllPages<ArCredit>(async (page) => {
      const res = await fetchArCredits({ page, pageSize: PAGE_SIZE });
      return { items: res.credits ?? [], total: res.total ?? 0 };
    }),
  ]);

  return {
    invoices: invoices.items,
    payments: payments.items,
    credits: credits.items,
    truncated: invoices.truncated || payments.truncated || credits.truncated,
  };
}

export const arDatasetQueryKey = ["ar", "dataset"] as const;

/**
 * Single source of truth for the Accounts screens. Every widget filters this
 * dataset client-side, which is what lets one filter bar drive the whole page
 * without changing the existing REST contracts.
 */
export function useArDataset() {
  const query = useQuery({
    queryKey: arDatasetQueryKey,
    queryFn: loadDataset,
    staleTime: 60_000,
  });
  return {
    ...query,
    data: query.data ?? EMPTY,
  };
}

/* --------------------------------------------------------- derived shapes */

export type PaymentState = "unpaid" | "partial" | "paid" | "overdue";

export function paymentStateOf(invoice: ArInvoice, now = new Date()): PaymentState {
  const balance = toNumber(invoice.balanceDue);
  const paid = toNumber(invoice.amountPaid);
  if (balance <= 0 && toNumber(invoice.total) > 0) return "paid";
  const due = toDate(invoice.dueDate);
  if (balance > 0 && due && due < now) return "overdue";
  if (paid > 0) return "partial";
  return "unpaid";
}

function matchesSearch(invoice: ArInvoice, term: string): boolean {
  if (!term) return true;
  const q = term.toLowerCase();
  return (
    invoice.invoiceNumber?.toLowerCase().includes(q) ||
    invoice.locationName?.toLowerCase().includes(q) ||
    invoice.status?.toLowerCase().includes(q) ||
    false
  );
}

export function filterInvoices(
  invoices: ArInvoice[],
  filters: ArFilters,
  now = new Date(),
): ArInvoice[] {
  const range = resolveRange(filters, now);
  return invoices.filter((inv) => {
    if (!inRange(inv.invoiceDate, range)) return false;
    if (filters.locationId && inv.locationId !== filters.locationId) return false;
    if (filters.statuses.length && !filters.statuses.includes(inv.status)) {
      return false;
    }
    if (
      filters.paymentStatus !== "all" &&
      paymentStateOf(inv, now) !== filters.paymentStatus
    ) {
      return false;
    }
    if (!matchesSearch(inv, filters.search.trim())) return false;
    return true;
  });
}

export function filterPayments(
  payments: ArPayment[],
  filters: ArFilters,
  invoices: ArInvoice[],
  now = new Date(),
): ArPayment[] {
  const range = resolveRange(filters, now);
  const locationByInvoice = new Map(
    invoices.map((i) => [i.id, i.locationId] as const),
  );
  const term = filters.search.trim().toLowerCase();
  return payments.filter((p) => {
    if (!inRange(p.paymentDate, range)) return false;
    if (filters.locationId) {
      const loc = p.locationId ?? locationByInvoice.get(p.invoiceId);
      if (loc !== filters.locationId) return false;
    }
    if (term) {
      const hay = `${p.invoiceNumber ?? ""} ${p.locationName ?? ""} ${
        p.transactionReference ?? ""
      }`.toLowerCase();
      if (!hay.includes(term)) return false;
    }
    return true;
  });
}

export function filterCredits(
  credits: ArCredit[],
  filters: ArFilters,
): ArCredit[] {
  const term = filters.search.trim().toLowerCase();
  return credits.filter((c) => {
    if (filters.locationId && c.locationId !== filters.locationId) return false;
    if (term) {
      const hay = `${c.locationName ?? ""} ${c.reason ?? ""} ${
        c.type ?? ""
      }`.toLowerCase();
      if (!hay.includes(term)) return false;
    }
    return true;
  });
}

/* ------------------------------------------------------------- aggregates */

export type InsightMetrics = {
  totalRevenue: number;
  outstanding: number;
  overdue: number;
  currentDue: number;
  collected: number;
  invoicesSent: number;
  invoicesPaid: number;
  pendingPayments: number;
  avgPaymentDays: number | null;
  lateFees: number;
  creditsIssued: number;
  collectionRate: number | null;
};

export function computeMetrics(
  invoices: ArInvoice[],
  payments: ArPayment[],
  credits: ArCredit[],
  now = new Date(),
  allInvoices: ArInvoice[] = invoices,
): InsightMetrics {
  const billable = invoices.filter(
    (i) => !["draft", "cancelled", "void"].includes(i.status),
  );

  const totalRevenue = billable.reduce((s, i) => s + toNumber(i.total), 0);
  const outstanding = billable.reduce((s, i) => s + toNumber(i.balanceDue), 0);
  const overdue = billable
    .filter((i) => paymentStateOf(i, now) === "overdue")
    .reduce((s, i) => s + toNumber(i.balanceDue), 0);
  const collected = payments.reduce((s, p) => s + toNumber(p.amount), 0);

  const paidInvoices = billable.filter((i) => paymentStateOf(i, now) === "paid");

  // Average payment time: days from invoice date to the receipt that settled it.
  const invoiceDateById = new Map(
    allInvoices.map((i) => [i.id, i.invoiceDate] as const),
  );
  const settlementDays = payments
    .map((p) => daysBetween(invoiceDateById.get(p.invoiceId), p.paymentDate))
    .filter((d): d is number => d != null && d >= 0);
  const avgPaymentDays = settlementDays.length
    ? settlementDays.reduce((s, d) => s + d, 0) / settlementDays.length
    : null;

  return {
    totalRevenue,
    outstanding,
    overdue,
    currentDue: Math.max(0, outstanding - overdue),
    collected,
    invoicesSent: billable.length,
    invoicesPaid: paidInvoices.length,
    pendingPayments: billable.filter((i) => toNumber(i.balanceDue) > 0).length,
    avgPaymentDays,
    lateFees: billable.reduce((s, i) => s + toNumber(i.lateFeeAmount), 0),
    creditsIssued: credits.reduce((s, c) => s + toNumber(c.amount), 0),
    collectionRate: totalRevenue > 0 ? (collected / totalRevenue) * 100 : null,
  };
}

/** Metrics for the equivalent window immediately before the active range. */
export function computePreviousMetrics(
  dataset: ArDataset,
  filters: ArFilters,
  now = new Date(),
): InsightMetrics | null {
  const prev = previousRange(filters, now);
  if (!prev.start || !prev.end) return null;
  const shifted: ArFilters = {
    ...filters,
    preset: "custom",
    from: prev.start.toISOString(),
    to: prev.end.toISOString(),
  };
  const invoices = filterInvoices(dataset.invoices, shifted, now);
  const payments = filterPayments(dataset.payments, shifted, dataset.invoices, now);
  const credits = filterCredits(dataset.credits, shifted);
  return computeMetrics(invoices, payments, credits, now, dataset.invoices);
}

export type MonthlyPoint = {
  key: string;
  label: string;
  revenue: number;
  collected: number;
  outstanding: number;
};

export function monthlySeries(
  invoices: ArInvoice[],
  payments: ArPayment[],
  months = 12,
  now = new Date(),
): MonthlyPoint[] {
  const buckets = new Map<string, MonthlyPoint>();
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, {
      key,
      label: d.toLocaleDateString("en-US", { month: "short" }),
      revenue: 0,
      collected: 0,
      outstanding: 0,
    });
  }

  const keyOf = (value: unknown) => {
    const d = toDate(value);
    if (!d) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  for (const inv of invoices) {
    if (["draft", "cancelled", "void"].includes(inv.status)) continue;
    const key = keyOf(inv.invoiceDate);
    const bucket = key ? buckets.get(key) : null;
    if (!bucket) continue;
    bucket.revenue += toNumber(inv.total);
    bucket.outstanding += toNumber(inv.balanceDue);
  }

  for (const p of payments) {
    const key = keyOf(p.paymentDate);
    const bucket = key ? buckets.get(key) : null;
    if (!bucket) continue;
    bucket.collected += toNumber(p.amount);
  }

  return [...buckets.values()];
}

export type AgingRow = {
  bucket: string;
  label: string;
  total: number;
  count: number;
};

export function agingSummary(
  invoices: ArInvoice[],
  now = new Date(),
): AgingRow[] {
  const labels: Record<string, string> = {
    current: "Current",
    d30: "1–30 days",
    d60: "31–60 days",
    d90: "61–90 days",
    d90plus: "90+ days",
  };
  const rows: Record<string, AgingRow> = Object.fromEntries(
    Object.entries(labels).map(([bucket, label]) => [
      bucket,
      { bucket, label, total: 0, count: 0 },
    ]),
  );

  for (const inv of invoices) {
    const balance = toNumber(inv.balanceDue);
    if (balance <= 0) continue;
    if (["draft", "cancelled", "void"].includes(inv.status)) continue;
    const bucket = agingBucket(daysPastDue(inv.dueDate, now));
    rows[bucket].total += balance;
    rows[bucket].count += 1;
  }

  return Object.values(rows);
}

export type BreakdownRow = {
  name: string;
  value: number;
  count: number;
};

export function revenueByCustomer(
  invoices: ArInvoice[],
  limit = 8,
): BreakdownRow[] {
  const map = new Map<string, BreakdownRow>();
  for (const inv of invoices) {
    if (["draft", "cancelled", "void"].includes(inv.status)) continue;
    const name = inv.locationName || "Unassigned";
    const row = map.get(name) ?? { name, value: 0, count: 0 };
    row.value += toNumber(inv.total);
    row.count += 1;
    map.set(name, row);
  }
  return [...map.values()].sort((a, b) => b.value - a.value).slice(0, limit);
}

export function outstandingByCustomer(
  invoices: ArInvoice[],
  limit = 8,
): BreakdownRow[] {
  const map = new Map<string, BreakdownRow>();
  for (const inv of invoices) {
    const balance = toNumber(inv.balanceDue);
    if (balance <= 0) continue;
    if (["draft", "cancelled", "void"].includes(inv.status)) continue;
    const name = inv.locationName || "Unassigned";
    const row = map.get(name) ?? { name, value: 0, count: 0 };
    row.value += balance;
    row.count += 1;
    map.set(name, row);
  }
  return [...map.values()].sort((a, b) => b.value - a.value).slice(0, limit);
}

export function statusDistribution(invoices: ArInvoice[]): BreakdownRow[] {
  const map = new Map<string, BreakdownRow>();
  for (const inv of invoices) {
    const row = map.get(inv.status) ?? { name: inv.status, value: 0, count: 0 };
    row.count += 1;
    row.value += 1;
    map.set(inv.status, row);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

/** Day-of-week × week-of-period grid used by the collections heatmap. */
export function collectionsHeatmap(
  payments: ArPayment[],
  weeks = 12,
  now = new Date(),
): { week: number; day: number; label: string; total: number }[] {
  const cells: { week: number; day: number; label: string; total: number }[] = [];
  const start = new Date(now);
  start.setDate(start.getDate() - (weeks * 7 - 1));
  start.setHours(0, 0, 0, 0);

  const grid = new Map<string, number>();
  for (const p of payments) {
    const d = toDate(p.paymentDate);
    if (!d || d < start) continue;
    const offset = Math.floor((d.getTime() - start.getTime()) / 86_400_000);
    if (offset < 0 || offset >= weeks * 7) continue;
    const week = Math.floor(offset / 7);
    const day = d.getDay();
    const key = `${week}:${day}`;
    grid.set(key, (grid.get(key) ?? 0) + toNumber(p.amount));
  }

  for (let week = 0; week < weeks; week += 1) {
    for (let day = 0; day < 7; day += 1) {
      const cellDate = new Date(start);
      cellDate.setDate(cellDate.getDate() + week * 7 + day);
      cells.push({
        week,
        day,
        label: cellDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        total: grid.get(`${week}:${day}`) ?? 0,
      });
    }
  }
  return cells;
}
