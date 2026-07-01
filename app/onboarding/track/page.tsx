"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { PublicTrackingClient } from "@/components/onboardings/public-tracking-client";

function PublicTrackingInner() {
  const params = useSearchParams();
  const token = params.get("token")?.trim() ?? "";

  if (!token) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border border-white/60 bg-white/95 p-8 text-center shadow-card backdrop-blur-sm">
          <h1 className="text-lg font-semibold text-slate-900">Invalid link</h1>
          <p className="mt-2 text-sm text-slate-600">
            This tracking link is missing a token. Check the URL from your approval email.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700"
          >
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return <PublicTrackingClient token={token} />;
}

export default function PublicTrackingPage() {
  return (
    <div className="track-shell flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 shrink-0 border-b border-primary-200/30 bg-white/80 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandLogo className="h-9 w-9" variant="coffee" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Onboarding tracker</p>
              <p className="text-xs text-slate-500">Follow your location setup in real time</p>
            </div>
          </div>
          <Link
            href="/login"
            className="hidden text-sm font-medium text-primary-700 hover:text-primary-800 sm:inline"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1">
        <Suspense
          fallback={
            <div className="flex min-h-[50vh] items-center justify-center text-slate-500">
              Loading…
            </div>
          }
        >
          <PublicTrackingInner />
        </Suspense>
      </main>
    </div>
  );
}
