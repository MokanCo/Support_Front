"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { Check, ChevronLeft, ChevronRight, Loader2, Plus, Search, Trash2, X } from "lucide-react";
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
import type { UserRole } from "@/lib/user-roles";
import { apiFetch } from "@/lib/auth-fetch";
import {
  fetchLocationDeleteImpact,
  fetchLocationsList,
  locationListQueryKey,
  makeLocationPrimary,
  type LocationRow,
} from "@/lib/queries/locations";
import { invalidateLocations } from "@/lib/queries/invalidate";
import { queryKeys } from "@/lib/query-keys";
import { formatUSPhone } from "@/lib/format";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import type { AddressSuggestion } from "@/components/ui/address-autocomplete";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";

type Loc = LocationRow & {
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  createdAt: string;
};

function PrimaryBadge() {
  return (
    <span
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold leading-none text-white"
      title="Primary location"
    >
      P
    </span>
  );
}

export function LocationsPageClient({ role }: { role: UserRole }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isAdmin = role === "admin";
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [sort, setSort] = useState("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [editZip, setEditZip] = useState("");
  const [savingRow, setSavingRow] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput), 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const listFilters = useMemo(
    () => ({ page, pageSize, sort, order, search: search.trim() || undefined }),
    [page, pageSize, sort, order, search],
  );

  const locationsQuery = useQuery({
    queryKey: locationListQueryKey(listFilters),
    queryFn: () => fetchLocationsList(listFilters),
  });

  const rows = (locationsQuery.data?.locations ?? []) as Loc[];
  const total = locationsQuery.data?.total ?? 0;
  const totalPages = locationsQuery.data?.totalPages ?? 1;
  const loading = locationsQuery.isPending && !locationsQuery.data;

  const refreshLocations = useCallback(() => {
    void invalidateLocations(queryClient);
  }, [queryClient]);

  const listFiltersRef = useRef({ search, sort, order });
  useEffect(() => {
    const prev = listFiltersRef.current;
    const filtersChanged =
      prev.search !== search || prev.sort !== sort || prev.order !== order;
    listFiltersRef.current = { search, sort, order };
    if (filtersChanged && page !== 1) {
      setPage(1);
    }
  }, [page, search, sort, order]);

  const selectableRows = useMemo(
    () => rows.filter((r) => !r.isPrimary),
    [rows],
  );

  const allSelected = useMemo(() => {
    if (selectableRows.length === 0) return false;
    return selectableRows.every((r) => selected.has(r.id));
  }, [selectableRows, selected]);

  function toggleAll() {
    if (allSelected) {
      setSelected((prev) => {
        const n = new Set(prev);
        for (const r of selectableRows) n.delete(r.id);
        return n;
      });
    } else {
      setSelected((prev) => {
        const n = new Set(prev);
        for (const r of selectableRows) n.add(r.id);
        return n;
      });
    }
  }

  function toggleOne(id: string) {
    const row = rows.find((r) => r.id === id);
    if (row?.isPrimary) return;
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function bulkDelete() {
    if (!isAdmin || selected.size === 0) return;
    const ids = [...selected];
    let totalUsers = 0;
    let locationsWithTickets = 0;
    try {
      const impacts = await Promise.all(ids.map((id) => fetchLocationDeleteImpact(id)));
      for (const impact of impacts) {
        totalUsers += impact.userCount;
        if (impact.ticketCount > 0) locationsWithTickets += 1;
      }
    } catch (e) {
      void Swal.fire({
        icon: "error",
        title: "Could not check locations",
        text: e instanceof Error ? e.message : "Failed",
      });
      return;
    }
    if (locationsWithTickets > 0) {
      void Swal.fire({
        icon: "error",
        title: "Cannot delete",
        html: `${locationsWithTickets} selected location(s) still have tickets. Remove or reassign those tickets first.`,
      });
      return;
    }
    const userLine =
      totalUsers > 0
        ? `<p class="mt-3 text-sm text-slate-700"><strong>${totalUsers}</strong> user${totalUsers === 1 ? "" : "s"} assigned to these locations will also be permanently deleted.</p>`
        : "";
    const r = await Swal.fire({
      title: "Delete locations?",
      html: `<p>${ids.length} location(s) will be permanently removed.</p>${userLine}<p class="mt-3 text-sm text-slate-600">Do you want to continue?</p>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#dc2626",
    });
    if (!r.isConfirmed) return;
    try {
      const res = await apiFetch("/api/locations/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = (await res.json()) as { error?: string; deleted?: number; deletedUsers?: number };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setSelected(new Set());
      void refreshLocations();
      const removedUsers = Number(data.deletedUsers) || 0;
      if (removedUsers > 0) {
        void Swal.fire({
          icon: "success",
          title: "Locations deleted",
          text: `Removed ${data.deleted ?? ids.length} location(s) and ${removedUsers} user(s).`,
          timer: 3500,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  function startEditLoc(r: Loc) {
    setEditingId(r.id);
    setEditName(r.name);
    setEditEmail(r.email);
    setEditPhone(r.phone);
    setEditAddress(r.address);
    setEditCity(r.city);
    setEditState(r.state);
    setEditZip(r.zip);
  }

  async function saveEditLoc() {
    if (!editingId) return;
    setSavingRow(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/locations/${encodeURIComponent(editingId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          email: editEmail.trim(),
          phone: editPhone.trim(),
          address: editAddress.trim(),
          city: editCity.trim(),
          state: editState.trim(),
          zip: editZip.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update");
      void refreshLocations();
      setEditingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSavingRow(false);
    }
  }

  async function toggleLocDisabled(r: Loc) {
    setError(null);
    try {
      const res = await apiFetch(`/api/locations/${encodeURIComponent(r.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDisabled: !r.isDisabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      void refreshLocations();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  async function setPrimaryLocation(r: Loc) {
    if (r.isPrimary) return;
    try {
      await makeLocationPrimary(r.id);
      void refreshLocations();
      void queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all });
    } catch (e) {
      void Swal.fire({
        icon: "error",
        title: "Could not set primary",
        text: e instanceof Error ? e.message : "Failed",
      });
    }
  }

  async function deleteLocationRow(r: Loc) {
    if (r.isPrimary) {
      void Swal.fire({
        icon: "info",
        title: "Primary location",
        text: "The primary location cannot be deleted. Mark another location as primary first.",
      });
      return;
    }
    setError(null);
    let impact: { userCount: number; ticketCount: number };
    try {
      impact = await fetchLocationDeleteImpact(r.id);
    } catch (e) {
      void Swal.fire({
        icon: "error",
        title: "Could not check location",
        text: e instanceof Error ? e.message : "Failed",
      });
      return;
    }
    if (impact.ticketCount > 0) {
      void Swal.fire({
        icon: "error",
        title: "Cannot delete location",
        html: `"${r.name}" still has <strong>${impact.ticketCount}</strong> ticket${impact.ticketCount === 1 ? "" : "s"}. Remove or reassign those tickets first.`,
      });
      return;
    }
    const userLine =
      impact.userCount > 0
        ? `<p class="mt-3 text-sm text-slate-700">All <strong>${impact.userCount}</strong> user${impact.userCount === 1 ? "" : "s"} at this location will also be permanently deleted.</p>`
        : "";
    const conf = await Swal.fire({
      title: "Delete location?",
      html: `<p>Remove <strong>${r.name}</strong>?</p>${userLine}<p class="mt-3 text-sm text-slate-600">Do you want to continue?</p>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#dc2626",
    });
    if (!conf.isConfirmed) return;
    try {
      const res = await apiFetch(`/api/locations/${encodeURIComponent(r.id)}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string; deletedUsers?: number };
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      void refreshLocations();
      const removedUsers = Number(data.deletedUsers) || 0;
      if (removedUsers > 0) {
        void Swal.fire({
          icon: "success",
          title: "Location deleted",
          text: `Removed "${r.name}" and ${removedUsers} user(s).`,
          timer: 3500,
        });
      }
    } catch (e) {
      void Swal.fire({
        icon: "error",
        title: "Could not delete",
        text: e instanceof Error ? e.message : "Delete failed",
      });
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
        body: JSON.stringify({ name, email: email || undefined, phone, address, city, state, zip }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setModalOpen(false);
      setName("");
      setEmail("");
      setPhone("");
      setAddress("");
      setCity("");
      setState("");
      setZip("");
      void refreshLocations();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  const columns: DataColumn<Loc>[] = useMemo(() => {
    const hideCreatedAndStatus = Boolean(isAdmin && editingId);
    return [
      {
        id: "name",
        header: "Name",
        cell: (r) =>
          isAdmin && editingId === r.id ? (
            <input
              aria-label="Name"
              className="w-full min-w-[7rem] rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          ) : (
            <Link
              href={`/dashboard/locations/view?id=${encodeURIComponent(r.id)}`}
              className="font-medium text-slate-900 hover:text-primary-600 hover:underline"
            >
              {r.name}
            </Link>
          ),
      },
      {
        id: "email",
        header: "Email",
        cell: (r) =>
          isAdmin && editingId === r.id ? (
            <input
              aria-label="Email"
              type="email"
              className="w-full min-w-[9rem] rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
            />
          ) : (
            <span>{r.email || "—"}</span>
          ),
      },
      {
        id: "phone",
        header: "Phone",
        cell: (r) =>
          isAdmin && editingId === r.id ? (
            <input
              aria-label="Phone"
              className="w-full min-w-[7rem] rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              value={editPhone}
              onChange={(e) => setEditPhone(formatUSPhone(e.target.value))}
            />
          ) : (
            <span>{r.phone || "—"}</span>
          ),
      },
      {
        id: "address",
        header: "Address",
        cell: (r) =>
          isAdmin && editingId === r.id ? (
            <input
              aria-label="Address"
              className="w-full min-w-[10rem] rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
            />
          ) : (
            <span className="line-clamp-2 max-w-xs">{r.address || "—"}</span>
          ),
      },
      {
        id: "city",
        header: "City",
        cell: (r) =>
          isAdmin && editingId === r.id ? (
            <input
              aria-label="City"
              className="w-full min-w-[5rem] rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              value={editCity}
              onChange={(e) => setEditCity(e.target.value)}
            />
          ) : (
            <span className="text-slate-600">{r.city || "—"}</span>
          ),
      },
      {
        id: "state",
        header: "St",
        cell: (r) =>
          isAdmin && editingId === r.id ? (
            <input
              aria-label="State"
              className="w-14 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              value={editState}
              onChange={(e) => setEditState(e.target.value)}
            />
          ) : (
            <span className="text-slate-600">{r.state || "—"}</span>
          ),
      },
      {
        id: "zip",
        header: "Zip",
        cell: (r) =>
          isAdmin && editingId === r.id ? (
            <input
              aria-label="Zip"
              className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              value={editZip}
              onChange={(e) => setEditZip(e.target.value)}
            />
          ) : (
            <span className="text-slate-600">{r.zip || "—"}</span>
          ),
      },
      ...(hideCreatedAndStatus
        ? []
        : [
            {
              id: "created" as const,
              header: "Created",
              cell: (r: Loc) => (
                <span className="text-xs text-slate-500">
                  {new Date(r.createdAt).toLocaleString()}
                </span>
              ),
            },
            {
              id: "status" as const,
              header: "Status",
              cell: (r: Loc) => (
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                    r.isDisabled
                      ? "bg-red-50 text-red-700 ring-1 ring-red-100"
                      : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100"
                  }`}
                >
                  {r.isDisabled ? "Inactive" : "Active"}
                </span>
              ),
            },
          ]),
      {
        id: "actions",
        header: <span className="sr-only">Actions</span>,
        cell: (r) =>
          isAdmin ? (
            editingId === r.id ? (
              <div className="flex items-center justify-end gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  disabled={savingRow}
                  onClick={() => void saveEditLoc()}
                  className="px-2.5"
                  aria-label={savingRow ? "Saving changes" : "Save changes"}
                >
                  {savingRow ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                  ) : (
                    <Check className="h-4 w-4 shrink-0" aria-hidden />
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="px-2.5"
                  onClick={() => setEditingId(null)}
                  aria-label="Cancel editing"
                >
                  <X className="h-4 w-4 shrink-0" aria-hidden />
                </Button>
              </div>
            ) : (
              <RowActionsMenu
                items={[
                  {
                    id: "view",
                    label: "View location",
                    onClick: () =>
                      router.push(
                        `/dashboard/locations/view?id=${encodeURIComponent(r.id)}`,
                      ),
                  },
                  { id: "edit", label: "Edit", onClick: () => startEditLoc(r) },
                  ...(!r.isPrimary
                    ? [
                        {
                          id: "primary",
                          label: "Make primary",
                          onClick: () => void setPrimaryLocation(r),
                        },
                      ]
                    : []),
                  {
                    id: "toggle",
                    label: r.isDisabled ? "Enable" : "Disable",
                    onClick: () => void toggleLocDisabled(r),
                  },
                  ...(!r.isPrimary
                    ? [
                        {
                          id: "delete",
                          label: "Delete",
                          danger: true,
                          onClick: () => void deleteLocationRow(r),
                        },
                      ]
                    : []),
                ]}
              />
            )
          ) : (
            <Link
              href={`/dashboard/locations/view?id=${encodeURIComponent(r.id)}`}
              className="text-xs font-medium text-primary-600 hover:underline"
            >
              Open
            </Link>
          ),
      },
    ];
  }, [
      isAdmin,
      editingId,
      editName,
      editEmail,
      editPhone,
      editAddress,
      editCity,
      editState,
      editZip,
      savingRow,
      router,
    ],
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
          <Input
            label="Phone"
            type="tel"
            placeholder="(555) 000-0000"
            maxLength={14}
            value={phone}
            onChange={(e) => setPhone(formatUSPhone(e.target.value))}
          />
          <AddressAutocomplete
            label="Address"
            value={address}
            required
            onChange={(v) => setAddress(v)}
            onSelect={(s: AddressSuggestion) => {
              setAddress(s.street || s.displayName.split(",")[0]);
              setCity(s.city);
              setState(s.state);
              setZip(s.zip);
            }}
          />
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="col-span-1">
              <Input label="State" value={state} onChange={(e) => setState(e.target.value)} />
            </div>
            <div className="col-span-1">
              <Input label="Zip" value={zip} onChange={(e) => setZip(e.target.value)} />
            </div>
          </div>
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
                size="sm"
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
                size="sm"
                className="gap-2"
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
            isRowSelectable={(r) => !r.isPrimary}
            renderRowSelect={(r) => (r.isPrimary ? <PrimaryBadge /> : null)}
            loading={loading}
            emptyMessage="No locations found."
            onRowClick={(r) => {
              if (editingId !== null) return;
              router.push(`/dashboard/locations/view?id=${encodeURIComponent(r.id)}`);
            }}
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
                size="sm"
                disabled={page <= 1}
                className="gap-1"
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
                size="sm"
                disabled={page >= totalPages}
                className="gap-1"
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
