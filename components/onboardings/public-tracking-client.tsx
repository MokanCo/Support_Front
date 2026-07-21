"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  Circle,
  MapPin,
  Sparkles,
  X,
} from "lucide-react";
import {
  fetchPublicTracking,
  ONBOARDING_STATUS_LABELS,
  ONBOARDING_STATUS_STYLES,
  publicTrackingQueryKey,
  type OnboardingStatus,
} from "@/lib/queries/onboarding-admin";
import { OnboardingPublicServiceSections } from "@/components/onboardings/onboarding-service-sections";
import { PublicTrackingPageSkeleton } from "@/components/ui/skeleton";

function StatusBadge({ status }: { status: string }) {
  const key = status as OnboardingStatus;
  const style =
    ONBOARDING_STATUS_STYLES[key] ??
    "bg-slate-100 text-slate-700 ring-slate-200";
  const label = ONBOARDING_STATUS_LABELS[key] ?? status;
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${style}`}
    >
      {label}
    </span>
  );
}

function ProgressRing({ percent }: { percent: number }) {
  const size = 88;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - percent / 100);

  return (
    <div className="relative flex h-[88px] w-[88px] items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgb(226 232 240)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#trackProgress)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
        <defs>
          <linearGradient id="trackProgress" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#9b6b46" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute text-xl font-bold text-slate-900">
        {percent}%
      </span>
    </div>
  );
}

export function PublicTrackingClient({ token }: { token: string }) {
  const [toastVisible, setToastVisible] = useState(true);

  const query = useQuery({
    queryKey: publicTrackingQueryKey(token),
    queryFn: () => fetchPublicTracking(token),
    refetchInterval: 12000,
  });

  const openingDate = query.data?.request.openingDate ?? null;

  useEffect(() => {
    setToastVisible(true);
  }, [token, openingDate]);

  const formattedOpeningDate = openingDate
    ? (() => {
        try {
          return new Date(openingDate).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
        } catch {
          return openingDate;
        }
      })()
    : null;

  if (query.isPending) {
    return <PublicTrackingPageSkeleton />;
  }

  if (query.isError || !query.data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border border-slate-200/80 bg-white/95 p-8 text-center shadow-card backdrop-blur-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <Circle className="h-7 w-7" />
          </div>
          <h1 className="text-lg font-semibold text-slate-900">
            Link not found
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            This tracking link is invalid or has expired. Please check the URL
            from your approval email.
          </p>
        </div>
      </div>
    );
  }

  const { request, services, serviceSections, activities, progress } =
    query.data;
  const isPending = request.status === "pending";
  const hasServices = services.length > 0;

  return (
    <div className="space-y-5 p-4 pb-10 sm:p-6 sm:pb-12">
      {formattedOpeningDate && toastVisible && (
        <div className="flex w-full items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-xl ring-1 ring-amber-100">
          <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p className="flex-1 text-sm leading-relaxed text-amber-950">
            Your opening date is{" "}
            <strong className="font-semibold">{formattedOpeningDate}</strong>.
            After that you are able to login to the portal and submit your{" "}
            <strong className="font-semibold">tickets/query</strong> directly to
            the support. You can keep tracking your progress here as well.
          </p>
          <button
            type="button"
            onClick={() => setToastVisible(false)}
            className="mt-0.5 shrink-0 rounded-lg p-1 text-amber-500 transition hover:bg-amber-100 hover:text-amber-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <header className="overflow-hidden rounded-2xl border border-white/60 bg-white/90 shadow-card backdrop-blur-md">
        <div className="bg-gradient-to-br from-primary-50/90 via-white to-emerald-50/50 px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              {request.trackingId && (
                <p className="inline-flex items-center gap-1.5 rounded-lg bg-white/80 px-2.5 py-1 font-mono text-xs font-semibold text-primary-700 ring-1 ring-primary-200/50">
                  <Sparkles className="h-3 w-3" />
                  {request.trackingId}
                </p>
              )}
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {request.locationName}
              </h1>
              {request.businessName && (
                <p className="flex items-center gap-1.5 text-sm text-slate-600">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-primary-500" />
                  {request.businessName}
                </p>
              )}
            </div>
            <StatusBadge status={request.status} />
          </div>

          {!isPending && (
            <div className="mt-5 flex flex-wrap items-center gap-6 border-t border-slate-200/60 pt-5">
              <ProgressRing percent={progress.percent} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  Overall progress
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {progress.completedTasks} of {progress.totalTasks} tasks
                  completed
                </p>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200/80">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-500 to-emerald-500 transition-all duration-700"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Last updated {new Date(request.lastUpdated).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {isPending && (
            <div className="mt-5 rounded-xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-amber-50/50 px-4 py-3.5">
              <p className="text-sm font-medium text-amber-950">
                Your request is under review
              </p>
              <p className="mt-1 text-sm text-amber-800/90">
                You will receive an email with your tracking link once approved.
              </p>
            </div>
          )}
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)] lg:items-start">
        {hasServices && (
          <section className="rounded-2xl border border-white/60 bg-white/90 shadow-card backdrop-blur-md">
            <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
              <h2 className="text-base font-semibold text-slate-900">
                Your services
              </h2>
              <p className="text-xs text-slate-500">
                {isPending
                  ? "Selected services — tasks begin after approval"
                  : "Live updates as our team completes each step"}
              </p>
            </div>
            <div className="p-4">
              <OnboardingPublicServiceSections
                serviceSections={serviceSections}
                services={services}
                preview={isPending}
              />
            </div>
          </section>
        )}

        {activities.length > 0 && (
          <section
            className={`rounded-2xl border border-white/60 bg-white/90 shadow-card backdrop-blur-md ${
              !hasServices
                ? "lg:col-span-full lg:mx-auto lg:w-full lg:max-w-2xl"
                : ""
            }`}
          >
            <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
              <h2 className="text-base font-semibold text-slate-900">
                Recent activity
              </h2>
              <p className="text-xs text-slate-500">
                Milestones on your onboarding journey
              </p>
            </div>
            <div className="p-4">
              <ul className="relative space-y-0">
                {activities.map((a, i) => (
                  <li key={a.id} className="relative flex gap-3 pb-5 last:pb-0">
                    {i < activities.length - 1 && (
                      <span
                        className="absolute left-[13px] top-7 bottom-0 w-px bg-gradient-to-b from-primary-200 to-transparent"
                        aria-hidden
                      />
                    )}
                    <span className="relative z-[1] mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 ring-4 ring-white">
                      <Sparkles className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1 rounded-xl bg-slate-50/60 px-3 py-2.5 ring-1 ring-slate-100">
                      <p className="text-sm font-medium text-slate-900">
                        {a.title}
                      </p>
                      {a.description && (
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                          {a.description}
                        </p>
                      )}
                      <p className="mt-1.5 text-[0.65rem] font-medium text-slate-400">
                        {new Date(a.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
