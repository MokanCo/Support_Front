"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/lib/session-context";
import { canViewAr } from "@/lib/permissions";
import { EmptyState, ErrorState } from "@/components/ar/ui/primitives";
import { fetchArInvoice } from "@/lib/queries/ar";
import { publicInvoicePayHref } from "@/lib/queries/public-invoice";

/**
 * Legacy auth'd pay URL from older emails:
 *   /dashboard/ar/pay?invoice={id}
 * Redirects to the canonical public invoice page once the secure token is loaded.
 */
function PayRedirectInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const invoiceId = sp.get("invoice") ?? "";
  const { user } = useSession();

  const invoiceQuery = useQuery({
    queryKey: ["ar", "invoice", invoiceId],
    queryFn: () => fetchArInvoice(invoiceId),
    enabled: Boolean(invoiceId) && canViewAr(user.role),
  });

  useEffect(() => {
    const token = invoiceQuery.data?.publicPaymentToken;
    if (token) {
      router.replace(publicInvoicePayHref(token));
    }
  }, [invoiceQuery.data, router]);

  if (!canViewAr(user.role)) {
    return (
      <EmptyState
        title="Access required"
        description="You don't have permission to view this page."
      />
    );
  }

  if (!invoiceId) {
    return (
      <EmptyState
        title="Missing invoice"
        description="Open Pay Now from your invoice email or Accounts → Invoices."
      />
    );
  }

  if (invoiceQuery.error) {
    return (
      <ErrorState
        message={(invoiceQuery.error as Error).message}
        onRetry={() => invoiceQuery.refetch()}
      />
    );
  }

  if (invoiceQuery.isLoading || !invoiceQuery.data?.publicPaymentToken) {
    return (
      <p className="p-6 text-sm text-slate-500">Opening secure invoice payment page…</p>
    );
  }

  return null;
}

export default function ArPayRedirectPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-slate-500">Loading…</p>}>
      <PayRedirectInner />
    </Suspense>
  );
}
