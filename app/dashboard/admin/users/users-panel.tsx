"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/modal";
import type { UserRole } from "@/lib/user-roles";
import { apiFetch } from "@/lib/auth-fetch";
import { parseUsersListJson, unwrapUserResponse } from "@/lib/users-api";

type Loc = { id: string; name: string };
type UserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  locationId: string;
  locationName: string | null;
  createdAt: string;
};

export function UsersPanel() {
  const [locs, setLocs] = useState<Loc[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("partner");
  const [locationId, setLocationId] = useState("");
  const [creating, setCreating] = useState(false);

  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editRole, setEditRole] = useState<UserRole>("partner");
  const [editLoc, setEditLoc] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [lRes, uRes] = await Promise.all([
        apiFetch("/api/locations?pageSize=100&sort=name&order=asc"),
        apiFetch("/api/users"),
      ]);
      const lData = await lRes.json();
      const uData: unknown = await uRes.json();
      if (!lRes.ok) throw new Error(lData.error ?? "Failed locations");
      if (!uRes.ok) throw new Error((uData as { error?: string }).error ?? "Failed users");
      const list = (lData.locations ?? []) as {
        id: string;
        name: string;
      }[];
      setLocs(list.map((l) => ({ id: l.id, name: l.name })));
      const userRows = parseUsersListJson(uData) as UserRow[];
      setUsers(
        userRows.map((u) => ({
          ...u,
          locationName: u.locationName ?? null,
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!locationId && locs[0]?.id) setLocationId(locs[0].id);
  }, [locs, locationId]);

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
      const locId = created.locationId != null ? String(created.locationId) : "";
      setUsers((prev) => [
        {
          id: String(created.id),
          name: String(created.name ?? ""),
          email: String(created.email ?? ""),
          role: created.role as UserRole,
          locationId: locId,
          locationName: locs.find((l) => l.id === locId)?.name ?? null,
          createdAt: String(created.createdAt ?? new Date().toISOString()),
        },
        ...prev,
      ]);
      setName("");
      setEmail("");
      setPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setCreating(false);
    }
  }

  function openEdit(u: UserRow) {
    setEditUser(u);
    setEditRole(u.role);
    setEditLoc(u.locationId);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setSavingEdit(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/users/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: editRole, locationId: editLoc }),
      });
      const data: unknown = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to update");
      const updated = unwrapUserResponse(data);
      if (!updated) throw new Error("Invalid update response");
      const newLocId = updated.locationId != null ? String(updated.locationId) : "";
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editUser.id
            ? {
                ...u,
                role: (updated.role as UserRole) ?? u.role,
                locationId: newLocId,
                locationName: locs.find((l) => l.id === newLocId)?.name ?? null,
              }
            : u
        )
      );
      setEditUser(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSavingEdit(false);
    }
  }

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
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
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
        <CardBody className="p-0">
          {loading ? (
            <p className="px-6 py-8 text-sm text-slate-500">Loading…</p>
          ) : users.length === 0 ? (
            <p className="px-6 py-8 text-sm text-slate-500">No users yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 text-xs font-semibold uppercase tracking-wide text-slate-500 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="transition-colors hover:bg-slate-50/90">
                      <td className="px-4 py-3 font-medium text-slate-900">{u.name}</td>
                      <td className="px-4 py-3 text-slate-700">{u.email}</td>
                      <td className="px-4 py-3 capitalize text-slate-700">{u.role}</td>
                      <td className="px-4 py-3 text-slate-700">{u.locationName ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(u)}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <Modal
        open={editUser !== null}
        title="Edit user"
        description={editUser?.email}
        onClose={() => setEditUser(null)}
      >
        <form onSubmit={saveEdit} className="space-y-4">
          <Select
            label="Role"
            value={editRole}
            onChange={(e) => setEditRole(e.target.value as UserRole)}
          >
            <option value="admin">admin</option>
            <option value="support">support</option>
            <option value="partner">partner</option>
          </Select>
          <Select
            label="Location"
            value={editLoc}
            onChange={(e) => setEditLoc(e.target.value)}
          >
            {locs.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setEditUser(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={savingEdit}>
              {savingEdit ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
