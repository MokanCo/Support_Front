"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { BrandLogo } from "@/components/BrandLogo";
import { AchSetupForm } from "@/components/invoice/AchSetupForm";
import { fetchPublicAchSetup } from "@/lib/queries/public-ach-setup";
import { resolveMediaUrl } from "@/lib/erp/media-url";

function Shell({
  children,
  company,
  logoUrl,
}: {
  children: React.ReactNode;
  company?: string;
  logoUrl?: string;
}) {
  return (
    <div className="min-h-dvh bg-[radial-gradient(ellipse_at_top,_#ecfdf5_0%,_#f8fafc_45%,_#f1f5f9_100%)]">
      <div className="mx-auto max-w-lg px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolveMediaUrl(logoUrl)}
                alt={company || "Company logo"}
                className="h-12 w-auto max-w-[220px] object-contain sm:h-14"
              />
            ) : (
              <BrandLogo className="h-12 w-12 sm:h-14 sm:w-14" />
            )}
          </div>
          <p className="text-xs text-slate-500">Automatic bank payments setup</p>
        </header>
        {children}
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
      {children}
    </section>
  );
}

function AchSetupInner() {
  const sp = useSearchParams();
  const token = sp.get("token") || "";
  const [error, setError] = useState<string | null>(null);
  const [linked, setLinked] = useState(false);

  const query = useQuery({
    queryKey: ["public-ach-setup", token],
    queryFn: () => fetchPublicAchSetup(token),
    enabled: Boolean(token),
    retry: false,
  });

  if (!token) {
    return (
      <Shell>
        <Card>
          <h1 className="text-xl font-semibold text-slate-900">Invalid setup link</h1>
          <p className="mt-2 text-sm text-slate-600">
            This link is missing a secure token. Please use the link from your
            business's email.
          </p>
        </Card>
      </Shell>
    );
  }

  if (query.isLoading) {
    return (
      <Shell>
        <Card>
          <p className="text-sm text-slate-500">Loading…</p>
        </Card>
      </Shell>
    );
  }

  if (query.error || !query.data) {
    return (
      <Shell>
        <Card>
          <h1 className="text-xl font-semibold text-slate-900">Link unavailable</h1>
          <p className="mt-2 text-sm text-rose-700">
            {(query.error as Error)?.message || "This setup link could not be loaded."}
          </p>
        </Card>
      </Shell>
    );
  }

  const data = query.data;

  return (
    <Shell company={data.company.name} logoUrl={data.company.logoUrl}>
      <Card>
        {linked || data.alreadyLinked ? (
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
              Bank account linked
            </p>
            <h1 className="mt-2 text-xl font-semibold text-slate-900">You&apos;re all set</h1>
            <p className="mt-2 text-sm text-slate-600">
              Future invoices from {data.company.name} will be automatically
              debited from this account — you won&apos;t need to do anything
              further. You can withdraw this authorization anytime by contacting{" "}
              {data.company.name}.
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
              Automatic bank payments
            </p>
            <h1 className="mt-1 text-xl font-semibold text-slate-900">
              Link your bank account
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {data.company.name} would like to set up automatic ACH billing for{" "}
              {data.customerName || "your account"}. Once linked, future invoices
              will be debited directly from this bank account — no further
              action needed from you.
            </p>
            {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
            <div className="mt-5">
              <AchSetupForm
                token={token}
                onLinked={() => setLinked(true)}
                onError={(message) => setError(message || null)}
              />
            </div>
          </>
        )}
      </Card>
    </Shell>
  );
}

export default function PublicAchSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center text-sm text-slate-500">
          Loading…
        </div>
      }
    >
      <AchSetupInner />
    </Suspense>
  );
}
