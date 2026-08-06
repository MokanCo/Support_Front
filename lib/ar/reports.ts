import type { LucideIcon } from "lucide-react";
import {
  AlarmClock,
  BadgePercent,
  Building2,
  CircleDollarSign,
  Clock3,
  FileText,
  Layers,
  MapPin,
  Receipt,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import type { ArCredit, ArInvoice, ArPayment } from "@/lib/queries/ar";
import type { LocationRow } from "@/lib/queries/locations";
import {
  agingBucket,
  count,
  daysBetween,
  daysPastDue,
  money,
  ratio,
  toDate,
  toNumber,
} from "@/lib/ar/format";
import { invoiceStatus, type Accent } from "@/lib/ar/theme";
import { paymentStateOf } from "@/lib/ar/dataset";

export type ReportColumnKind =
  | "text"
  | "money"
  | "date"
  | "number"
  | "percent"
  | "status"
  | "days";

export type ReportColumn = {
  id: string;
  header: string;
  kind: ReportColumnKind;
  align?: "left" | "right" | "center";
  defaultHidden?: boolean;
};

export type ReportRow = Record<string, string | number | null | undefined>;

export type ReportSummary = {
  label: string;
  value: string;
  accent: Accent;
  icon: LucideIcon;
  hint?: string;
};

type TrendChart<K extends "area" | "bar"> = {
  type: K;
  data: Record<string, string | number>[];
  xKey: string;
  series: { key: string; label: string; color: string }[];
  stacked?: boolean;
};

export type ReportChart =
  | TrendChart<"area">
  | TrendChart<"bar">
  | { type: "hbar"; data: { name: string; value: number }[]; color?: string }
  | { type: "donut"; data: { name: string; value: number; color?: string }[] }
  | { type: "treemap"; data: { name: string; value: number }[] }
  | null;

export type ReportResult = {
  summary: ReportSummary[];
  chartTitle: string;
  chart: ReportChart;
  columns: ReportColumn[];
  rows: ReportRow[];
};

export type ReportDefinition = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  accent: Accent;
  /** Matching backend report type, when one exists, for a server-side CSV. */
  serverType?: string;
};

export const REPORTS: ReportDefinition[] = [
  {
    id: "revenue",
    label: "Revenue",
    description: "Invoiced value by month with collections alongside",
    icon: TrendingUp,
    accent: "blue",
    serverType: "monthly_revenue",
  },
  {
    id: "invoice_summary",
    label: "Invoice summary",
    description: "Every invoice with totals, payments, and balance",
    icon: FileText,
    accent: "indigo",
    serverType: "invoice_register",
  },
  {
    id: "collections",
    label: "Collections",
    description: "Cash received by month and collection rate",
    icon: CircleDollarSign,
    accent: "green",
    serverType: "monthly_collections",
  },
  {
    id: "receivable_aging",
    label: "Receivable aging",
    description: "Open balance split by how far past due it is",
    icon: Layers,
    accent: "orange",
    serverType: "invoice_aging",
  },
  {
    id: "payment_history",
    label: "Payment history",
    description: "Individual receipts with method and reference",
    icon: Wallet,
    accent: "teal",
    serverType: "payment_register",
  },
  {
    id: "customer_balance",
    label: "Customer balance",
    description: "Invoiced, paid, and outstanding per customer",
    icon: Users,
    accent: "purple",
    serverType: "outstanding_balance",
  },
  {
    id: "partner_revenue",
    label: "Partner revenue",
    description: "Revenue contribution ranked by partner",
    icon: Building2,
    accent: "blue",
  },
  {
    id: "location_revenue",
    label: "Location revenue",
    description: "Revenue grouped by the partner's state and city",
    icon: MapPin,
    accent: "teal",
  },
  {
    id: "late_payments",
    label: "Late payments",
    description: "Overdue invoices with days late and late fees",
    icon: AlarmClock,
    accent: "red",
    serverType: "late_fees",
  },
  {
    id: "tax_summary",
    label: "Tax summary",
    description: "Taxable base and tax charged by month",
    icon: Receipt,
    accent: "slate",
  },
];

