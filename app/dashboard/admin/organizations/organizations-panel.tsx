"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/auth-fetch";

type Loc = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
};

export function OrganizationsPanel() {
  const [locs, setLocs] = useState<Loc[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/locations?pageSize=100&sort=createdAt&order=desc");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setLocs((data.locations ?? []) as Loc[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createLocation(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create");
      setName("");
      setLocs((prev) => [data as Loc, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Create location" />
        <CardBody>
          <form onSubmit={createLocation} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                label="Name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. North Region Franchise"
                required
              />
            </div>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? "Creating…" : "Create"}
            </Button>
          </form>
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="All locations" description="Newest first" />
        <CardBody className="p-0">
          {loading ? (
            <p className="px-6 py-8 text-sm text-slate-500">Loading…</p>
          ) : locs.length === 0 ? (
            <p className="px-6 py-8 text-sm text-slate-500">No locations yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {locs.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between px-6 py-4 text-sm"
                >
                  <span className="font-medium text-slate-900">{l.name}</span>
                  <span className="text-xs text-slate-400">
                    {new Date(l.createdAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
