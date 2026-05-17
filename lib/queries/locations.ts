import { apiFetch } from "@/lib/auth-fetch";
import { queryKeys, type LocationListFilters } from "@/lib/query-keys";

export type LocationRow = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  createdAt?: string;
  isDisabled?: boolean;
  isPrimary?: boolean;
};

export async function makeLocationPrimary(locationId: string): Promise<LocationRow> {
  const res = await apiFetch(
    `/api/locations/${encodeURIComponent(locationId)}/make-primary`,
    { method: "POST" },
  );
  const data = (await res.json()) as { location?: LocationRow; error?: string };
  if (!res.ok) throw new Error(data.error ?? "Failed to set primary location");
  if (!data.location) throw new Error("Invalid response");
  return data.location;
}

export type LocationsListResponse = {
  locations: LocationRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type LocationDetailResponse = {
  location: LocationRow;
  users: unknown[];
};

export type LocationDeleteImpact = {
  userCount: number;
  ticketCount: number;
};

export async function fetchLocationDeleteImpact(
  locationId: string,
): Promise<LocationDeleteImpact> {
  const res = await apiFetch(
    `/api/locations/${encodeURIComponent(locationId)}/delete-impact`,
  );
  const data = (await res.json()) as LocationDeleteImpact & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Failed to load delete impact");
  return {
    userCount: Number(data.userCount) || 0,
    ticketCount: Number(data.ticketCount) || 0,
  };
}

function filtersToParams(filters: LocationListFilters): URLSearchParams {
  const params = new URLSearchParams();
  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? 10));
  params.set("sort", filters.sort ?? "createdAt");
  params.set("order", filters.order ?? "desc");
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  return params;
}

export function locationListQueryKey(filters: LocationListFilters) {
  return queryKeys.locations.list(filters);
}

export async function fetchLocationsList(
  filters: LocationListFilters,
): Promise<LocationsListResponse> {
  const res = await apiFetch(`/api/locations?${filtersToParams(filters)}`);
  const data = (await res.json()) as LocationsListResponse & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Failed to load locations");
  return data;
}

export async function fetchLocationOptions(): Promise<{ id: string; name: string }[]> {
  const data = await fetchLocationsList({
    page: 1,
    pageSize: 200,
    sort: "name",
    order: "asc",
  });
  return data.locations.map((l) => ({ id: l.id, name: l.name }));
}

export async function fetchLocationDetail(
  locationId: string,
): Promise<LocationDetailResponse> {
  const res = await apiFetch(`/api/locations/${locationId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Not found");
  return data as LocationDetailResponse;
}

export const locationOptionsQueryKey = queryKeys.locations.options();
