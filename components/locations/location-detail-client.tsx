"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { ArrowLeft, Building2, Flag, Hash, Landmark, Mail, MapPin, Phone, Plus } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/modal";
import { DataTable } from "@/components/ui/data-table";
import { LocationDetailPageSkeleton } from "@/components/ui/skeleton";
import type { DataColumn } from "@/components/ui/data-table";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import type { UserRole } from "@/lib/user-roles";
import { apiFetch } from "@/lib/auth-fetch";
import { unwrapUserResponse } from "@/lib/users-api";
import { fetchLocationDetail } from "@/lib/queries/locations";
import { queryKeys } from "@/lib/query-keys";
import { invalidateLocations } from "@/lib/queries/invalidate";
import { INVITE_TEMP_PASSWORD } from "@/lib/portal-invite";

type Loc = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  createdAt: string;
  isDisabled?: boolean;
};

type URow = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  isDisabled: boolean;
};

function mapUserRow(u: unknown): URow {
  const r = u as Record<string, unknown>;
  return {
    id: String(r.id ?? ""),
    name: String(r.name ?? ""),
    email: String(r.email ?? ""),
    role: String(r.role ?? "partner"),
    createdAt: String(r.createdAt ?? ""),
    isDisabled: Boolean(r.isDisabled),
  };
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label?: string;
  value: string | null | undefined;
}) {
  const hasLabel = Boolean(label);
  return (
    <div className={`flex gap-2.5 ${hasLabel ? "items-start" : "items-center"}`}>
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 ${
          hasLabel ? "mt-0.5" : ""
        }`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        {label ? (
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        ) : null}
        <p className={`break-words text-xs font-medium text-slate-800 ${hasLabel ? "mt-0.5" : ""}`}>
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

export function LocationDetailClient({
  locationId,
  role,
}: {
  locationId: string;
  role: UserRole;
}) {
  const isAdmin = role === "admin";
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [userModal, setUserModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password] = useState(INVITE_TEMP_PASSWORD);
  const [userRole, setUserRole] = useState<UserRole>("partner");
  const [saving, setSaving] = useState(false);

  const [editUser, setEditUser] = useState<URow | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("partner");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editErr, setEditErr] = useState<string | null>(null);

  const [pwdUser, setPwdUser] = useState<URow | null>(null);
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdErr, setPwdErr] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: queryKeys.locations.detail(locationId),
    queryFn: () => fetchLocationDetail(locationId),
    enabled: Boolean(locationId),
  });

  const location = (detailQuery.data?.location as Loc | undefined) ?? null;
  const users = useMemo(() => {
    const list = Array.isArray(detailQuery.data?.users)
      ? (detailQuery.data.users as unknown[]).map(mapUserRow)
      : [];
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [detailQuery.data?.users]);
  const loading = detailQuery.isPending && !detailQuery.data;

  useEffect(() => {
    if (detailQuery.error) {
      setError(
        detailQuery.error instanceof Error
          ? detailQuery.error.message
          : "Failed to load",
      );
    }
  }, [detailQuery.error]);

  const refreshDetail = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.locations.detail(locationId),
    });

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          role: userRole,
          locationId,
          sendInvite: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setUserModal(false);
      setName("");
      setEmail("");
      setUserRole("partner");
      void refreshDetail();
      void invalidateLocations(queryClient);
      void Swal.fire({
        icon: "success",
        title: "User created",
        text: `Account created for ${email}. An invite email with login credentials will arrive shortly.`,
        timer: 4000,
        showConfirmButton: true,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  const openEditUser = useCallback((u: URow) => {
    setEditUser(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditRole((u.role as UserRole) || "partner");
    setEditErr(null);
  }, []);

  const saveEditUser = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editUser) return;
      setSavingEdit(true);
      setEditErr(null);
      try {
        const res = await apiFetch(`/api/users/${editUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editName.trim(),
            email: editEmail.trim(),
            role: editRole,
            locationId,
          }),
        });
        const data: unknown = await res.json();
        if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to update");
        const updated = unwrapUserResponse(data);
        if (!updated) throw new Error("Invalid response");
        void refreshDetail();
        setEditUser(null);
      } catch (err) {
        setEditErr(err instanceof Error ? err.message : "Failed to update");
      } finally {
        setSavingEdit(false);
      }
    },
    [editUser, editName, editEmail, editRole, locationId],
  );

  const openPwdUser = useCallback((u: URow) => {
    setPwdUser(u);
    setPwdNew("");
    setPwdConfirm("");
    setPwdErr(null);
  }, []);

  const savePwd = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!pwdUser) return;
      if (pwdNew.length < 8) {
        setPwdErr("Password must be at least 8 characters.");
        return;
      }
      if (pwdNew !== pwdConfirm) {
        setPwdErr("Passwords do not match.");
        return;
      }
      setPwdSaving(true);
      setPwdErr(null);
      try {
        const res = await apiFetch(`/api/users/${pwdUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: pwdNew }),
        });
        const data: unknown = await res.json();
        if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to update password");
        setPwdUser(null);
        setPwdNew("");
        setPwdConfirm("");
      } catch (err) {
        setPwdErr(err instanceof Error ? err.message : "Failed to update password");
      } finally {
        setPwdSaving(false);
      }
    },
    [pwdUser, pwdNew, pwdConfirm],
  );

  const toggleUserDisabled = useCallback(async (u: URow) => {
    try {
      const res = await apiFetch(`/api/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDisabled: !u.isDisabled }),
      });
      const data: unknown = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to update");
      const updated = unwrapUserResponse(data);
      if (!updated) throw new Error("Invalid response");
      void refreshDetail();
    } catch (err) {
      void Swal.fire({
        icon: "error",
        title: "Could not update",
        text: err instanceof Error ? err.message : "Failed",
      });
    }
  }, []);

  const confirmDeleteUser = useCallback(async (u: URow) => {
    const r = await Swal.fire({
      title: "Delete user?",
      html: `Permanently remove <strong>${u.email}</strong>?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#dc2626",
    });
    if (!r.isConfirmed) return;
    try {
      const res = await apiFetch(`/api/users/${u.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      void refreshDetail();
    } catch (err) {
      void Swal.fire({
        icon: "error",
        title: "Could not delete",
        text: err instanceof Error ? err.message : "Delete failed",
      });
    }
  }, []);

  const userColumns: DataColumn<URow>[] = useMemo(() => {
    const cols: DataColumn<URow>[] = [
      { id: "n", header: "Name", cell: (r) => r.name },
      { id: "e", header: "Email", cell: (r) => r.email },
      {
        id: "r",
        header: "Role",
        cell: (r) => (
          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-700">
            {r.role}
          </span>
        ),
      },
      {
        id: "pw",
        header: "Password",
        cell: () => (
          <span
            className="font-mono text-sm tracking-widest text-slate-600"
            title="Password is hashed. Use Edit or Change password to set a new one."
            aria-label="Password hidden"
          >
            ****
          </span>
        ),
      },
      {
        id: "st",
        header: "Status",
        cell: (r) => (
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
              r.isDisabled
                ? "bg-red-50 text-red-700 ring-1 ring-red-100"
                : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100"
            }`}
          >
            {r.isDisabled ? "Disabled" : "Active"}
          </span>
        ),
      },
      {
        id: "c",
        header: "Joined",
        cell: (r) => (
          <span className="text-xs text-slate-400">
            {new Date(r.createdAt).toLocaleDateString()}
          </span>
        ),
      },
    ];
    if (isAdmin) {
      cols.push({
        id: "actions",
        header: <span className="sr-only">Actions</span>,
        cell: (r) => {
          const items = [
            { id: "edit", label: "Edit", onClick: () => openEditUser(r) },
            { id: "password", label: "Change password", onClick: () => openPwdUser(r) },
            {
              id: "toggle",
              label: r.isDisabled ? "Enable" : "Disable",
              onClick: () => void toggleUserDisabled(r),
            },
            {
              id: "delete",
              label: "Delete",
              danger: true,
              onClick: () => void confirmDeleteUser(r),
            },
          ];
          return (
            <RowActionsMenu aria-label={`Actions for ${r.email}`} items={items} />
          );
        },
      });
    }
    return cols;
  }, [isAdmin, openEditUser, openPwdUser, toggleUserDisabled, confirmDeleteUser]);

  if (loading) {
    return <LocationDetailPageSkeleton />;
  }

  if (error && !location) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-red-600">{error}</p>
          <Link
            href="/dashboard/locations"
            className="mt-4 inline-flex text-sm font-medium text-primary-600 hover:underline"
          >
            Back to locations
          </Link>
        </CardBody>
      </Card>
    );
  }

  if (!location) return null;

  const fullAddress = [
    location.address,
    location.city,
    location.state && location.zip
      ? `${location.state} ${location.zip}`
      : location.state || location.zip,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="flex h-[calc(100dvh-4rem-4rem)] flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/locations"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Locations
        </Link>
      </div>

      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[300px_1fr]">
        {/* ── Left: location info card ── */}
        <div className="flex min-h-0 flex-col">
          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-br from-primary-600 to-primary-700 px-6 py-6 text-white">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="truncate text-lg font-semibold leading-snug">{location.name}</h1>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                    location.isDisabled
                      ? "bg-red-500/20 text-red-100 ring-1 ring-red-300/40"
                      : "bg-emerald-400/20 text-emerald-50 ring-1 ring-emerald-200/30"
                  }`}
                >
                  {location.isDisabled ? "Inactive" : "Active"}
                </span>
              </div>
            </div>

            {/* Contact details */}
            <CardBody className="min-h-0 flex-1 space-y-3 overflow-y-auto py-5">
              <InfoRow icon={<Mail className="h-3.5 w-3.5" />} value={location.email} />
              <InfoRow icon={<Phone className="h-3.5 w-3.5" />} value={location.phone} />
              <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} value={fullAddress || location.address} />
              {location.city ? (
                <InfoRow icon={<Landmark className="h-3.5 w-3.5" />} value={location.city} />
              ) : null}
              {location.state ? (
                <InfoRow icon={<Flag className="h-3.5 w-3.5" />} value={location.state} />
              ) : null}
              {location.zip ? (
                <InfoRow icon={<Hash className="h-3.5 w-3.5" />} value={location.zip} />
              ) : null}
            </CardBody>
          </Card>
        </div>

        {/* ── Right: users panel ── */}
        <Card className="flex min-h-0 min-w-0 flex-col">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-5">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Users</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {users.length === 0
                  ? "No accounts assigned yet."
                  : `${users.length} account${users.length === 1 ? "" : "s"} at this location.`}
              </p>
            </div>
            {isAdmin ? (
              <Button
                type="button"
                className="inline-flex items-center gap-2"
                onClick={() => setUserModal(true)}
              >
                <Plus className="h-4 w-4" />
                Add user
              </Button>
            ) : null}
          </div>

          <CardBody className="min-h-0 flex-1 overflow-y-auto">
            <DataTable
              columns={userColumns}
              rows={users}
              rowId={(r) => r.id}
              selectable={false}
              selectedIds={new Set()}
              onToggleRow={() => {}}
              onToggleAllPage={() => {}}
              allSelectedOnPage={false}
              emptyMessage="No users at this location yet."
            />
          </CardBody>
        </Card>
      </div>

      <Modal
        open={userModal}
        onClose={() => setUserModal(false)}
        title="Add user"
        description={`Create a user at ${location.name}`}
      >
        <form onSubmit={addUser} className="space-y-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Temporary password"
            type="text"
            value={password}
            disabled
            readOnly
            className="bg-slate-50 text-slate-600"
          />
          <p className="text-xs text-slate-500">
            A default temporary password is used. The user will receive an invite email and must
            set a new password on first login.
          </p>
          <Select
            label="Role"
            value={userRole}
            onChange={(e) => setUserRole(e.target.value as UserRole)}
          >
            <option value="admin">admin</option>
            <option value="support">support</option>
            <option value="partner">partner</option>
          </Select>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setUserModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating…" : "Create user"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={editUser !== null}
        title="Edit user"
        description={editUser ? editUser.email : undefined}
        onClose={() => {
          setEditUser(null);
          setEditErr(null);
        }}
      >
        <form onSubmit={saveEditUser} className="space-y-4">
          <Input
            label="Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
          />
          <Input
            label="Email"
            type="email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            required
          />
          <Select
            label="Role"
            value={editRole}
            onChange={(e) => setEditRole(e.target.value as UserRole)}
          >
            <option value="admin">admin</option>
            <option value="support">support</option>
            <option value="partner">partner</option>
          </Select>
          {location ? (
            <p className="text-xs text-slate-500">
              Location remains <span className="font-medium text-slate-700">{location.name}</span>.
            </p>
          ) : null}
          {editErr ? <p className="text-sm text-red-600">{editErr}</p> : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setEditUser(null);
                setEditErr(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={savingEdit}>
              {savingEdit ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={pwdUser !== null}
        title="Change password"
        description={pwdUser ? pwdUser.email : undefined}
        onClose={() => {
          setPwdUser(null);
          setPwdNew("");
          setPwdConfirm("");
          setPwdErr(null);
        }}
      >
        <form onSubmit={savePwd} className="space-y-4">
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            value={pwdNew}
            onChange={(e) => setPwdNew(e.target.value)}
            required
            minLength={8}
          />
          <Input
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            value={pwdConfirm}
            onChange={(e) => setPwdConfirm(e.target.value)}
            required
            minLength={8}
          />
          {pwdErr ? <p className="text-sm text-red-600">{pwdErr}</p> : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setPwdUser(null);
                setPwdNew("");
                setPwdConfirm("");
                setPwdErr(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pwdSaving}>
              {pwdSaving ? "Updating…" : "Update password"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
