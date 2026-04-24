"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Search, Trash2 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/modal";
import {
  DataTable,
  DataTableBulkBar,
  DataTableToolbar,
} from "@/components/ui/data-table";
import type { DataColumn } from "@/components/ui/data-table";
import type { UserRole } from "@/models/User";
import { apiFetch } from "@/lib/auth-fetch";

type Loc = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
};

type ListRes = {
  locations: Loc[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function LocationsPageClient({ role }: { role: UserRole }) {
  const isAdmin = role === "admin";
  const [rows, setRows] = useState<Loc[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput), 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      params.set("sort", sort);
      params.set("order", order);
      if (search.trim()) params.set("search", search.trim());
      const res = await apiFetch(`/api/locations?${params}`);
      const data = (await res.json()) as ListRes & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setRows(data.locations);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sort, order, search]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, sort, order]);

  const allSelected = useMemo(() => {
    if (rows.length === 0) return false;
    return rows.every((r) => selected.has(r.id));
  }, [rows, selected]);

  function toggleAll() {
    if (allSelected) {
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

  async function bulkDelete() {
    if (!isAdmin || selected.size === 0) return;
    if (!window.confirm(`Delete ${selected.size} location(s)?`)) return;
    try {
      const res = await apiFetch("/api/locations/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setSelected(new Set());
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function createLoc(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email: email || undefined, phone, address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setModalOpen(false);
      setName("");
      setEmail("");
      setPhone("");
      setAddress("");
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  const columns: DataColumn<Loc>[] = useMemo(
    () => [
      {
        id: "name",
        header: "Name",
        cell: (r) => (
          <Link
            href={`/dashboard/locations/view?id=${encodeURIComponent(r.id)}`}
            className="font-medium text-slate-900 hover:text-primary-600 hover:underline"
          >
            {r.name}
          </Link>
        ),
      },
      { id: "email", header: "Email", cell: (r) => r.email || "—" },
      { id: "phone", header: "Phone", cell: (r) => r.phone || "—" },
      {
        id: "address",
        header: "Address",
        cell: (r) => <span className="line-clamp-2 max-w-xs">{r.address || "—"}</span>,
      },
      {
        id: "created",
        header: "Created",
        cell: (r) => (
          <span className="text-xs text-slate-500">
            {new Date(r.createdAt).toLocaleString()}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: (r) => (
          <Link
            href={`/dashboard/locations/view?id=${encodeURIComponent(r.id)}`}
            className="text-xs font-medium text-primary-600 hover:underline"
          >
            Open
          </Link>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Locations</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage franchise locations and contact details.
          </p>
        </div>
        {isAdmin ? (
          <Button
            type="button"
            className="inline-flex items-center gap-2"
            onClick={() => setModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add location
          </Button>
        ) : null}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add location"
        description="Create a new location record."
      >
        <form onSubmit={createLoc} className="space-y-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      <Card>
        <CardBody className="space-y-4">
          <DataTableToolbar>
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm shadow-sm outline-none ring-primary-200 focus:border-primary-300 focus:ring-4"
                placeholder="Search locations…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="createdAt">Sort: Created</option>
                <option value="name">Sort: Name</option>
                <option value="email">Sort: Email</option>
              </select>
              <Button
                type="button"
                variant="secondary"
                className="!py-2"
                onClick={() => setOrder((o) => (o === "asc" ? "desc" : "asc"))}
              >
                {order === "asc" ? "Asc" : "Desc"}
              </Button>
            </div>
          </DataTableToolbar>

          {isAdmin ? (
            <DataTableBulkBar count={selected.size} onClear={() => setSelected(new Set())}>
              <Button
                type="button"
                variant="danger"
                className="inline-flex items-center gap-2 !py-2 !text-xs"
                onClick={() => void bulkDelete()}
              >
                <Trash2 className="h-4 w-4" />
                Delete selected
              </Button>
            </DataTableBulkBar>
          ) : null}

          {error && rows.length > 0 ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : null}

          <DataTable
            columns={columns}
            rows={rows}
            rowId={(r) => r.id}
            selectable={isAdmin}
            selectedIds={selected}
            onToggleRow={toggleOne}
            onToggleAllPage={toggleAll}
            allSelectedOnPage={allSelected}
            loading={loading}
            emptyMessage="No locations found."
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
