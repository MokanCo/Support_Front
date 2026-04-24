"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/Input";
import {
  DataTable,
  DataTableBulkBar,
  DataTableToolbar,
} from "@/components/ui/data-table";
import type { DataColumn } from "@/components/ui/data-table";
import { ProgressCircle } from "@/components/ui/progress-circle";
import { CreateTicketModal } from "@/components/tickets/create-ticket-modal";
import { StatusBadge, PriorityBadge, NewBadge } from "@/components/ui/badge";
import type { SerializedTicket } from "@/lib/serialize-ticket";
import type { UserRole } from "@/models/User";
import type { TicketStatus, TicketPriority } from "@/models/Ticket";
import { apiFetch } from "@/lib/auth-fetch";

type ListResponse = {
  tickets: SerializedTicket[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type Loc = { id: string; name: string };

const SORT_OPTIONS = [
  { value: "updatedAt", label: "Updated" },
  { value: "createdAt", label: "Created" },
  { value: "deadline", label: "Deadline" },
  { value: "progress", label: "Progress" },
  { value: "title", label: "Title" },
  { value: "status", label: "Status" },
  { value: "priority", label: "Priority" },
  { value: "ticketCode", label: "Ticket ID" },
] as const;

const NEW_TICKET_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600";

export function TicketsTable({ role }: { role: UserRole }) {
  const [locs, setLocs] = useState<Loc[]>([]);
  const [locationId, setLocationId] = useState("");
  const [rows, setRows] = useState<SerializedTicket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState<string>("updatedAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [overdue, setOverdue] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<TicketStatus | "">("");
  const [bulkPriority, setBulkPriority] = useState<TicketPriority | "">("");
  const [progressTicket, setProgressTicket] = useState<SerializedTicket | null>(null);
  const [progressInput, setProgressInput] = useState("0");

  const showLocFilter = role === "admin";
  const canBulk = role === "admin" || role === "support";

  const sortOptions = useMemo(() => {
    if (role === "partner") {
      return SORT_OPTIONS.filter(
        (o) => o.value !== "deadline" && o.value !== "priority"
      );
    }
    return [...SORT_OPTIONS];
  }, [role]);

  const pageIntro = useMemo(() => {
    if (role === "admin") {
      return {
        title: "Tickets",
        subtitle: "Search, filter, and manage work across locations.",
      };
    }
    if (role === "support") {
      return {
        title: "Your assigned tickets",
        subtitle: "Only tickets assigned to you appear here. Use filters to narrow your queue.",
      };
    }
    return {
      title: "Ticket history",
      subtitle: "All tickets for your location—open, in progress, and completed.",
    };
  }, [role]);

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput), 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!showLocFilter) return;
    let cancelled = false;
    void (async () => {
      try {
        const params = new URLSearchParams({ page: "1", pageSize: "200", sort: "name", order: "asc" });
        const res = await apiFetch(`/api/locations?${params}`);
        const data = await res.json();
        if (!cancelled && res.ok) setLocs(data.locations ?? []);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showLocFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      params.set("sort", sort);
      params.set("order", order);
      if (status) params.set("status", status);
      if (priority) params.set("priority", priority);
      if (overdue) params.set("overdue", "1");
      if (showLocFilter && locationId) params.set("locationId", locationId);
      if (search.trim()) params.set("search", search.trim());
      const res = await apiFetch(`/api/tickets?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      const list = data as ListResponse;
      setRows(list.tickets);
      setTotal(list.total);
      setTotalPages(list.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sort, order, status, priority, search, locationId, showLocFilter, overdue]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [status, priority, search, sort, order, locationId, overdue]);

  const allSelectedOnPage = useMemo(() => {
    if (rows.length === 0) return false;
    return rows.every((r) => selected.has(r.id));
  }, [rows, selected]);

  function toggleAll() {
    if (allSelectedOnPage) {
      setSelected((prev) => {
        const n = new Set(prev);
        for (const r of rows) n.delete(r.id);
        return n;
      });
    } else {
      setSelected((prev) => {
        const n = new Set(prev);
        for (const r of rows) n.add(r.id);
        return n;
      });
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleSort(field: string) {
    if (sort === field) setOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSort(field);
      setOrder("desc");
    }
  }

  async function bulkPost(
    body: Record<string, unknown>
  ) {
    const res = await apiFetch("/api/tickets/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Bulk action failed");
    setSelected(new Set());
    void load();
  }

  async function bulkDelete() {
    if (!canBulk || selected.size === 0) return;
    if (!window.confirm(`Delete ${selected.size} ticket(s)?`)) return;
    try {
      await bulkPost({ action: "delete", ids: [...selected] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  async function bulkApplyStatus() {
    if (!bulkStatus || selected.size === 0) return;
    try {
      await bulkPost({
        action: "status",
        ids: [...selected],
        status: bulkStatus,
      });
      setBulkStatus("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  async function bulkApplyPriority() {
    if (!bulkPriority || selected.size === 0) return;
    try {
      await bulkPost({
        action: "priority",
        ids: [...selected],
        priority: bulkPriority,
      });
      setBulkPriority("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  async function saveProgress() {
    if (!progressTicket) return;
    const v = Math.min(100, Math.max(0, Number(progressInput)));
    try {
      const res = await apiFetch(`/api/tickets/${progressTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress: v }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setProgressTicket(null);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  const columns: DataColumn<SerializedTicket>[] = useMemo(() => {
    const all: DataColumn<SerializedTicket>[] = [
      {
        id: "code",
        header: "Ticket ID",
        cell: (t) => (
          <span className="font-mono text-xs text-slate-600">{t.ticketCode ?? "—"}</span>
        ),
      },
      {
        id: "title",
        header: "Title",
        cell: (t) => (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/dashboard/tickets/${t.id}`}
              className="font-medium text-slate-900 hover:text-primary-600 hover:underline"
            >
              {t.title}
            </Link>
            {t.isNew ? <NewBadge /> : null}
          </div>
        ),
      },
      {
        id: "loc",
        header: "Location",
        cell: (t) => t.locationName ?? "—",
      },
      {
        id: "st",
        header: "Status",
        cell: (t) => <StatusBadge status={t.status} />,
      },
      {
        id: "pr",
        header: "Priority",
        cell: (t) => <PriorityBadge priority={t.priority} />,
      },
      {
        id: "prog",
        header: "Progress",
        cell: (t) => (
          <ProgressCircle
            value={t.progress}
            disabled={t.progress >= 100}
            onClick={() => {
              setProgressTicket(t);
              setProgressInput(String(t.progress));
            }}
          />
        ),
      },
      {
        id: "dl",
        header: "Deadline",
        cell: (t) => (
          <span
            className={`text-xs ${
              t.isOverdue ? "font-semibold text-red-600" : "text-slate-600"
            }`}
          >
            {t.deadline ? new Date(t.deadline).toLocaleDateString() : "—"}
            {t.isOverdue ? " · Overdue" : ""}
          </span>
        ),
      },
      {
        id: "cr",
        header: "Created",
        cell: (t) => (
          <span className="text-xs text-slate-500">
            {new Date(t.createdAt).toLocaleString()}
          </span>
        ),
      },
      {
        id: "as",
        header: "Assigned",
        cell: (t) => t.assignedToName ?? "—",
      },
    ];
    if (role === "partner") {
      return all.filter(
        (c) => !["loc", "pr", "dl"].includes(c.id)
      );
    }
    return all;
  }, [role]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{pageIntro.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{pageIntro.subtitle}</p>
        </div>
        {role === "partner" ? (
          <Link href="/dashboard/tickets/new" className={NEW_TICKET_PRIMARY}>
            <Plus className="h-4 w-4" />
            New ticket
          </Link>
        ) : (
          <Button
            type="button"
            className="inline-flex items-center gap-2 shadow-sm"
            onClick={() => setModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            New ticket
          </Button>
        )}
      </div>

      {role !== "partner" ? (
        <CreateTicketModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          role={role}
          onCreated={() => void load()}
        />
      ) : null}

      <Modal
        open={!!progressTicket}
        onClose={() => setProgressTicket(null)}
        title="Update progress"
        description={progressTicket?.title}
      >
        <div className="space-y-4">
          <Input
            label="Progress (%)"
            type="number"
            min={0}
            max={100}
            value={progressInput}
            onChange={(e) => setProgressInput(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setProgressTicket(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void saveProgress()}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <Card>
        <CardBody className="space-y-4">
          <DataTableToolbar>
            <div className="relative max-w-xl flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm shadow-sm outline-none ring-primary-200 focus:border-primary-300 focus:ring-4"
                placeholder="Search title, ID, category…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {showLocFilter ? (
                <Select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="!min-w-[180px]"
                >
                  <option value="">All locations</option>
                  {locs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </Select>
              ) : null}
              <Select value={status} onChange={(e) => setStatus(e.target.value)} className="!min-w-[140px]">
                <option value="">All statuses</option>
                <option value="in_queue">In queue</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </Select>
              {role !== "partner" ? (
                <Select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="!min-w-[140px]"
                >
                  <option value="">All priorities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Select>
              ) : null}
              {role !== "partner" ? (
                <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={overdue}
                    onChange={(e) => setOverdue(e.target.checked)}
                  />
                  Overdue
                </label>
              ) : null}
              <Select value={sort} onChange={(e) => setSort(e.target.value)} className="!min-w-[140px]">
                {sortOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    Sort: {o.label}
                  </option>
                ))}
              </Select>
              <Button
                type="button"
                variant="secondary"
                className="inline-flex items-center gap-2 !py-2.5"
                onClick={() => toggleSort(sort)}
              >
                <ArrowDownUp className="h-4 w-4" />
                {order === "asc" ? "Asc" : "Desc"}
              </Button>
            </div>
          </DataTableToolbar>

          {selected.size > 0 && canBulk ? (
            <DataTableBulkBar count={selected.size} onClear={() => setSelected(new Set())}>
              <Button
                type="button"
                variant="danger"
                className="inline-flex items-center gap-1 !py-2 !text-xs"
                onClick={() => void bulkDelete()}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
              <Select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value as TicketStatus | "")}
                className="!min-w-[140px]"
              >
                <option value="">Set status…</option>
                <option value="in_queue">In queue</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </Select>
              <Button
                type="button"
                variant="secondary"
                className="!py-2 !text-xs"
                disabled={!bulkStatus}
                onClick={() => void bulkApplyStatus()}
              >
                Apply status
              </Button>
              <Select
                value={bulkPriority}
                onChange={(e) => setBulkPriority(e.target.value as TicketPriority | "")}
                className="!min-w-[140px]"
              >
                <option value="">Set priority…</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </Select>
              <Button
                type="button"
                variant="secondary"
                className="!py-2 !text-xs"
                disabled={!bulkPriority}
                onClick={() => void bulkApplyPriority()}
              >
                Apply priority
              </Button>
            </DataTableBulkBar>
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <DataTable
            columns={columns}
            rows={rows}
            rowId={(r) => r.id}
            selectable={canBulk}
            selectedIds={selected}
            onToggleRow={toggleOne}
            onToggleAllPage={toggleAll}
            allSelectedOnPage={allSelectedOnPage}
            loading={loading}
            emptyMessage="No tickets found."
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Showing{" "}
              <span className="font-medium text-slate-700">
                {total === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}
              </span>{" "}
              of <span className="font-medium text-slate-700">{total}</span>
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={page <= 1}
                className="inline-flex items-center gap-1 !py-2 !text-xs"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
              <span className="text-xs text-slate-500">
                Page {page} / {totalPages}
              </span>
              <Button
                type="button"
                variant="secondary"
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 !py-2 !text-xs"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
