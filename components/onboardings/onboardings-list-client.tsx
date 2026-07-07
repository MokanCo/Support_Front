"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Eye, RefreshCw, Search, SlidersHorizontal, X } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  DataTable,
  DataTableToolbar,
} from "@/components/ui/data-table";
import type { DataColumn } from "@/components/ui/data-table";
import {
  fetchOnboardingRequestsList,
  onboardingListQueryKey,
  syncOnboardingTemplates,
  ONBOARDING_STATUS_LABELS,
  ONBOARDING_STATUS_STYLES,
  type OnboardingListRow,
  type OnboardingStatus,
} from "@/lib/queries/onboarding-admin";

function StatusBadge({ status }: { status: OnboardingStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${ONBOARDING_STATUS_STYLES[status]}`}
    >
      {ONBOARDING_STATUS_LABELS[status]}
    </span>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function OnboardingsListClient({ role }: { role?: string }) {
  const isSupport = role === "support";
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | OnboardingStatus>(isSupport ? "in_progress" : "");
  const [service, setService] = useState("");
  const [sort] = useState("submittedAt");
  const [order] = useState<"asc" | "desc">("desc");
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSyncTemplates() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const result = await syncOnboardingTemplates();
      setSyncMsg({ ok: true, text: `Templates synced — ${result.synced ?? 0} service(s) updated.` });
    } catch (e) {
      setSyncMsg({ ok: false, text: e instanceof Error ? e.message : "Sync failed. Try again." });
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    const t = window.setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const filters = useMemo(
    () => ({
      page,
      pageSize,
      sort,
      order,
      search: search.trim() || undefined,
      status: status || undefined,
      service: service.trim() || undefined,
    }),
    [page, pageSize, sort, order, search, status, service],
  );

  const query = useQuery({
    queryKey: onboardingListQueryKey(filters),
    queryFn: () => fetchOnboardingRequestsList(filters),
  });

  const rows = query.data?.requests ?? [];
  const totalPages = query.data?.totalPages ?? 1;
  const loading = query.isPending && !query.data;

  const columns: DataColumn<OnboardingListRow>[] = [
    {
      id: "trackingId",
      header: "Tracking ID",
      cell: (row) =>
        row.trackingId ? (
          <Link
            href={`/dashboard/onboardings/view?id=${row.id}`}
            className="font-mono text-sm font-semibold text-primary-700 hover:underline"
          >
            {row.trackingId}
          </Link>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
    {
      id: "locationName",
      header: "Location",
      cell: (row) => (
        <span className="font-medium text-slate-900">{row.locationName}</span>
      ),
    },
    {
      id: "ownerName",
      header: "Owner",
      cell: (row) => row.ownerName,
    },
    {
      id: "email",
      header: "Email",
      cell: (row) => (
        <span className="text-sm text-slate-600">{row.email}</span>
      ),
    },
    {
      id: "phone",
      header: "Phone",
      cell: (row) => row.phone,
    },
    {
      id: "submittedAt",
      header: "Submitted",
      cell: (row) => formatDate(row.submittedAt),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: "actions",
      header: "",
      className: "w-12 text-right",
      cell: (row) => (
        <button
          type="button"
          onClick={() =>
            router.push(`/dashboard/onboardings/view?id=${row.id}`)
          }
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-primary-700"
          aria-label={`View onboarding ${row.locationName}`}
        >
          <Eye className="h-4 w-4" />
        </button>
      ),
    },
  ];

  const hasActiveFilters = !isSupport && (status !== "" || service.trim() !== "");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Onboardings
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review location onboarding requests, approve accounts, and manage service tasks.
          </p>
        </div>
        {!isSupport && (
          <div className="flex shrink-0 flex-col items-end gap-2">
            <button
              type="button"
              onClick={() => void handleSyncTemplates()}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing…" : "Sync Templates"}
            </button>
            {syncMsg && (
              <p className={`text-xs font-medium ${syncMsg.ok ? "text-emerald-700" : "text-red-600"}`}>
                {syncMsg.text}
              </p>
            )}
          </div>
        )}
      </div>

      <Card>
        <CardBody className="space-y-4 p-0 sm:p-0">
          <DataTableToolbar className="border-b border-slate-100 px-4 py-3 sm:px-5">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  placeholder="Search tracking ID, location, owner, email…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => setSearchInput("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Filters row */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 shadow-sm">
                  <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <select
                    value={status}
                    onChange={(e) => { setStatus(e.target.value as "" | OnboardingStatus); setPage(1); }}
                    className="h-9 bg-transparent py-0 text-sm text-slate-700 outline-none"
                    aria-label="Filter by status"
                  >
                    {!isSupport && <option value="">All statuses</option>}
                    {!isSupport && <option value="pending">Pending</option>}
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    {!isSupport && <option value="rejected">Rejected</option>}
                  </select>
                </div>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={() => { setStatus(""); setService(""); setPage(1); }}
                    className="flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear
                  </button>
                )}
              </div>
            </div>
          </DataTableToolbar>

          <div className="px-2 sm:px-4">
            <DataTable
              columns={columns}
              rows={rows}
              rowId={(r) => r.id}
              selectedIds={new Set()}
              onToggleRow={() => {}}
              onToggleAllPage={() => {}}
              allSelectedOnPage={false}
              loading={loading}
              emptyMessage="No onboarding requests yet."
              onRowClick={(r) =>
                router.push(`/dashboard/onboardings/view?id=${r.id}`)
              }
            />
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 sm:px-6">
            <p className="text-sm text-slate-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
