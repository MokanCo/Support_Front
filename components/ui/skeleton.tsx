import type { ReactNode } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

/** Pulse placeholder block — use inside existing card/layout shells. */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-md bg-slate-200/70 ${className}`}
    />
  );
}

export function SkeletonTableRows({
  rows = 8,
  columns = 5,
  selectable = false,
}: {
  rows?: number;
  columns?: number;
  selectable?: boolean;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, ri) => (
        <tr key={ri} className="animate-pulse">
          {selectable ? (
            <td className="px-4 py-3">
              <Skeleton className="h-4 w-4 rounded" />
            </td>
          ) : null}
          {Array.from({ length: columns }).map((_, ci) => (
            <td key={ci} className="px-4 py-3">
              <Skeleton className={`h-4 ${ci === 0 ? "w-32" : ci === columns - 1 ? "w-16" : "w-full max-w-[12rem]"}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function SkeletonStatCard() {
  return (
    <Card>
      <CardBody className="space-y-3 p-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </CardBody>
    </Card>
  );
}

export function SkeletonStatCardsRow({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
  );
}

function SkeletonQueueRows({ count = 4 }: { count?: number }) {
  return (
    <div className="divide-y divide-slate-100">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex animate-pulse gap-4 px-6 py-4">
          <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-3/5 max-w-xs" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <div className="flex justify-end gap-2">
              <Skeleton className="h-5 w-14 rounded-md" />
              <Skeleton className="h-5 w-14 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Admin / support dashboard — keeps header toolbar + card grid shape. */
export function DashboardInsightsSkeleton({
  title = "Operations",
  subtitle = "Loading workspace…",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/80 p-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-16 rounded-lg" />
          ))}
        </div>
      </div>

      <SkeletonStatCardsRow count={4} />

      <div className="grid gap-6 lg:grid-cols-5 lg:items-stretch">
        <Card className="flex flex-col lg:col-span-3">
          <CardHeader title="Active queue" description="Loading…" />
          <CardBody className="p-0">
            <SkeletonQueueRows count={4} />
          </CardBody>
        </Card>
        <Card className="flex flex-col lg:col-span-2">
          <CardHeader title="Ticket status" description="Loading…" />
          <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="shrink-0 space-y-2.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex animate-pulse items-center gap-2">
                  <Skeleton className="h-2.5 w-2.5 rounded-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
            <Skeleton className="mx-auto h-56 min-h-[14rem] w-full max-w-[14rem] rounded-full" />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

export function TicketDetailPageSkeleton() {
  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col gap-6">
      <Skeleton className="h-5 w-20" />
      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_288px] xl:grid-cols-[minmax(0,1fr)_320px] lg:items-stretch">
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-3/4 max-w-md" />
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-7 w-20 rounded-full" />
                <Skeleton className="h-7 w-12 rounded-full" />
                <Skeleton className="h-12 w-12 rounded-full" />
              </div>
            </div>
          </div>
          <CardBody className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))}
            </div>
            <Skeleton className="h-24 w-full rounded-xl" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
        <aside className="flex h-full min-h-0 flex-col">
          <TicketNotesPanelSkeleton />
        </aside>
      </div>
    </div>
  );
}

