"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Eye, EyeOff, Loader2, Trash2, X } from "lucide-react";
import Swal from "sweetalert2";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { DataTable, DataTableBulkBar } from "@/components/ui/data-table";
import type { DataColumn } from "@/components/ui/data-table";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import type { UserRole } from "@/lib/user-roles";
import { apiFetch } from "@/lib/auth-fetch";
import { parseUsersListJson, unwrapUserResponse } from "@/lib/users-api";
import { usersListQueryOptions } from "@/lib/queries/users";
import {
  fetchLocationsList,
  locationListQueryKey,
} from "@/lib/queries/locations";
import { USERS_PANEL_LOCATIONS_FILTERS } from "@/lib/query-keys";
import { invalidateUsers } from "@/lib/queries/invalidate";

type Loc = { id: string; name: string };
type UserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  locationId: string;
  locationName: string | null;
  isDisabled: boolean;
  createdAt: string;
};

function mapUser(u: Record<string, unknown>, locs: Loc[]): UserRow {
  const locId = u.locationId != null ? String(u.locationId) : "";
  return {
    id: String(u.id ?? ""),
    name: String(u.name ?? ""),
    email: String(u.email ?? ""),
    role: (u.role as UserRole) ?? "partner",
    locationId: locId,
    locationName: locs.find((l) => l.id === locId)?.name ?? null,
    isDisabled: Boolean(u.isDisabled),
    createdAt: String(u.createdAt ?? ""),
  };
}