export type ReportContext = {
  invoices: ArInvoice[];
  payments: ArPayment[];
  credits: ArCredit[];
  locations: LocationRow[];
  now: Date;
};

const BILLABLE_EXCLUDED = ["draft", "cancelled", "void"];

function billable(invoices: ArInvoice[]): ArInvoice[] {
  return invoices.filter((i) => !BILLABLE_EXCLUDED.includes(i.status));
}

function monthKey(value: unknown): string | null {
  const d = toDate(value);
  if (!d) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthName(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function sortedMonthKeys(...groups: Set<string>[]): string[] {
  const all = new Set<string>();
  for (const group of groups) for (const key of group) all.add(key);
  return [...all].sort();
}

const COLORS = {
  invoiced: "#0284c7",
  collected: "#059669",
  outstanding: "#d97706",
  overdue: "#e11d48",
  tax: "#7c3aed",
};

/* --------------------------------------------------------------- builders */

function revenueReport(ctx: ReportContext): ReportResult {
  const invoices = billable(ctx.invoices);
  const invoiceMonths = new Map<string, { invoiced: number; count: number; outstanding: number }>();
  const paymentMonths = new Map<string, number>();

  for (const inv of invoices) {
    const key = monthKey(inv.invoiceDate);
    if (!key) continue;
    const row = invoiceMonths.get(key) ?? { invoiced: 0, count: 0, outstanding: 0 };
    row.invoiced += toNumber(inv.total);
    row.outstanding += toNumber(inv.balanceDue);
    row.count += 1;
    invoiceMonths.set(key, row);
  }
  for (const p of ctx.payments) {
    const key = monthKey(p.paymentDate);
    if (!key) continue;
    paymentMonths.set(key, (paymentMonths.get(key) ?? 0) + toNumber(p.amount));
  }

  const keys = sortedMonthKeys(
    new Set(invoiceMonths.keys()),
    new Set(paymentMonths.keys()),
  );

  const rows: ReportRow[] = keys.map((key) => {
    const inv = invoiceMonths.get(key) ?? { invoiced: 0, count: 0, outstanding: 0 };
    const collected = paymentMonths.get(key) ?? 0;
    return {
      period: monthName(key),
      invoices: inv.count,
      invoiced: inv.invoiced,
      collected,
      outstanding: inv.outstanding,
      collectionRate: inv.invoiced > 0 ? (collected / inv.invoiced) * 100 : 0,
    };
  });

  const totalInvoiced = rows.reduce((s, r) => s + Number(r.invoiced), 0);
  const totalCollected = rows.reduce((s, r) => s + Number(r.collected), 0);
  const best = [...rows].sort((a, b) => Number(b.invoiced) - Number(a.invoiced))[0];

  return {
    summary: [
      {
        label: "Total invoiced",
        value: money(totalInvoiced),
        accent: "blue",
        icon: TrendingUp,
      },
      {
        label: "Total collected",
        value: money(totalCollected),
        accent: "green",
        icon: CircleDollarSign,
      },
      {
        label: "Average per month",
        value: money(rows.length ? totalInvoiced / rows.length : 0),
        accent: "indigo",
        icon: Layers,
      },
      {
        label: "Strongest month",
        value: best ? String(best.period) : "—",
        accent: "purple",
        icon: BadgePercent,
        hint: best ? money(best.invoiced) : undefined,
      },
    ],
    chartTitle: "Invoiced vs collected by month",
    chart: {
      type: "area",
      xKey: "period",
      data: rows as unknown as Record<string, string | number>[],
      series: [
        { key: "invoiced", label: "Invoiced", color: COLORS.invoiced },
        { key: "collected", label: "Collected", color: COLORS.collected },
      ],
    },
    columns: [
      { id: "period", header: "Period", kind: "text" },
      { id: "invoices", header: "Invoices", kind: "number", align: "right" },
      { id: "invoiced", header: "Invoiced", kind: "money", align: "right" },
      { id: "collected", header: "Collected", kind: "money", align: "right" },
      { id: "outstanding", header: "Outstanding", kind: "money", align: "right" },
      { id: "collectionRate", header: "Collection rate", kind: "percent", align: "right" },
    ],
    rows,
  };
}

function invoiceSummaryReport(ctx: ReportContext): ReportResult {
  const rows: ReportRow[] = ctx.invoices.map((inv) => ({
    invoiceNumber: inv.invoiceNumber,
    customer: inv.locationName || "Unassigned",
    invoiceDate: inv.invoiceDate ?? null,
    dueDate: inv.dueDate ?? null,
    status: inv.status,
    subtotal: toNumber(inv.subtotal),
    tax: toNumber(inv.taxAmount),
    total: toNumber(inv.total),
    amountPaid: toNumber(inv.amountPaid),
    balanceDue: toNumber(inv.balanceDue),
  }));

  const statusCounts = new Map<string, number>();
  for (const inv of ctx.invoices) {
    statusCounts.set(inv.status, (statusCounts.get(inv.status) ?? 0) + 1);
  }

  const totals = rows.reduce(
    (acc: { total: number; paid: number; balance: number }, r) => ({
      total: acc.total + Number(r.total),
      paid: acc.paid + Number(r.amountPaid),
      balance: acc.balance + Number(r.balanceDue),
    }),
    { total: 0, paid: 0, balance: 0 },
  );

  return {
    summary: [
      { label: "Invoices", value: count(rows.length), accent: "indigo", icon: FileText },
      { label: "Invoiced value", value: money(totals.total), accent: "blue", icon: TrendingUp },
      { label: "Paid", value: money(totals.paid), accent: "green", icon: CircleDollarSign },
      { label: "Balance due", value: money(totals.balance), accent: "orange", icon: Wallet },
    ],
    chartTitle: "Invoices by status",
    chart: {
      type: "donut",
      data: [...statusCounts.entries()].map(([status, n]) => ({
        name: invoiceStatus(status).label,
        value: n,
        color: invoiceStatus(status).hex,
      })),
    },
    columns: [
      { id: "invoiceNumber", header: "Invoice", kind: "text" },
      { id: "customer", header: "Customer", kind: "text" },
      { id: "invoiceDate", header: "Issued", kind: "date" },
      { id: "dueDate", header: "Due", kind: "date" },
      { id: "status", header: "Status", kind: "status" },
      { id: "subtotal", header: "Subtotal", kind: "money", align: "right", defaultHidden: true },
      { id: "tax", header: "Tax", kind: "money", align: "right", defaultHidden: true },
      { id: "total", header: "Total", kind: "money", align: "right" },
      { id: "amountPaid", header: "Paid", kind: "money", align: "right" },
      { id: "balanceDue", header: "Balance", kind: "money", align: "right" },
    ],
    rows,
  };
}

function collectionsReport(ctx: ReportContext): ReportResult {
  const months = new Map<string, { collected: number; payments: number }>();
  for (const p of ctx.payments) {
    const key = monthKey(p.paymentDate);
    if (!key) continue;
    const row = months.get(key) ?? { collected: 0, payments: 0 };
    row.collected += toNumber(p.amount);
    row.payments += 1;
    months.set(key, row);
  }

  const rows: ReportRow[] = sortedMonthKeys(new Set(months.keys())).map((key) => {
    const row = months.get(key)!;
    return {
      period: monthName(key),
      payments: row.payments,
      collected: row.collected,
      average: row.payments > 0 ? row.collected / row.payments : 0,
    };
  });

  const totalCollected = rows.reduce((s, r) => s + Number(r.collected), 0);
  const totalPayments = rows.reduce((s, r) => s + Number(r.payments), 0);
  const invoiced = billable(ctx.invoices).reduce((s, i) => s + toNumber(i.total), 0);

  return {
    summary: [
      {
        label: "Total collected",
        value: money(totalCollected),
        accent: "green",
        icon: CircleDollarSign,
      },
      { label: "Payments", value: count(totalPayments), accent: "blue", icon: Wallet },
      {
        label: "Average payment",
        value: money(totalPayments ? totalCollected / totalPayments : 0),
        accent: "teal",
        icon: Layers,
      },
      {
        label: "Collection rate",
        value: ratio(invoiced > 0 ? (totalCollected / invoiced) * 100 : 0),
        accent: "purple",
        icon: BadgePercent,
      },
    ],
    chartTitle: "Cash collected by month",
    chart: {
      type: "bar",
      xKey: "period",
      data: rows as unknown as Record<string, string | number>[],
      series: [{ key: "collected", label: "Collected", color: COLORS.collected }],
    },
    columns: [
      { id: "period", header: "Period", kind: "text" },
      { id: "payments", header: "Payments", kind: "number", align: "right" },
      { id: "collected", header: "Collected", kind: "money", align: "right" },
      { id: "average", header: "Average", kind: "money", align: "right" },
    ],
    rows,
  };
}

function agingReport(ctx: ReportContext): ReportResult {
  const labels: Record<string, string> = {
    current: "Current",
    d30: "1–30 days",
    d60: "31–60 days",
    d90: "61–90 days",
    d90plus: "90+ days",
  };
  const buckets = new Map<string, { amount: number; invoices: number }>(
    Object.keys(labels).map((k) => [k, { amount: 0, invoices: 0 }]),
  );

  for (const inv of billable(ctx.invoices)) {
    const balance = toNumber(inv.balanceDue);
    if (balance <= 0) continue;
    const key = agingBucket(daysPastDue(inv.dueDate, ctx.now));
    const row = buckets.get(key)!;
    row.amount += balance;
    row.invoices += 1;
  }

  const total = [...buckets.values()].reduce((s, b) => s + b.amount, 0);
  const rows: ReportRow[] = [...buckets.entries()].map(([key, value]) => ({
    bucket: labels[key],
    invoices: value.invoices,
    amount: value.amount,
    share: total > 0 ? (value.amount / total) * 100 : 0,
  }));

  const overdue = rows
    .filter((r) => r.bucket !== "Current")
    .reduce((s, r) => s + Number(r.amount), 0);

  return {
    summary: [
      { label: "Total outstanding", value: money(total), accent: "orange", icon: Wallet },
      { label: "Overdue", value: money(overdue), accent: "red", icon: AlarmClock },
      {
        label: "Current",
        value: money(total - overdue),
        accent: "green",
        icon: CircleDollarSign,
      },
      {
        label: "Overdue share",
        value: ratio(total > 0 ? (overdue / total) * 100 : 0),
        accent: "purple",
        icon: BadgePercent,
      },
    ],
    chartTitle: "Balance by aging bucket",
    chart: {
      type: "hbar",
      data: rows.map((r) => ({ name: String(r.bucket), value: Number(r.amount) })),
      color: COLORS.outstanding,
    },
    columns: [
      { id: "bucket", header: "Aging bucket", kind: "text" },
      { id: "invoices", header: "Invoices", kind: "number", align: "right" },
      { id: "amount", header: "Balance due", kind: "money", align: "right" },
      { id: "share", header: "Share", kind: "percent", align: "right" },
    ],
    rows,
  };
}

function paymentHistoryReport(ctx: ReportContext): ReportResult {
  const invoiceDates = new Map(
    ctx.invoices.map((i) => [i.id, i.invoiceDate] as const),
  );

  const rows: ReportRow[] = ctx.payments.map((p) => ({
    paymentDate: p.paymentDate ?? null,
    invoiceNumber: p.invoiceNumber ?? "—",
    customer: p.locationName || "Unassigned",
    method: p.paymentMethod ?? "—",
    reference: p.transactionReference ?? "—",
    daysToPay: daysBetween(invoiceDates.get(p.invoiceId), p.paymentDate) ?? null,
    amount: toNumber(p.amount),
  }));

  const total = rows.reduce((s, r) => s + Number(r.amount), 0);
  const withDays = rows.filter((r) => r.daysToPay != null);
  const avgDays = withDays.length
    ? withDays.reduce((s, r) => s + Number(r.daysToPay), 0) / withDays.length
    : null;

  const months = new Map<string, number>();
  for (const p of ctx.payments) {
    const key = monthKey(p.paymentDate);
    if (!key) continue;
    months.set(key, (months.get(key) ?? 0) + toNumber(p.amount));
  }

  return {
    summary: [
      { label: "Payments", value: count(rows.length), accent: "blue", icon: Wallet },
      { label: "Total received", value: money(total), accent: "green", icon: CircleDollarSign },
      {
        label: "Average payment",
        value: money(rows.length ? total / rows.length : 0),
        accent: "teal",
        icon: Layers,
      },
      {
        label: "Average days to pay",
        value: avgDays == null ? "—" : `${avgDays.toFixed(1)} days`,
        accent: "purple",
        icon: Clock3,
      },
    ],
    chartTitle: "Receipts by month",
    chart: {
      type: "area",
      xKey: "period",
      data: sortedMonthKeys(new Set(months.keys())).map((key) => ({
        period: monthName(key),
        collected: months.get(key) ?? 0,
      })),
      series: [{ key: "collected", label: "Received", color: COLORS.collected }],
    },
    columns: [
      { id: "paymentDate", header: "Date", kind: "date" },
      { id: "invoiceNumber", header: "Invoice", kind: "text" },
      { id: "customer", header: "Customer", kind: "text" },
      { id: "method", header: "Method", kind: "text" },
      { id: "reference", header: "Reference", kind: "text", defaultHidden: true },
      { id: "daysToPay", header: "Days to pay", kind: "days", align: "right" },
      { id: "amount", header: "Amount", kind: "money", align: "right" },
    ],
    rows,
  };
}

function customerBalanceReport(ctx: ReportContext): ReportResult {
  type Bucket = {
    customer: string;
    invoices: number;
    invoiced: number;
    paid: number;
    outstanding: number;
    overdue: number;
  };
  const map = new Map<string, Bucket>();

  for (const inv of billable(ctx.invoices)) {
    const name = inv.locationName || "Unassigned";
    const row =
      map.get(name) ??
      { customer: name, invoices: 0, invoiced: 0, paid: 0, outstanding: 0, overdue: 0 };
    row.invoices += 1;
    row.invoiced += toNumber(inv.total);
    row.paid += toNumber(inv.amountPaid);
    row.outstanding += toNumber(inv.balanceDue);
    if (paymentStateOf(inv, ctx.now) === "overdue") {
      row.overdue += toNumber(inv.balanceDue);
    }
    map.set(name, row);
  }

  const rows: ReportRow[] = [...map.values()]
    .sort((a, b) => b.outstanding - a.outstanding)
    .map((r) => ({ ...r }));

  const totals = rows.reduce(
    (acc: { invoiced: number; outstanding: number; overdue: number }, r) => ({
      invoiced: acc.invoiced + Number(r.invoiced),
      outstanding: acc.outstanding + Number(r.outstanding),
      overdue: acc.overdue + Number(r.overdue),
    }),
    { invoiced: 0, outstanding: 0, overdue: 0 },
  );

  return {
    summary: [
      { label: "Customers", value: count(rows.length), accent: "purple", icon: Users },
      { label: "Invoiced", value: money(totals.invoiced), accent: "blue", icon: TrendingUp },
      { label: "Outstanding", value: money(totals.outstanding), accent: "orange", icon: Wallet },
      { label: "Overdue", value: money(totals.overdue), accent: "red", icon: AlarmClock },
    ],
    chartTitle: "Outstanding balance by customer",
    chart: {
      type: "hbar",
      data: rows.slice(0, 10).map((r) => ({
        name: String(r.customer),
        value: Number(r.outstanding),
      })),
      color: COLORS.outstanding,
    },
    columns: [
      { id: "customer", header: "Customer", kind: "text" },
      { id: "invoices", header: "Invoices", kind: "number", align: "right" },
      { id: "invoiced", header: "Invoiced", kind: "money", align: "right" },
      { id: "paid", header: "Paid", kind: "money", align: "right" },
      { id: "outstanding", header: "Outstanding", kind: "money", align: "right" },
      { id: "overdue", header: "Overdue", kind: "money", align: "right" },
    ],
    rows,
  };
}

function partnerRevenueReport(ctx: ReportContext): ReportResult {
  const map = new Map<string, { partner: string; invoices: number; revenue: number }>();
  for (const inv of billable(ctx.invoices)) {
    const name = inv.locationName || "Unassigned";
    const row = map.get(name) ?? { partner: name, invoices: 0, revenue: 0 };
    row.invoices += 1;
    row.revenue += toNumber(inv.total);
    map.set(name, row);
  }

  const ranked = [...map.values()].sort((a, b) => b.revenue - a.revenue);
  const total = ranked.reduce((s, r) => s + r.revenue, 0);
  const rows: ReportRow[] = ranked.map((r) => ({
    ...r,
    average: r.invoices > 0 ? r.revenue / r.invoices : 0,
    share: total > 0 ? (r.revenue / total) * 100 : 0,
  }));

  return {
    summary: [
      { label: "Partners billed", value: count(rows.length), accent: "blue", icon: Building2 },
      { label: "Total revenue", value: money(total), accent: "green", icon: TrendingUp },
      {
        label: "Top partner",
        value: ranked[0]?.partner ?? "—",
        accent: "purple",
        icon: BadgePercent,
        hint: ranked[0] ? money(ranked[0].revenue) : undefined,
      },
      {
        label: "Average per partner",
        value: money(ranked.length ? total / ranked.length : 0),
        accent: "teal",
        icon: Layers,
      },
    ],
    chartTitle: "Revenue contribution by partner",
    chart: {
      type: "treemap",
      data: ranked.slice(0, 14).map((r) => ({ name: r.partner, value: r.revenue })),
    },
    columns: [
      { id: "partner", header: "Partner", kind: "text" },
      { id: "invoices", header: "Invoices", kind: "number", align: "right" },
      { id: "revenue", header: "Revenue", kind: "money", align: "right" },
      { id: "average", header: "Average invoice", kind: "money", align: "right" },
      { id: "share", header: "Share", kind: "percent", align: "right" },
    ],
    rows,
  };
}

function locationRevenueReport(ctx: ReportContext): ReportResult {
  const geoById = new Map(
    ctx.locations.map((l) => [
      l.id,
      {
        city: l.city?.trim() || "",
        state: l.state?.trim() || "",
      },
    ]),
  );

  const map = new Map<
    string,
    { location: string; state: string; partners: Set<string>; invoices: number; revenue: number; outstanding: number }
  >();

  for (const inv of billable(ctx.invoices)) {
    const geo = geoById.get(inv.locationId);
    const state = geo?.state || "Unknown";
    const city = geo?.city || "Unknown";
    const key = `${state}|${city}`;
    const row =
      map.get(key) ??
      {
        location: city,
        state,
        partners: new Set<string>(),
        invoices: 0,
        revenue: 0,
        outstanding: 0,
      };
    row.partners.add(inv.locationId);
    row.invoices += 1;
    row.revenue += toNumber(inv.total);
    row.outstanding += toNumber(inv.balanceDue);
    map.set(key, row);
  }

  const ranked = [...map.values()].sort((a, b) => b.revenue - a.revenue);
  const total = ranked.reduce((s, r) => s + r.revenue, 0);
  const rows: ReportRow[] = ranked.map((r) => ({
    location: r.location,
    state: r.state,
    partners: r.partners.size,
    invoices: r.invoices,
    revenue: r.revenue,
    outstanding: r.outstanding,
    share: total > 0 ? (r.revenue / total) * 100 : 0,
  }));

  const states = new Set(ranked.map((r) => r.state));

  return {
    summary: [
      { label: "Cities billed", value: count(ranked.length), accent: "teal", icon: MapPin },
      { label: "States covered", value: count(states.size), accent: "blue", icon: Building2 },
      { label: "Total revenue", value: money(total), accent: "green", icon: TrendingUp },
      {
        label: "Top location",
        value: ranked[0] ? `${ranked[0].location}, ${ranked[0].state}` : "—",
        accent: "purple",
        icon: BadgePercent,
        hint: ranked[0] ? money(ranked[0].revenue) : undefined,
      },
    ],
    chartTitle: "Revenue by location",
    chart: {
      type: "hbar",
      data: ranked
        .slice(0, 10)
        .map((r) => ({ name: `${r.location}, ${r.state}`, value: r.revenue })),
    },
    columns: [
      { id: "location", header: "City", kind: "text" },
      { id: "state", header: "State", kind: "text" },
      { id: "partners", header: "Partners", kind: "number", align: "right" },
      { id: "invoices", header: "Invoices", kind: "number", align: "right" },
      { id: "revenue", header: "Revenue", kind: "money", align: "right" },
      { id: "outstanding", header: "Outstanding", kind: "money", align: "right" },
      { id: "share", header: "Share", kind: "percent", align: "right" },
    ],
    rows,
  };
}

function latePaymentsReport(ctx: ReportContext): ReportResult {
  const late = billable(ctx.invoices).filter(
    (inv) => toNumber(inv.balanceDue) > 0 && daysPastDue(inv.dueDate, ctx.now) > 0,
  );

  const rows: ReportRow[] = late
    .map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      customer: inv.locationName || "Unassigned",
      dueDate: inv.dueDate ?? null,
      daysLate: daysPastDue(inv.dueDate, ctx.now),
      bucket: agingBucket(daysPastDue(inv.dueDate, ctx.now)),
      balanceDue: toNumber(inv.balanceDue),
      lateFee: toNumber(inv.lateFeeAmount),
    }))
    .sort((a, b) => Number(b.daysLate) - Number(a.daysLate));

  const totalLate = rows.reduce((s, r) => s + Number(r.balanceDue), 0);
  const totalFees = rows.reduce((s, r) => s + Number(r.lateFee), 0);
  const avgDays = rows.length
    ? rows.reduce((s, r) => s + Number(r.daysLate), 0) / rows.length
    : 0;

  const byBucket = new Map<string, number>();
  for (const row of rows) {
    const key = String(row.bucket);
    byBucket.set(key, (byBucket.get(key) ?? 0) + Number(row.balanceDue));
  }
  const bucketLabels: Record<string, string> = {
    d30: "1–30 days",
    d60: "31–60 days",
    d90: "61–90 days",
    d90plus: "90+ days",
  };

  return {
    summary: [
      { label: "Late invoices", value: count(rows.length), accent: "red", icon: AlarmClock },
      { label: "Amount late", value: money(totalLate), accent: "orange", icon: Wallet },
      {
        label: "Average days late",
        value: rows.length ? `${avgDays.toFixed(0)} days` : "—",
        accent: "purple",
        icon: Clock3,
      },
      { label: "Late fees applied", value: money(totalFees), accent: "slate", icon: Receipt },
    ],
    chartTitle: "Late balance by aging bucket",
    chart: {
      type: "hbar",
      data: [...byBucket.entries()].map(([key, value]) => ({
        name: bucketLabels[key] ?? key,
        value,
      })),
      color: COLORS.overdue,
    },
    columns: [
      { id: "invoiceNumber", header: "Invoice", kind: "text" },
      { id: "customer", header: "Customer", kind: "text" },
      { id: "dueDate", header: "Due", kind: "date" },
      { id: "daysLate", header: "Days late", kind: "days", align: "right" },
      { id: "balanceDue", header: "Balance", kind: "money", align: "right" },
      { id: "lateFee", header: "Late fee", kind: "money", align: "right" },
    ],
    rows,
  };
}

