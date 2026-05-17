"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/auth-fetch";
import {
  fetchLocationsList,
  locationListQueryKey,
  type LocationRow,
} from "@/lib/queries/locations";
import { ORGANIZATIONS_LOCATIONS_FILTERS } from "@/lib/query-keys";
import { invalidateLocations } from "@/lib/queries/invalidate";

type Loc = LocationRow & {
  email: string;
  phone: string;
  address: string;
  createdAt: string;
};

export function OrganizationsPanel() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locationsQuery = useQuery({
    queryKey: locationListQueryKey(ORGANIZATIONS_LOCATIONS_FILTERS),
    queryFn: () => fetchLocationsList(ORGANIZATIONS_LOCATIONS_FILTERS),
  });

  const locs = (locationsQuery.data?.locations ?? []) as Loc[];
  const loading = locationsQuery.isPending && !locationsQuery.data;

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
      void invalidateLocations(queryClient);
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
            <ul className="divide-y divide-slate-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <li key={i} className="flex animate-pulse items-center justify-between px-6 py-4">
                  <span className="h-4 w-32 rounded-md bg-slate-200/70" />
                  <span className="h-3 w-20 rounded-md bg-slate-200/70" />
                </li>
              ))}
            </ul>
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
