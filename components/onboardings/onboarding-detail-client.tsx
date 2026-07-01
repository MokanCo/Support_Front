"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import {
  ArrowLeft,
  Building2,
  Check,
  ChevronDown,
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  User,
} from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { ProgressCircle } from "@/components/ui/progress-circle";
import {
  approveOnboardingRequest,
  fetchOnboardingDetail,
  onboardingDetailQueryKey,
  ONBOARDING_STATUS_LABELS,
  ONBOARDING_STATUS_STYLES,
  rejectOnboardingRequest,
  updateOnboardingTask,
  type OnboardingServiceGroup,
  type OnboardingServiceSectionGroup,
  type OnboardingTask,
} from "@/lib/queries/onboarding-admin";
import { resolveServiceSections } from "@/components/onboardings/onboarding-service-sections";

function StatusBadge({ status }: { status: string }) {
  const key = status as keyof typeof ONBOARDING_STATUS_STYLES;
  const style =
    ONBOARDING_STATUS_STYLES[key] ?? "bg-slate-100 text-slate-700 ring-slate-200";
  const label =
    ONBOARDING_STATUS_LABELS[key as keyof typeof ONBOARDING_STATUS_LABELS] ?? status;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${style}`}
    >
      {label}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="rounded-xl bg-slate-50/80 px-3 py-2.5 ring-1 ring-slate-100">
      <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function ServiceProgress({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="flex min-w-[88px] flex-col items-end gap-1">
      <span className="text-xs font-semibold text-slate-600">
        {completed}/{total}
      </span>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary-500 to-emerald-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ServiceAccordion({
  group,
  requestId,
  canEdit,
  onTaskUpdated,
}: {
  group: OnboardingServiceGroup;
  requestId: string;
  canEdit: boolean;
  onTaskUpdated: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const completed = group.tasks.filter((t) => t.completed).length;
  const allDone = completed === group.tasks.length && group.tasks.length > 0;

  async function toggleTask(task: OnboardingTask) {
    if (!canEdit) return;
    setSavingTaskId(task.id);
    try {
      await updateOnboardingTask(requestId, task.id, {
        completed: !task.completed,
      });
      onTaskUpdated();
    } catch (e) {
      void Swal.fire({
        icon: "error",
        title: "Could not update task",
        text: e instanceof Error ? e.message : "Try again",
      });
    } finally {
      setSavingTaskId(null);
    }
  }

  async function saveComment(
    task: OnboardingTask,
    field: "publicComment" | "internalNote",
    value: string,
  ) {
    if (!canEdit) return;
    setSavingTaskId(task.id);
    try {
      await updateOnboardingTask(requestId, task.id, { [field]: value });
      onTaskUpdated();
    } catch (e) {
      void Swal.fire({
        icon: "error",
        title: "Could not save",
        text: e instanceof Error ? e.message : "Try again",
      });
    } finally {
      setSavingTaskId(null);
    }
  }

  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md ${
        allDone ? "border-emerald-200/80" : "border-slate-200/80"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left transition-colors ${
          allDone
            ? "bg-gradient-to-r from-emerald-50/90 to-white"
            : "bg-gradient-to-r from-slate-50/90 to-white hover:from-primary-50/40"
        }`}
      >
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">{group.title}</p>
          <p className="text-xs text-slate-500">
            {allDone ? "All tasks complete" : `${completed} of ${group.tasks.length} done`}
          </p>
        </div>
        <ServiceProgress completed={completed} total={group.tasks.length} />
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="divide-y divide-slate-100 border-t border-slate-100">
          {group.tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              canEdit={canEdit}
              saving={savingTaskId === task.id}
              onToggle={() => toggleTask(task)}
              onSaveComment={(field, value) => saveComment(task, field, value)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskRow({
  task,
  canEdit,
  saving,
  onToggle,
  onSaveComment,
}: {
  task: OnboardingTask;
  canEdit: boolean;
  saving: boolean;
  onToggle: () => void;
  onSaveComment: (
    field: "publicComment" | "internalNote",
    value: string,
  ) => void;
}) {
  const [publicComment, setPublicComment] = useState(task.publicComment);
  const [internalNote, setInternalNote] = useState(task.internalNote);

  return (
    <div className="space-y-3 px-4 py-3.5 transition-colors hover:bg-slate-50/50">
      <div className="flex items-start gap-3">
        <button
          type="button"
          disabled={!canEdit || saving}
          onClick={onToggle}
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-all ${
            task.completed
              ? "border-emerald-600 bg-emerald-600 text-white shadow-sm shadow-emerald-200"
              : "border-slate-300 bg-white hover:border-primary-400 hover:bg-primary-50/50"
          }`}
          aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : task.completed ? (
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          ) : null}
        </button>
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-medium leading-snug ${
              task.completed ? "text-slate-500 line-through" : "text-slate-900"
            }`}
          >
            {task.title}
          </p>
          {task.completed && task.completedAt && (
            <p className="mt-1 text-xs text-emerald-700">
              Completed {new Date(task.completedAt).toLocaleString()}
              {task.completedByName ? ` · ${task.completedByName}` : ""}
            </p>
          )}
        </div>
      </div>
      {canEdit && (
        <div className="grid gap-3 pl-9 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">
              Public comment
            </label>
            <Textarea
              rows={2}
              value={publicComment}
              onChange={(e) => setPublicComment(e.target.value)}
              onBlur={() => {
                if (publicComment !== task.publicComment) {
                  onSaveComment("publicComment", publicComment);
                }
              }}
              className="text-sm"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">
              Internal note
            </label>
            <Textarea
              rows={2}
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              onBlur={() => {
                if (internalNote !== task.internalNote) {
                  onSaveComment("internalNote", internalNote);
                }
              }}
              className="text-sm"
            />
          </div>
        </div>
      )}
      {!canEdit && task.publicComment && (
        <p className="pl-9 text-xs text-slate-600">{task.publicComment}</p>
      )}
    </div>
  );
}

export function OnboardingDetailClient({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const [approving, setApproving] = useState(false);

  const query = useQuery({
    queryKey: onboardingDetailQueryKey(id),
    queryFn: () => fetchOnboardingDetail(id),
    refetchInterval: 15000,
  });

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: onboardingDetailQueryKey(id) });
  }, [queryClient, id]);

  const data = query.data;
  const req = data?.request;
  const canEdit = req?.status === "in_progress";
  const canApprove = req?.status === "pending";

  const progress = data?.progress.percent ?? req?.progressPercent ?? 0;

  const serviceSections: OnboardingServiceSectionGroup[] =
    data?.serviceSections && data.serviceSections.length > 0
      ? data.serviceSections
      : resolveServiceSections(undefined, data?.services ?? []);

  const totalServiceCount =
    serviceSections.reduce((n, s) => n + s.services.length, 0) ||
    (data?.services.length ?? 0);

  async function handleApprove() {
    const confirm = await Swal.fire({
      icon: "question",
      title: "Approve onboarding?",
      text: "This will generate a tracking ID, create tasks, and email the customer.",
      showCancelButton: true,
      confirmButtonText: "Approve",
    });
    if (!confirm.isConfirmed) return;
    setApproving(true);
    try {
      await approveOnboardingRequest(id);
      void Swal.fire({
        icon: "success",
        title: "Approved",
        timer: 2500,
        showConfirmButton: false,
      });
      refresh();
    } catch (e) {
      void Swal.fire({
        icon: "error",
        title: "Approval failed",
        text: e instanceof Error ? e.message : "Try again",
      });
    } finally {
      setApproving(false);
    }
  }

  async function handleReject() {
    const result = await Swal.fire({
      icon: "warning",
      title: "Reject request?",
      input: "textarea",
      inputPlaceholder: "Optional notes…",
      showCancelButton: true,
      confirmButtonText: "Reject",
    });
    if (!result.isConfirmed) return;
    try {
      await rejectOnboardingRequest(id, String(result.value ?? ""));
      void Swal.fire({
        icon: "success",
        title: "Rejected",
        timer: 2000,
        showConfirmButton: false,
      });
      refresh();
    } catch (e) {
      void Swal.fire({
        icon: "error",
        title: "Failed",
        text: e instanceof Error ? e.message : "Try again",
      });
    }
  }

  const timeline = useMemo(() => data?.activities ?? [], [data?.activities]);

  if (query.isPending && !data) {
    return (
      <div className="flex h-[calc(100dvh-8rem)] items-center justify-center text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading onboarding…
      </div>
    );
  }

  if (!req) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-slate-600">Onboarding request not found.</p>
        <Link
          href="/dashboard/onboardings"
          className="mt-4 inline-block text-sm font-medium text-primary-700 hover:underline"
        >
          Back to list
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col gap-4">
      <Link
        href="/dashboard/onboardings"
        className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Onboardings
      </Link>

      <div className="shrink-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
        <div className="bg-gradient-to-r from-primary-50/80 via-white to-emerald-50/40 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {req.trackingId && (
                  <span className="rounded-lg bg-white/80 px-2.5 py-0.5 font-mono text-xs font-semibold text-primary-700 ring-1 ring-primary-200/60">
                    {req.trackingId}
                  </span>
                )}
                <StatusBadge status={req.status} />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                {req.locationName}
              </h1>
              {req.businessName && (
                <p className="text-sm text-slate-500">{req.businessName}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {(canEdit || progress > 0) && (
                <div className="flex items-center gap-3 rounded-xl bg-white/70 px-3 py-2 ring-1 ring-slate-200/60">
                  <ProgressCircle value={progress} disabled size={52} />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Progress
                    </p>
                    <p className="text-lg font-bold text-slate-900">{progress}%</p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {canApprove && (
                  <>
                    <Button type="button" variant="secondary" onClick={handleReject}>
                      Reject
                    </Button>
                    <Button type="button" onClick={handleApprove} disabled={approving}>
                      {approving ? "Approving…" : "Approve"}
                    </Button>
                  </>
                )}
                {data?.trackingUrl && (
                  <a
                    href={data.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-primary-200 hover:bg-primary-50/50"
                  >
                    Tracking page
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:items-stretch">
        <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-0.5">
          <Card className="overflow-hidden border-slate-200/80 shadow-sm">
            <CardHeader className="shrink-0 border-b border-slate-100 bg-slate-50/50 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
                  <User className="h-4 w-4" />
                </span>
                <h2 className="text-sm font-semibold text-slate-900">Owner</h2>
              </div>
            </CardHeader>
            <CardBody className="p-4">
              <dl className="grid gap-2">
                <InfoRow label="Owner name" value={req.ownerName} />
                <InfoRow label="Email" value={req.email} />
                <InfoRow label="Phone" value={req.phone} />
                <InfoRow label="Business name" value={req.businessName} />
                <InfoRow label="Website" value={req.website} />
                <InfoRow label="Notes" value={req.notes} />
              </dl>
            </CardBody>
          </Card>

          <Card className="overflow-hidden border-slate-200/80 shadow-sm">
            <CardHeader className="shrink-0 border-b border-slate-100 bg-slate-50/50 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <MapPin className="h-4 w-4" />
                </span>
                <h2 className="text-sm font-semibold text-slate-900">Location</h2>
              </div>
            </CardHeader>
            <CardBody className="p-4">
              <dl className="grid gap-2">
                <InfoRow label="Location name" value={req.location.locationName} />
                <InfoRow label="Address" value={req.location.address} />
                <InfoRow label="City" value={req.location.city} />
                <InfoRow label="State" value={req.location.state} />
                <InfoRow label="ZIP" value={req.location.zip} />
                <InfoRow label="Country" value={req.location.country} />
                <InfoRow label="Category" value={req.location.businessCategory} />
                <InfoRow
                  label="Submitted"
                  value={new Date(req.submittedAt).toLocaleString()}
                />
              </dl>
            </CardBody>
          </Card>

          <Card className="overflow-hidden border-slate-200/80 shadow-sm">
            <CardHeader className="shrink-0 border-b border-slate-100 bg-slate-50/50 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200/80 text-slate-600">
                  <Clock className="h-4 w-4" />
                </span>
                <h2 className="text-sm font-semibold text-slate-900">Activity</h2>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              {timeline.length === 0 ? (
                <p className="p-4 text-sm text-slate-500">No activity yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {timeline.map((a) => (
                    <li key={a.id} className="flex gap-3 px-4 py-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                        <Clock className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">{a.title}</p>
                        {a.description && (
                          <p className="mt-0.5 text-xs text-slate-600">{a.description}</p>
                        )}
                        <p className="mt-1 text-[0.65rem] text-slate-400">
                          {new Date(a.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
          </div>
        </aside>

        <Card className="flex min-h-0 min-w-0 flex-col overflow-hidden border-slate-200/80 shadow-sm">
          <CardHeader className="shrink-0 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
                  <Building2 className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Service tasks</h2>
                  <p className="text-xs text-slate-500">
                    {totalServiceCount} services
                    {canApprove ? " · preview until approved" : ""}
                  </p>
                </div>
              </div>
              {canEdit && data?.progress && (
                <p className="text-xs font-medium text-slate-500">
                  {data.progress.completedTasks}/{data.progress.totalTasks} tasks
                </p>
              )}
            </div>
          </CardHeader>
          <CardBody className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
            {serviceSections.length === 0 ? (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 text-center">
                <Building2 className="mb-3 h-10 w-10 text-slate-300" />
                <p className="text-sm text-slate-600">
                  {canApprove
                    ? "Approve this request to generate service checklists."
                    : "No service tasks yet."}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {serviceSections.map((section) => (
                  <div key={section.title} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-primary-500" />
                      <h3 className="text-xs font-bold uppercase tracking-wide text-primary-800">
                        {section.title}
                      </h3>
                      {canApprove && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                          Preview
                        </span>
                      )}
                    </div>
                    <div className="space-y-3">
                      {section.services.map((group) => (
                        <ServiceAccordion
                          key={group.slug}
                          group={group}
                          requestId={id}
                          canEdit={canEdit}
                          onTaskUpdated={refresh}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
