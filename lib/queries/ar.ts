import { apiFetch } from "@/lib/auth-fetch";

export type ArListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  order?: "asc" | "desc";
  status?: string;
  locationId?: string;
  active?: string;
  invoiceId?: string;
};

function toParams(p: ArListParams = {}) {
  const params = new URLSearchParams();
  if (p.page) params.set("page", String(p.page));
  if (p.pageSize) params.set("pageSize", String(p.pageSize));
  if (p.search?.trim()) params.set("search", p.search.trim());
  if (p.sort) params.set("sort", p.sort);
  if (p.order) params.set("order", p.order);
  if (p.status) params.set("status", p.status);
  if (p.locationId) params.set("locationId", p.locationId);
  if (p.active) params.set("active", p.active);
  if (p.invoiceId) params.set("invoiceId", p.invoiceId);
  return params.toString();
}

async function arJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  const data = (await res.json()) as T & { error?: string; message?: string };
  if (!res.ok) {
    throw new Error(
      (data as { error?: string; message?: string }).error ||
        (data as { message?: string }).message ||
        "Request failed",
    );
  }
  return data;
}

export type ArDashboard = {
  kpis: {
    outstandingBalance: number;
    currentBalance: number;
    overdueBalance: number;
    collectedThisMonth: number;
    collectedThisYear: number;
    totalInvoices: number;
    paidInvoices: number;
    partiallyPaid: number;
    overdueInvoices: number;
    draftInvoices: number;
  };
  charts: {
    monthlyRevenue: { year?: number; month?: number; label?: string; total: number }[];
    monthlyCollections: { year?: number; month?: number; label?: string; total: number }[];
    statusDistribution: { status: string; count: number }[];
    aging: Record<string, number> | { bucket: string; total: number }[];
  };
};

export async function fetchArDashboard(locationId?: string): Promise<ArDashboard> {
  const q = locationId ? `?locationId=${encodeURIComponent(locationId)}` : "";
  return arJson(`/api/ar/dashboard${q}`);
}

export async function fetchArSettings() {
  const data = await arJson<{ settings: Record<string, unknown> }>("/api/ar/settings");
  return data.settings;
}

