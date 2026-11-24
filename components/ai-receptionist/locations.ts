import { fetchLocationsList, type LocationRow } from "@/lib/queries/locations";

export const receptionistLocationsQueryKey = ["ai-receptionist", "locations"] as const;

/** Existing location records. Receptionist-specific fields are not stored yet. */
export async function fetchReceptionistLocations(): Promise<LocationRow[]> {
  const pageSize = 200;
  const first = await fetchLocationsList({
    page: 1,
    pageSize,
    sort: "name",
    order: "asc",
  });
  if (first.totalPages <= 1) return first.locations;
  const pages = await Promise.all(
    Array.from({ length: first.totalPages - 1 }, (_, index) =>
      fetchLocationsList({
        page: index + 2,
        pageSize,
        sort: "name",
        order: "asc",
      }),
    ),
  );
  return [first.locations, ...pages.map((page) => page.locations)].flat();
}

export function locationAddress(location: LocationRow): string {
  const cityState = [location.city, location.state].filter(Boolean).join(", ");
  const line = [location.address, cityState, location.zip]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
  return line || "—";
}
