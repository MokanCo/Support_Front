"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Building2, Mail, MapPin, Phone, Plus } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/modal";
import { DataTable } from "@/components/ui/data-table";
import type { DataColumn } from "@/components/ui/data-table";
import type { UserRole } from "@/lib/user-roles";
import { apiFetch } from "@/lib/auth-fetch";

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
};

type URow = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 break-words text-sm font-medium text-slate-800">
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
        body: JSON.stringify({ name, email, password, role: userRole, locationId }),
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
        cell: (r) => (
          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-700">
            {r.role}
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
    ],
    [],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    );
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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/locations"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Locations
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* ── Left: location info card ── */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card className="overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-br from-primary-600 to-primary-700 px-6 py-8 text-white">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <h1 className="mt-4 text-xl font-semibold leading-snug">{location.name}</h1>
              <p className="mt-1 text-sm text-primary-100">
                Added {new Date(location.createdAt).toLocaleDateString()}
              </p>
            </div>

            {/* Contact details */}
            <CardBody className="space-y-4 py-6">
              <InfoRow
                icon={<Mail className="h-4 w-4" />}
                label="Email"
                value={location.email}
              />
              <InfoRow
                icon={<Phone className="h-4 w-4" />}
                label="Phone"
                value={location.phone}
              />
              <InfoRow
                icon={<MapPin className="h-4 w-4" />}
                label="Address"
                value={fullAddress || location.address}
              />
              {location.city ? (
                <InfoRow icon={<MapPin className="h-4 w-4" />} label="City" value={location.city} />
              ) : null}
              {location.state ? (
                <InfoRow icon={<MapPin className="h-4 w-4" />} label="State" value={location.state} />
              ) : null}
              {location.zip ? (
                <InfoRow icon={<MapPin className="h-4 w-4" />} label="Zip" value={location.zip} />
              ) : null}
            </CardBody>
          </Card>
        </div>

        {/* ── Right: users panel ── */}
        <Card className="min-w-0">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Users</h2>
              <p className="mt-0.5 text-sm text-slate-500">
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

          <CardBody>
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
    </div>
  );
}