function taxSummaryReport(ctx: ReportContext): ReportResult {
  const months = new Map<
    string,
    { invoices: number; subtotal: number; tax: number; total: number }
  >();

  for (const inv of billable(ctx.invoices)) {
    const key = monthKey(inv.invoiceDate);
    if (!key) continue;
    const row = months.get(key) ?? { invoices: 0, subtotal: 0, tax: 0, total: 0 };
    row.invoices += 1;
    row.subtotal += toNumber(inv.subtotal);
    row.tax += toNumber(inv.taxAmount);
    row.total += toNumber(inv.total);
    months.set(key, row);
  }

  const rows: ReportRow[] = sortedMonthKeys(new Set(months.keys())).map((key) => {
    const row = months.get(key)!;
    return {
      period: monthName(key),
      invoices: row.invoices,
      subtotal: row.subtotal,
      tax: row.tax,
      total: row.total,
      effectiveRate: row.subtotal > 0 ? (row.tax / row.subtotal) * 100 : 0,
    };
  });

  const totalTax = rows.reduce((s, r) => s + Number(r.tax), 0);
  const totalBase = rows.reduce((s, r) => s + Number(r.subtotal), 0);

  return {
    summary: [
      { label: "Tax charged", value: money(totalTax), accent: "purple", icon: Receipt },
      { label: "Taxable base", value: money(totalBase), accent: "blue", icon: TrendingUp },
      {
        label: "Effective rate",
        value: ratio(totalBase > 0 ? (totalTax / totalBase) * 100 : 0, 2),
        accent: "teal",
        icon: BadgePercent,
      },
      { label: "Periods", value: count(rows.length), accent: "slate", icon: Layers },
    ],
    chartTitle: "Tax charged by month",
    chart: {
      type: "bar",
      xKey: "period",
      data: rows as unknown as Record<string, string | number>[],
      series: [{ key: "tax", label: "Tax", color: COLORS.tax }],
    },
    columns: [
      { id: "period", header: "Period", kind: "text" },
      { id: "invoices", header: "Invoices", kind: "number", align: "right" },
      { id: "subtotal", header: "Taxable base", kind: "money", align: "right" },
      { id: "tax", header: "Tax", kind: "money", align: "right" },
      { id: "total", header: "Total billed", kind: "money", align: "right" },
      { id: "effectiveRate", header: "Effective rate", kind: "percent", align: "right" },
    ],
    rows,
  };
}

const BUILDERS: Record<string, (ctx: ReportContext) => ReportResult> = {
  revenue: revenueReport,
  invoice_summary: invoiceSummaryReport,
  collections: collectionsReport,
  receivable_aging: agingReport,
  payment_history: paymentHistoryReport,
  customer_balance: customerBalanceReport,
  partner_revenue: partnerRevenueReport,
  location_revenue: locationRevenueReport,
  late_payments: latePaymentsReport,
  tax_summary: taxSummaryReport,
};

export function buildReport(id: string, ctx: ReportContext): ReportResult {
  const builder = BUILDERS[id] ?? BUILDERS.revenue;
  return builder(ctx);
}
