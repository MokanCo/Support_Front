"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/modal";
import { DataTable } from "@/components/ui/data-table";
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

type URow = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

export function LocationDetailClient({
  locationId,
  role,
}: {
  locationId: string;
  role: UserRole;
}) {
  const router = useRouter();
  const isAdmin = role === "admin";
  const [location, setLocation] = useState<Loc | null>(null);
  const [users, setUsers] = useState<URow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userModal, setUserModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userRole, setUserRole] = useState<UserRole>("partner");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/locations/${locationId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Not found");
      setLocation(data.location);
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    void load();
  }, [load]);

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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setUserModal(false);
      setName("");
      setEmail("");
      setPassword("");
      setUserRole("partner");
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  const userColumns: DataColumn<URow>[] = useMemo(
    () => [
      { id: "n", header: "Name", cell: (r) => r.name },
      { id: "e", header: "Email", cell: (r) => r.email },
      {
        id: "r",
        header: "Role",
        cell: (r) => <span className="capitalize">{r.role}</span>,
      },
      {
        id: "c",
        header: "Created",
        cell: (r) => (
          <span className="text-xs text-slate-500">
            {new Date(r.createdAt).toLocaleString()}
          </span>
        ),
      },
    ],
    []
  );

  if (loading) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  if (error && !location) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-red-600">{error}</p>
          <Button type="button" variant="ghost" className="mt-4" onClick={() => router.push("/dashboard/locations")}>
            Back to locations
          </Button>
        </CardBody>
      </Card>
    );
  }

  if (!location) return null;

  return (
    <div className="space-y-8">
      <div>
        <Button
          type="button"
          variant="ghost"
          className="!px-0 text-slate-600 hover:text-slate-900"
          onClick={() => router.push("/dashboard/locations")}
        >
          ← Locations
        </Button>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          {location.name}
        </h1>
        <div className="mt-4 grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Email</p>
            <p className="mt-1 text-sm text-slate-800">{location.email || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Phone</p>
            <p className="mt-1 text-sm text-slate-800">{location.phone || "—"}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold uppercase text-slate-400">Address</p>
            <p className="mt-1 text-sm text-slate-800">{location.address || "—"}</p>
          </div>
        </div>
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Users</h2>
            <p className="mt-1 text-sm text-slate-500">Accounts assigned to this location.</p>
          </div>
          {isAdmin ? (
            <Button type="button" className="inline-flex items-center gap-2" onClick={() => setUserModal(true)}>
              <Plus className="h-4 w-4" />
              Add user
            </Button>
          ) : null}
        </div>
        <CardBody className="space-y-4">
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
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
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
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setUserModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Creating…" : "Create user"}
                </Button>
              </div>
            </form>
          </Modal>

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
  );
}