export async function updateArSettings(body: Record<string, unknown>) {
  const payload = { ...body };
  if (payload.gracePeriodDays !== undefined && payload.defaultGracePeriodDays === undefined) {
    payload.defaultGracePeriodDays = payload.gracePeriodDays;
    delete payload.gracePeriodDays;
  }
  const data = await arJson<{ settings: Record<string, unknown> }>("/api/ar/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return data.settings;
}

export type ArInvoiceBlock = {
  id: string;
  type: string;
  enabled: boolean;
  label: string;
  content?: string;
  align?: "left" | "center" | "right";
  fontSize?: number;
};

export type ArInvoiceTemplate = {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  isActive?: boolean;
  blocks: ArInvoiceBlock[];
  createdAt?: string;
  updatedAt?: string;
};

export async function fetchArInvoiceTemplates() {
  const data = await arJson<{ templates: ArInvoiceTemplate[] }>("/api/ar/invoice-templates");
  return data.templates;
}

export async function fetchArInvoiceTemplatePalette() {
  return arJson<{
    blocks: ArInvoiceBlock[];
    blockTypes: { type: string; label: string }[];
  }>("/api/ar/invoice-templates/palette");
}

export async function createArInvoiceTemplate(body: {
  name: string;
  description?: string;
  blocks: ArInvoiceBlock[];
  isDefault?: boolean;
}) {
  const data = await arJson<{ template: ArInvoiceTemplate }>("/api/ar/invoice-templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return data.template;
}

export async function updateArInvoiceTemplate(
  id: string,
  body: Partial<{
    name: string;
    description: string;
    blocks: ArInvoiceBlock[];
    isDefault: boolean;
    isActive: boolean;
  }>,
) {
  const data = await arJson<{ template: ArInvoiceTemplate }>(`/api/ar/invoice-templates/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return data.template;
}

export async function deleteArInvoiceTemplate(id: string) {
  return arJson(`/api/ar/invoice-templates/${id}`, { method: "DELETE" });
}

export type ArProduct = {
  id: string;
  name: string;
  description?: string;
  category?: string;
  price: number;
  taxable?: boolean;
  taxPercentage?: number;
  isActive?: boolean;
  accountingCategory?: string;
};

export async function fetchArProducts(params?: ArListParams) {
  const q = toParams(params);
  return arJson<{ products: ArProduct[]; total: number; page: number; pageSize: number }>(
    `/api/ar/products${q ? `?${q}` : ""}`,
  );
}

export async function createArProduct(body: Partial<ArProduct>) {
  return arJson("/api/ar/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function updateArProduct(id: string, body: Partial<ArProduct>) {
  return arJson(`/api/ar/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function archiveArProduct(id: string) {
  return arJson(`/api/ar/products/${id}/archive`, { method: "POST" });
}

export async function deleteArProduct(id: string) {
  return arJson(`/api/ar/products/${id}`, { method: "DELETE" });
}

export type ArBillingProfile = {
  id?: string;
  locationId: string;
  locationName?: string;
  billingEmail?: string;
  secondaryBillingEmail?: string;
  phone?: string;
  billingAddress?: string;
  paymentTermsDays?: number;
  billingFrequency?: string;
  currency?: string;
  paymentMethod?: string;
  gracePeriodDays?: number;
  autoGenerateInvoice?: boolean;
  autoSendInvoice?: boolean;
  lateFeeEnabled?: boolean;
  lateFeeType?: string;
  lateFeeAmount?: number;
  internalNotes?: string;
};

export async function fetchArBillingProfiles(params?: ArListParams) {
  const q = toParams(params);
  return arJson<{
    profiles: ArBillingProfile[];
    total: number;
    page: number;
    pageSize: number;
  }>(`/api/ar/billing-profiles${q ? `?${q}` : ""}`);
}

export async function fetchArBillingProfile(locationId: string) {
  const data = await arJson<{ profile: ArBillingProfile }>(
    `/api/ar/billing-profiles/${locationId}`,
  );
  return data.profile;
}

export async function upsertArBillingProfile(
  locationId: string,
  body: Partial<ArBillingProfile>,
) {
  const data = await arJson<{ profile: ArBillingProfile }>(
    `/api/ar/billing-profiles/${locationId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return data.profile;
}

export type ArInvoice = {
  id: string;
  invoiceNumber: string;
  locationId: string;
  locationName?: string;
  invoiceTemplateId?: string | null;
  status: string;
  invoiceDate?: string;
  dueDate?: string;
  currency?: string;
  subtotal?: number;
  taxAmount?: number;
  discountAmount?: number;
  lateFeeAmount?: number;
  creditApplied?: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  sentAt?: string | null;
  paidAt?: string | null;
  notes?: string;
  items?: {
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal?: number;
  }[];
  timeline?: {
    eventType: string;
    title: string;
    description?: string;
    userName?: string;
    createdAt?: string;
  }[];
};

export async function fetchArInvoices(params?: ArListParams) {
  const q = toParams(params);
  return arJson<{ invoices: ArInvoice[]; total: number; page: number; pageSize: number }>(
    `/api/ar/invoices${q ? `?${q}` : ""}`,
  );
}

export async function fetchArInvoice(id: string) {
  const data = await arJson<{ invoice: ArInvoice }>(`/api/ar/invoices/${id}`);
  return data.invoice;
}

export async function createArInvoice(body: Record<string, unknown>) {
  const data = await arJson<{ invoice: ArInvoice }>("/api/ar/invoices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return data.invoice;
}

export async function invoiceAction(id: string, action: string) {
  return arJson(`/api/ar/invoices/${id}/${action}`, { method: "POST" });
}

export async function downloadArInvoicePdf(id: string) {
  const res = await apiFetch(`/api/ar/invoices/${id}/pdf`);
  if (!res.ok) throw new Error("Failed to download PDF");
  return res.blob();
}

export type ArPayment = {
  id: string;
  invoiceId: string;
  invoiceNumber?: string;
  locationId?: string;
  locationName?: string;
  amount: number;
  paymentDate?: string;
  paymentMethod?: string;
  transactionReference?: string;
  notes?: string;
  createdAt?: string;
};

export async function fetchArPayments(params?: ArListParams) {
  const q = toParams(params);
  return arJson<{ payments: ArPayment[]; total: number; page: number; pageSize: number }>(
    `/api/ar/payments${q ? `?${q}` : ""}`,
  );
}

export async function recordArPayment(body: Record<string, unknown>) {
  return arJson("/api/ar/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export type ArPaymentSubmissionStatus = "pending" | "approved" | "rejected";

export type ArPaymentSubmission = {
  id: string;
  invoiceId: string;
  invoiceNumber?: string;
  locationId: string;
  locationName?: string;
  submittedBy: string | null;
  submittedByName?: string;
  amount: number;
  paymentMethod: string;
  paymentDate?: string;
  transactionReference?: string;
  notes?: string;
  status: ArPaymentSubmissionStatus;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string;
  resultingPaymentId?: string | null;
  createdAt?: string;
};

/** Partner reports "I sent payment" for an invoice — pending admin verification. */
export async function submitArInvoicePayment(
  invoiceId: string,
  body: { amount: number; paymentMethod: string; transactionReference?: string; notes?: string },
) {
  const data = await arJson<{ submission: ArPaymentSubmission }>(
    `/api/ar/invoices/${invoiceId}/payment-submissions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return data.submission;
}

export async function fetchArPaymentSubmissions(status: ArPaymentSubmissionStatus | "all" = "pending") {
  const data = await arJson<{ submissions: ArPaymentSubmission[] }>(
    `/api/ar/payment-submissions?status=${encodeURIComponent(status)}`,
  );
  return data.submissions;
}

export async function reviewArPaymentSubmission(
  id: string,
  body: { decision: "approve" | "reject"; note?: string },
) {
  const data = await arJson<{ submission: ArPaymentSubmission }>(
    `/api/ar/payment-submissions/${id}/review`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return data.submission;
}

export type ArCredit = {
  id: string;
  locationId: string;
  locationName?: string;
  amount: number;
  remainingAmount?: number;
  type?: string;
  reason?: string;
  status?: string;
  createdAt?: string;
  issuedAt?: string;
  creditDate?: string;
};

export async function fetchArCredits(params?: ArListParams) {
  const q = toParams(params);
  return arJson<{ credits: ArCredit[]; total: number; page: number; pageSize: number }>(
    `/api/ar/credits${q ? `?${q}` : ""}`,
  );
}

export async function createArCredit(body: Record<string, unknown>) {
  return arJson("/api/ar/credits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function applyArCredit(
  id: string,
  body: { invoiceId: string; amount?: number },
) {
  return arJson(`/api/ar/credits/${id}/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export type ArRecurring = {
  id: string;
  name: string;
  locationId: string;
  locationName?: string;
  frequency: string;
  nextRunDate?: string;
  autoGenerate?: boolean;
  autoSend?: boolean;
  active?: boolean;
};

export async function fetchArRecurring(params?: ArListParams) {
  const q = toParams(params);
  return arJson<{
    templates: ArRecurring[];
    total: number;
    page: number;
    pageSize: number;
  }>(`/api/ar/recurring${q ? `?${q}` : ""}`);
}

export async function createArRecurring(body: Record<string, unknown>) {
  return arJson("/api/ar/recurring", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function runArRecurring(id: string) {
  return arJson(`/api/ar/recurring/${id}/run`, { method: "POST" });
}

export async function deleteArRecurring(id: string) {
  return arJson(`/api/ar/recurring/${id}`, { method: "DELETE" });
}

export async function fetchArStatements(params?: ArListParams) {
  const q = toParams(params);
  return arJson<{ statements: Record<string, unknown>[]; total: number }>(
    `/api/ar/statements${q ? `?${q}` : ""}`,
  );
}

export async function generateArStatement(body: Record<string, unknown>) {
  return arJson("/api/ar/statements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function fetchArAuditLogs(params?: ArListParams) {
  const q = toParams(params);
  return arJson<{ logs: Record<string, unknown>[]; total: number }>(
    `/api/ar/audit-logs${q ? `?${q}` : ""}`,
  );
}

export async function fetchArReport(reportType: string, params?: ArListParams & { format?: string }) {
  const q = toParams(params);
  const format = params?.format ? `${q ? "&" : ""}format=${params.format}` : "";
  const qs = q || format ? `?${q}${format}` : "";
  if (params?.format === "csv") {
    const res = await apiFetch(`/api/ar/reports/${reportType}${qs}`);
    if (!res.ok) throw new Error("Report failed");
    return res.blob();
  }
  return arJson(`/api/ar/reports/${reportType}${qs}`);
}

export async function createArImport(body: {
  importType: string;
  csvText: string;
  fileName?: string;
}) {
  return arJson("/api/ar/imports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function validateArImport(id: string) {
  return arJson(`/api/ar/imports/${id}/validate`, { method: "POST" });
}

export async function executeArImport(id: string) {
  return arJson(`/api/ar/imports/${id}/execute`, { method: "POST" });
}

export async function downloadImportTemplate(importType: string) {
  const res = await apiFetch(`/api/ar/imports/templates/${importType}`);
  if (!res.ok) throw new Error("Template download failed");
  return res.blob();
}

export function moneyFmt(n: number | undefined | null, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Number(n) || 0);
}
