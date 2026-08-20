import { resolveApiUrl } from "@/lib/api-base";

export type PublicInvoicePayload = {
  invoice: {
    invoiceNumber: string;
    status: string;
    invoiceDate?: string;
    dueDate?: string;
    currency?: string;
    items: {
      name: string;
      description?: string;
      quantity: number;
      unitPrice: number;
      lineTotal?: number;
    }[];
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    lateFeeAmount: number;
    creditApplied: number;
    total: number;
    amountPaid: number;
    balanceDue: number;
    notes?: string;
    isPaid: boolean;
    hasPendingSubmission: boolean;
    pendingSubmission: {
      amount: number;
      submittedAt?: string;
      paymentDate?: string;
      paymentMethod?: string;
      transactionReference?: string;
      notes?: string;
      proofUrl?: string;
      status: string;
    } | null;
  };
  billing: {
    companyName: string;
    billingEmail: string;
    billingAddress: string;
  };
  company: {
    name: string;
    logoUrl: string;
    supportEmail: string;
    billingEmail: string;
  };
  zelle: {
    enabled: boolean;
    label?: string;
    displayName?: string;
    recipientEmail?: string;
    recipientPhone?: string;
    qrCodeUrl?: string;
    details?: string;
    instructions?: string;
  };
  stripe: {
    enabled: boolean;
    label?: string;
    fee?: {
      invoiceAmountCents: number;
      stripeFeeCents: number;
      stripeChargeAmountCents: number;
      originalAmount: number;
      stripeProcessingFee: number;
      stripeChargeAmount: number;
      currency: string;
      paymentMethod: string;
      percent?: number;
      fixedFeeCents?: number;
    };
  };
};

async function publicJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(resolveApiUrl(path), {
    ...init,
    credentials: "omit",
  });
  const data = (await res.json()) as T & { error?: string; message?: string };
  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error ||
        (data as { message?: string }).message ||
        "Request failed",
    );
  }
  return data;
}

export async function fetchPublicInvoice(token: string) {
  return publicJson<PublicInvoicePayload>(
    `/api/public/invoices/${encodeURIComponent(token)}`,
  );
}

export async function submitPublicInvoicePayment(
  token: string,
  body: {
    amount: number;
    paymentMethod?: string;
    transactionReference?: string;
    paymentDate?: string;
    notes?: string;
    proof?: File | null;
  },
) {
  const fd = new FormData();
  fd.append("amount", String(body.amount));
  fd.append("paymentMethod", body.paymentMethod || "zelle");
  if (body.transactionReference) fd.append("transactionReference", body.transactionReference);
  if (body.paymentDate) fd.append("paymentDate", body.paymentDate);
  if (body.notes) fd.append("notes", body.notes);
  if (body.proof) fd.append("proof", body.proof);

  return publicJson<{ submission: { id: string; status: string; amount: number } }>(
    `/api/public/invoices/${encodeURIComponent(token)}/payment-submissions`,
    { method: "POST", body: fd },
  );
}

/** Canonical public invoice URL used by email and partner Pay Now. */
export function publicInvoicePayHref(token: string) {
  return `/invoice/pay?token=${encodeURIComponent(token)}`;
}

/** Creates a Stripe Checkout Session for this invoice and returns its hosted
 *  URL — the invoice is only marked paid once Stripe's webhook confirms the
 *  charge server-side, never on this call or the client redirect alone. */
export async function createPublicStripeCheckoutSession(token: string) {
  return publicJson<{
    url: string;
    originalAmount?: number;
    stripeProcessingFee?: number;
    stripeChargeAmount?: number;
    currency?: string;
    invoiceAmountCents?: number;
    stripeFeeCents?: number;
    stripeChargeAmountCents?: number;
    paymentMethod?: string;
  }>(`/api/public/invoices/${encodeURIComponent(token)}/stripe-checkout-session`, {
    method: "POST",
  });
}