/** Timeline rows only — use inside the notes list scroll area. */
export function TicketNotesListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ul className="relative w-full space-y-0">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="relative flex animate-pulse gap-0 pb-8 last:pb-2">
          {i < count - 1 ? (
            <span
              className="absolute left-[0.6rem] top-3 bottom-0 w-px bg-slate-200"
              aria-hidden
            />
          ) : null}
          <div className="relative z-[1] flex w-5 shrink-0 justify-center pt-1">
            <Skeleton className="h-2.5 w-2.5 shrink-0 rounded-full" />
          </div>
          <div className="min-w-0 flex-1 pl-3 space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function TicketNotesPanelSkeleton({ showComposer = true }: { showComposer?: boolean }) {
  return (
    <Card className="flex h-full min-h-[min(420px,calc(100dvh-10rem))] flex-1 flex-col overflow-hidden">
      <CardHeader
        action={
          <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-0.5">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        }
      />
      <CardBody className="flex min-h-0 flex-1 flex-col p-0">
        <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto]">
          <div className="px-5 py-4">
            <TicketNotesListSkeleton count={3} />
          </div>
          {showComposer ? (
            <div className="shrink-0 border-t border-slate-100 bg-slate-50/80 px-5 py-4">
              <Skeleton className="h-20 w-full rounded-lg" />
              <div className="mt-3 flex justify-end">
                <Skeleton className="h-9 w-24 rounded-xl" />
              </div>
            </div>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}

export function SkeletonKanbanBoard({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex h-full min-h-[420px] gap-4 overflow-x-auto pb-2">
      {Array.from({ length: columns }).map((_, ci) => (
        <div
          key={ci}
          className="flex w-72 shrink-0 flex-col rounded-2xl border border-slate-200/80 bg-slate-50/50"
        >
          <div className="flex items-center justify-between border-b border-slate-200/60 px-3 py-2.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-6 rounded-md" />
          </div>
          <div className="flex flex-1 flex-col gap-2 p-2">
            {Array.from({ length: ci % 2 === 0 ? 2 : 3 }).map((_, ti) => (
              <div key={ti} className="animate-pulse rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="mt-2 h-3 w-4/5" />
                <div className="mt-3 flex items-center justify-between">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-4 w-10" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonInboxList({ rows = 6 }: { rows?: number }) {
  return (
    <ul className="divide-y divide-slate-100">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="animate-pulse px-4 py-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function SkeletonMessageBubbles({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`flex animate-pulse ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
        >
          <Skeleton
            className={`h-14 rounded-2xl ${i % 2 === 0 ? "w-[72%] rounded-bl-md" : "w-[58%] rounded-br-md"}`}
          />
        </div>
      ))}
    </div>
  );
}

export function LocationDetailPageSkeleton() {
  return (
    <div className="flex h-[calc(100dvh-4rem-4rem)] flex-col gap-6">
      <Skeleton className="h-4 w-24" />
      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[300px_1fr]">
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="bg-gradient-to-br from-primary-600/40 to-primary-700/40 px-6 py-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-2xl bg-white/30" />
              <Skeleton className="h-6 w-40 bg-white/30" />
            </div>
          </div>
          <CardBody className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex animate-pulse gap-3">
                <Skeleton className="h-4 w-4 shrink-0" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </CardBody>
        </Card>
        <Card className="flex min-h-0 flex-col">
          <div className="border-b border-slate-100 px-6 py-5">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="mt-2 h-3 w-40" />
          </div>
          <CardBody className="p-0">
            <div className="overflow-auto">
              <table className="min-w-full text-left text-sm">
                <tbody className="divide-y divide-slate-100">
                  <SkeletonTableRows rows={6} columns={5} />
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

export function SkeletonCentered({ children }: { children?: ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center py-12">
      {children ?? <Skeleton className="h-4 w-32" />}
    </div>
  );
}

/** Onboarding admin detail page skeleton — mirrors the two-column layout. */
export function OnboardingDetailPageSkeleton() {
  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col gap-4">
      {/* back link */}
      <Skeleton className="h-4 w-28" />

      {/* header card */}
      <div className="shrink-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
        <div className="bg-gradient-to-r from-primary-50/80 via-white to-emerald-50/40 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-24 rounded-lg" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-8 w-64 max-w-full" />
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-20 rounded-xl" />
                <Skeleton className="h-9 w-24 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* two-column body */}
      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:items-stretch">
        {/* sidebar */}
        <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-0.5">
            {/* Owner card */}
            <Card className="overflow-hidden border-slate-200/80 shadow-sm">
              <div className="shrink-0 border-b border-slate-100 bg-slate-50/50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
              <CardBody className="p-4">
                <div className="grid gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="animate-pulse rounded-xl bg-slate-50/80 px-3 py-2.5 ring-1 ring-slate-100 space-y-1">
                      <Skeleton className="h-2.5 w-16" />
                      <Skeleton className="h-4 w-36 max-w-full" />
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
            {/* Location card */}
            <Card className="overflow-hidden border-slate-200/80 shadow-sm">
              <div className="shrink-0 border-b border-slate-100 bg-slate-50/50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
              <CardBody className="p-4">
                <div className="grid gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="animate-pulse rounded-xl bg-slate-50/80 px-3 py-2.5 ring-1 ring-slate-100 space-y-1">
                      <Skeleton className="h-2.5 w-20" />
                      <Skeleton className="h-4 w-32 max-w-full" />
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
            {/* Activity card */}
            <Card className="overflow-hidden border-slate-200/80 shadow-sm">
              <div className="shrink-0 border-b border-slate-100 bg-slate-50/50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
              <CardBody className="p-0">
                <ul className="divide-y divide-slate-100">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <li key={i} className="flex animate-pulse gap-3 px-4 py-3">
                      <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </div>
        </aside>

        {/* service tasks */}
        <Card className="flex min-h-0 min-w-0 flex-col overflow-hidden border-slate-200/80 shadow-sm">
          <div className="shrink-0 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>
          <CardBody className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
            <div className="space-y-6">
              {Array.from({ length: 3 }).map((_, si) => (
                <div key={si} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-2 w-2 rounded-full" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <div className="space-y-3">
                    {Array.from({ length: 2 }).map((_, ti) => (
                      <div key={ti} className="animate-pulse overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                        <div className="flex items-center justify-between gap-4 px-4 py-3.5">
                          <div className="min-w-0 flex-1 space-y-1">
                            <Skeleton className="h-4 w-40 max-w-full" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                          <Skeleton className="h-1.5 w-24 rounded-full" />
                          <Skeleton className="h-4 w-4 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

/** Public tracking page skeleton — mirrors the header + two-column layout. */
export function PublicTrackingPageSkeleton() {
  return (
    <div className="space-y-5 p-4 pb-10 sm:p-6 sm:pb-12">
      {/* header card */}
      <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/90 shadow-card">
        <div className="bg-gradient-to-br from-primary-50/90 via-white to-emerald-50/50 px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-6 w-28 rounded-lg" />
              <Skeleton className="h-9 w-64 max-w-full" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-6 border-t border-slate-200/60 pt-5">
            <Skeleton className="h-[88px] w-[88px] shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-40" />
              <Skeleton className="mt-1 h-2.5 w-full max-w-sm rounded-full" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </div>
      </div>

      {/* two-column */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)] lg:items-start">
        {/* services */}
        <div className="rounded-2xl border border-white/60 bg-white/90 shadow-card">
          <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="mt-1 h-3 w-48" />
          </div>
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
                <div className="flex items-center justify-between gap-4 px-4 py-3.5">
                  <div className="min-w-0 flex-1 space-y-1">
                    <Skeleton className="h-4 w-36 max-w-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-1.5 w-16 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* activity */}
        <div className="rounded-2xl border border-white/60 bg-white/90 shadow-card">
          <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="mt-1 h-3 w-44" />
          </div>
          <div className="p-4">
            <ul className="space-y-0">
              {Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="relative flex animate-pulse gap-3 pb-5 last:pb-0">
                  <Skeleton className="mt-0.5 h-7 w-7 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-1.5 rounded-xl bg-slate-50/60 px-3 py-2.5 ring-1 ring-slate-100">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-2.5 w-24" />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Full dashboard chrome placeholder while session loads. */
export function DashboardShellSkeleton() {
  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-4 lg:block">
        <Skeleton className="mb-6 h-8 w-32" />
        <div className="space-y-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-6">
        <Skeleton className="mb-6 h-8 w-48" />
        <SkeletonStatCardsRow count={4} />
      </main>
    </div>
  );
}
