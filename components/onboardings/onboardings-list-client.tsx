"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Eye, Search } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  DataTable,
  DataTableToolbar,
} from "@/components/ui/data-table";
import type { DataColumn } from "@/components/ui/data-table";
import {
  fetchOnboardingRequestsList,
  onboardingListQueryKey,
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

export function OnboardingsListClient() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | OnboardingStatus>("");
  const [service, setService] = useState("");
  const [sort] = useState("submittedAt");
  const [order] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput), 300);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Onboardings
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Review location onboarding requests, approve accounts, and manage
          service tasks.
        </p>
      </div>

      <Card>
        <CardBody className="space-y-4 p-0 sm:p-0">
          <DataTableToolbar className="border-b border-slate-100 px-4 py-3 sm:px-6">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              <div className="relative min-w-[200px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search tracking ID, location, owner, email…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as "" | OnboardingStatus)
                }
                className="w-40"
              >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </Select>
              <Input
                placeholder="Filter by service slug"
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="w-44"
              />
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