export function UsersPanel() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showCreatePwd, setShowCreatePwd] = useState(false);
  const [role, setRole] = useState<UserRole>("partner");
  const [locationId, setLocationId] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("partner");
  const [editLoc, setEditLoc] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editPwdVisible, setEditPwdVisible] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const locsQuery = useQuery({
    queryKey: locationListQueryKey(USERS_PANEL_LOCATIONS_FILTERS),
    queryFn: () => fetchLocationsList(USERS_PANEL_LOCATIONS_FILTERS),
  });

  const usersQuery = useQuery(usersListQueryOptions);

  const locs = useMemo(
    () =>
      (locsQuery.data?.locations ?? []).map((l) => ({ id: l.id, name: l.name })),
    [locsQuery.data],
  );

  const users = useMemo(() => {
    const raw = (usersQuery.data ?? []) as Record<string, unknown>[];
    return raw.map((u) => mapUser(u, locs));
  }, [usersQuery.data, locs]);

  const loading =
    (locsQuery.isPending && !locsQuery.data) ||
    (usersQuery.isPending && !usersQuery.data);

  useEffect(() => {
    const err = locsQuery.error ?? usersQuery.error;
    if (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } else {
      setError(null);
    }
  }, [locsQuery.error, usersQuery.error]);

  const refreshUsers = () => invalidateUsers(queryClient);

  useEffect(() => {
    if (!locationId && locs[0]?.id) setLocationId(locs[0].id);
  }, [locs, locationId]);

  const allSelected = useMemo(() => {
    if (users.length === 0) return false;
    return users.every((r) => selected.has(r.id));
  }, [users, selected]);

  function toggleAll() {
    if (allSelected) {
      setSelected((prev) => {
        const n = new Set(prev);
        for (const r of users) n.delete(r.id);
        return n;
      });
    } else {
      setSelected((prev) => {
        const n = new Set(prev);
        for (const r of users) n.add(r.id);
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

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await apiFetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          locationId,
        }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        const msg = (data as { error?: string }).error ?? "Failed to create user";
        throw new Error(
          res.status === 409 ? "This email already exists with another user." : msg,
        );
      }
      const created = unwrapUserResponse(data);
      if (!created?.id) throw new Error("Invalid create response");
      void refreshUsers();
      setName("");
      setEmail("");
      setPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setCreating(false);
    }
  }

  const startEdit = useCallback((u: UserRow) => {
    setEditingId(u.id);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditRole(u.role);
    setEditLoc(u.locationId);
    setEditPassword("");
    setEditPwdVisible(false);
    setSelected(new Set());
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditPassword("");
    setEditPwdVisible(false);
  }, []);

  const saveInline = useCallback(
    async (u: UserRow) => {
      const pwd = editPassword.trim();
      if (pwd.length > 0 && pwd.length < 8) {
        setError("New password must be at least 8 characters, or leave the password field empty.");
        return;
      }
      setSavingEdit(true);
      setError(null);
      try {
        const body: Record<string, unknown> = {
          name: editName.trim(),
          email: editEmail.trim(),
          role: editRole,
          locationId: editLoc,
        };
        if (pwd.length > 0) body.password = pwd;
        const res = await apiFetch(`/api/users/${u.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data: unknown = await res.json();
        if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to update");
        const updated = unwrapUserResponse(data);
        if (!updated) throw new Error("Invalid update response");
        void refreshUsers();
        setEditingId(null);
        setEditPassword("");
        setEditPwdVisible(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update");
      } finally {
        setSavingEdit(false);
      }
    },
    [editName, editEmail, editRole, editLoc, editPassword, locs],
  );

  const toggleDisabled = useCallback(async (u: UserRow) => {
    setError(null);
    try {
      const res = await apiFetch(`/api/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDisabled: !u.isDisabled }),
      });
      const data: unknown = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to update");
      const updated = unwrapUserResponse(data);
      if (!updated) throw new Error("Invalid update response");
      void refreshUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    }
  }, [locs, refreshUsers]);

  const confirmDelete = useCallback(
    async (u: UserRow) => {
      const r = await Swal.fire({
        title: "Delete user?",
        html: `Permanently remove <strong>${u.email}</strong>? This cannot be undone if the account is not linked to tickets.`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Delete",
        confirmButtonColor: "#dc2626",
      });
      if (!r.isConfirmed) return;
      setError(null);
      try {
        const res = await apiFetch(`/api/users/${u.id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Delete failed");
        void refreshUsers();
        setSelected((prev) => {
          const n = new Set(prev);
          n.delete(u.id);
          return n;
        });
      } catch (e) {
        void Swal.fire({
          icon: "error",
          title: "Could not delete",
          text: e instanceof Error ? e.message : "Delete failed",
        });
      }
    },
    [refreshUsers],
  );

  const bulkDeleteUsers = useCallback(async () => {
    if (selected.size === 0) return;
    const r = await Swal.fire({
      title: "Delete users?",
      text: `${selected.size} user account(s) will be removed when the server allows it.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#dc2626",
    });
    if (!r.isConfirmed) return;
    setError(null);
    const ids = [...selected];
    try {
      await Promise.all(
        ids.map(async (id) => {
          const res = await apiFetch(`/api/users/${id}`, { method: "DELETE" });
          const data = await res.json();
          if (!res.ok) throw new Error((data as { error?: string }).error ?? `Failed for ${id}`);
        }),
      );
      setSelected(new Set());
      if (editingId && ids.includes(editingId)) cancelEdit();
      void refreshUsers();
    } catch (e) {
      void Swal.fire({
        icon: "error",
        title: "Bulk delete incomplete",
        text: e instanceof Error ? e.message : "Delete failed",
      });
      void refreshUsers();
    }
  }, [selected, refreshUsers, editingId, cancelEdit]);

  const columns: DataColumn<UserRow>[] = useMemo(
    () => [
      {
        id: "name",
        header: "Name",
        cell: (u) =>
          editingId === u.id ? (
            <input
              aria-label="Name"
              className="w-full min-w-[7rem] rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          ) : (
            <span className="font-medium text-slate-900">{u.name}</span>
          ),
      },
      {
        id: "email",
        header: "Email",
        cell: (u) =>
          editingId === u.id ? (
            <input
              aria-label="Email"
              type="email"
              className="w-full min-w-[9rem] rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
            />
          ) : (
            <span className="text-slate-700">{u.email}</span>
          ),
      },
      {
        id: "role",
        header: "Role",
        cell: (u) =>
          editingId === u.id ? (
            <select
              aria-label="Role"
              className="w-full min-w-[6rem] rounded-lg border border-slate-200 px-2 py-1.5 text-sm capitalize"
              value={editRole}
              onChange={(e) => setEditRole(e.target.value as UserRole)}
            >
              <option value="admin">admin</option>
              <option value="support">support</option>
              <option value="partner">partner</option>
            </select>
          ) : (
            <span className="capitalize text-slate-700">{u.role}</span>
          ),
      },
      {
        id: "location",
        header: "Location",
        cell: (u) =>
          editingId === u.id ? (
            <select
              aria-label="Location"
              className="w-full min-w-[8rem] rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              value={editLoc}
              onChange={(e) => setEditLoc(e.target.value)}
            >
              {locs.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-slate-700">{u.locationName ?? "—"}</span>
          ),
      },
      {
        id: "password",
        header: "Password",
        cell: (u) =>
          editingId === u.id ? (
            <div className="min-w-[11rem]">
              <div className="relative">
                <input
                  aria-label="New password (optional)"
                  type={editPwdVisible ? "text" : "password"}
                  autoComplete="new-password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Optional · min 8 chars"
                  className="w-full rounded-lg border border-slate-200 py-1.5 pl-2 pr-9 text-sm placeholder:text-slate-400"
                />
                <button
                  type="button"
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100"
                  aria-label={editPwdVisible ? "Hide password" : "Show password"}
                  onClick={() => setEditPwdVisible((v) => !v)}
                >
                  {editPwdVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-0.5 text-[10px] text-slate-400">Empty keeps current password</p>
            </div>
          ) : (
            <span
              className="text-xs text-slate-600"
              title="Saved passwords are stored as a one-way hash only. The API never returns the real password—use Edit to set a new one."
            >
              Not retrievable
            </span>
          ),
      },
      {
        id: "status",
        header: "Status",
        cell: (u) => (
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              u.isDisabled
                ? "bg-red-50 text-red-700 ring-1 ring-red-100"
                : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100"
            }`}
          >
            {u.isDisabled ? "Disabled" : "Active"}
          </span>
        ),
      },
      {
        id: "actions",
        header: <span className="sr-only">Actions</span>,
        cell: (u) =>
          editingId === u.id ? (
            <div className="flex items-center justify-end gap-1.5">
              <Button
                type="button"
                size="sm"
                disabled={savingEdit}
                onClick={() => void saveInline(u)}
                className="px-2.5"
                aria-label={savingEdit ? "Saving changes" : "Save changes"}
              >
                {savingEdit ? (
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
                onClick={cancelEdit}
                aria-label="Cancel editing"
              >
                <X className="h-4 w-4 shrink-0" aria-hidden />
              </Button>
            </div>
          ) : (
            <RowActionsMenu
              aria-label="User actions"
              items={[
                { id: "edit", label: "Edit", onClick: () => startEdit(u) },
                {
                  id: "toggle",
                  label: u.isDisabled ? "Enable" : "Disable",
                  onClick: () => void toggleDisabled(u),
                },
                {
                  id: "delete",
                  label: "Delete",
                  danger: true,
                  onClick: () => void confirmDelete(u),
                },
              ]}
            />
          ),
      },
    ],
    [
      editingId,
      editName,
      editEmail,
      editRole,
      editLoc,
      editPassword,
      editPwdVisible,
      locs,
      savingEdit,
      startEdit,
      cancelEdit,
      saveInline,
      toggleDisabled,
      confirmDelete,
    ],
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Create user" />
        <CardBody>
          <form onSubmit={createUser} className="grid gap-4 sm:grid-cols-2">
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div className="relative sm:col-span-2 sm:max-w-md">
              <Input
                label="Password"
                type={showCreatePwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              <button
                type="button"
                className="absolute right-0 top-7 z-10 rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                aria-label={showCreatePwd ? "Hide password" : "Show password"}
                onClick={() => setShowCreatePwd((v) => !v)}
              >
                {showCreatePwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Select
              label="Role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
            >
              <option value="admin">admin</option>
              <option value="support">support</option>
              <option value="partner">partner</option>
            </Select>
            <div className="sm:col-span-2">
              <Select
                label="Location"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                required
              >
                {locs.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={creating || locs.length === 0}>
                {creating ? "Creating…" : "Create user"}
              </Button>
            </div>
          </form>
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="All users" />
        <CardBody className="space-y-3 p-4">
          <DataTableBulkBar count={selected.size} onClear={() => setSelected(new Set())}>
            <Button
              type="button"
              variant="danger"
              size="sm"
              className="gap-2"
              onClick={() => void bulkDeleteUsers()}
            >
              <Trash2 className="h-4 w-4" />
              Delete selected
            </Button>
          </DataTableBulkBar>

          <DataTable
            columns={columns}
            rows={users}
            rowId={(r) => r.id}
            selectable
            selectedIds={selected}
            onToggleRow={toggleOne}
            onToggleAllPage={toggleAll}
            allSelectedOnPage={allSelected}
            loading={loading}
            emptyMessage="No users yet."
          />
        </CardBody>
      </Card>
    </div>
  );
}
