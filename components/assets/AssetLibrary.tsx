"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Upload, SlidersHorizontal, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useSession } from "@/lib/session-context";
import {
  assetsListQueryOptions,
  setAssetsListCache,
  MARKETING_ASSET_TYPES,
  type Asset,
  type AssetCategory,
} from "@/lib/queries/assets";
import { fetchLocationOptions, locationOptionsQueryKey } from "@/lib/queries/locations";
import { AssetCard, type AssetBadge } from "@/components/assets/AssetCard";
import { AssetUploadModal } from "@/components/assets/AssetUploadModal";
import { AssetsPageSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

type VisibilityFilter = "all" | "global" | "location";

const PAGE_SIZE = 24;

interface Props {
  category: AssetCategory;
  title: string;
  adminDescription: string;
  partnerDescription: string;
  showTypeFilter?: boolean;
}

export function AssetLibrary({
  category,
  title,
  adminDescription,
  partnerDescription,
  showTypeFilter = false,
}: Props) {
  const { user, location } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);

  const [search, setSearch] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const canAccess = user.role === "admin" || user.role === "partner";
  const isAdmin = user.role === "admin";

  useEffect(() => {
    if (!canAccess) router.replace("/dashboard");
  }, [canAccess, router]);

  const assetsQuery = useQuery({
    ...assetsListQueryOptions(category),
    enabled: canAccess,
  });

  const locsQuery = useQuery({
    queryKey: locationOptionsQueryKey,
    queryFn: fetchLocationOptions,
    enabled: canAccess && isAdmin,
  });

  const assets = assetsQuery.data ?? [];
  const loading = assetsQuery.isLoading;

  const locationMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const l of locsQuery.data ?? []) map[l.id] = l.name;
    return map;
  }, [locsQuery.data]);

  useEffect(() => {
    setPage(1);
  }, [search, visibilityFilter, locationFilter, typeFilter]);

  function handleDeleted(id: string) {
    setAssetsListCache(queryClient, category, (prev) => prev.filter((a) => a.id !== id));
  }

  function handleAssetUpdated(updated: Asset) {
    setAssetsListCache(queryClient, category, (prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a)),
    );
  }

  function handleUploaded(asset: Asset) {
    setAssetsListCache(queryClient, category, (prev) => [asset, ...prev]);
  }

  function resolveLocationName(lid: string): string {
    if (isAdmin) return locationMap[lid] ?? lid;
    return location?.name ?? lid;
  }

  if (!canAccess) return null;

  // Locations that actually appear on at least one location-scoped asset —
  // keeps the filter dropdown relevant instead of listing every location in the org.
  const locationOptions = isAdmin
    ? Array.from(
        new Set(assets.filter((a) => a.visibility === "location").flatMap((a) => a.locationIds)),
      ).map((lid) => ({ id: lid, name: resolveLocationName(lid) }))
    : [];

  const filtered = assets.filter((a) => {
    const displayName = a.name || a.originalFileName || a.originalName;
    if (search.trim() && !displayName.toLowerCase().includes(search.trim().toLowerCase())) {
      return false;
    }
    if (visibilityFilter !== "all" && a.visibility !== visibilityFilter) return false;
    if (isAdmin && visibilityFilter === "location" && locationFilter !== "all") {
      if (!a.locationIds.includes(locationFilter)) return false;
    }
    if (showTypeFilter && typeFilter !== "all" && (a.type ?? "other") !== typeFilter) return false;
    return true;
  });

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (visibilityFilter !== "all" ? 1 : 0) +
    (locationFilter !== "all" ? 1 : 0) +
    (typeFilter !== "all" ? 1 : 0);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function clearFilters() {
    setSearch("");
    setVisibilityFilter("all");
    setLocationFilter("all");
    setTypeFilter("all");
  }

  function badgesFor(asset: Asset): AssetBadge[] {
    const badges: AssetBadge[] = [];
    if (asset.visibility === "global") {
      badges.push({ label: "General", tone: "slate" });
    } else if (isAdmin) {
      const names = asset.locationIds.map((lid) => resolveLocationName(lid));
      badges.push({
        label: names.length > 1 ? `${names[0]} +${names.length - 1}` : (names[0] ?? "Location"),
        tone: "primary",
        details: names,
      });
    } else {
      badges.push({ label: "Specific To You", tone: "primary" });
    }
    if (showTypeFilter && asset.type) {
      const label = MARKETING_ASSET_TYPES.find((t) => t.value === asset.type)?.label ?? asset.type;
      badges.push({ label, tone: "blue" });
    }
    return badges;
  }

  // A card's Delete only unshares one location instead of a full delete when
  // exactly one location is unambiguous — either the active filter, or the
  // asset only belongs to a single location to begin with.
  function locationContextFor(asset: Asset): string | undefined {
    if (asset.visibility !== "location") return undefined;
    if (isAdmin && locationFilter !== "all") return locationFilter;
    if (asset.locationIds.length === 1) return asset.locationIds[0];
    return undefined;
  }

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {isAdmin ? adminDescription : partnerDescription}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowUpload(true)}>
            <Upload className="mr-2 h-4 w-4" /> Upload
          </Button>
        )}
      </div>

      {loading ? (
        <AssetsPageSkeleton variant={category} />
      ) : (
        <>
          {/* Toolbar: search + filters — sticky so it stays reachable once the grid grows long */}
          <div className="sticky top-0 z-30 mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-card">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by file name…"
                className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-sm outline-none ring-primary-200 placeholder:text-slate-400 focus:border-primary-300 focus:ring-4"
              />
            </div>

            <Select
              value={visibilityFilter}
              onChange={(e) => {
                setVisibilityFilter(e.target.value as VisibilityFilter);
                setLocationFilter("all");
              }}
              className="w-auto"
            >
              <option value="all">All Visibility</option>
              <option value="global">General Only</option>
              <option value="location">{isAdmin ? "Location-Specific Only" : "Specific To You"}</option>
            </Select>

            {isAdmin && visibilityFilter === "location" && locationOptions.length > 0 && (
              <Select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-auto"
              >
                <option value="all">All Locations</option>
                {locationOptions.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </Select>
            )}

            {showTypeFilter && (
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-auto"
              >
                <option value="all">All Types</option>
                {MARKETING_ASSET_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
            )}

            <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {filtered.length} of {assets.length}
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 font-medium text-primary-800 ring-1 ring-inset ring-primary-200/80 hover:bg-primary-100"
                >
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <p className="text-sm">
                {assets.length === 0
                  ? `No ${title.toLowerCase()} available yet.`
                  : "No files match your filters."}
              </p>
              {assets.length > 0 && activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="mt-3 text-sm font-medium text-primary-700 underline hover:text-primary-800"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {paginated.map((asset) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    role={user.role}
                    onDeleted={handleDeleted}
                    onUpdated={handleAssetUpdated}
                    locationContext={locationContextFor(asset)}
                    badges={badgesFor(asset)}
                  />
                ))}
              </div>

              {pageCount > 1 && (
                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs text-slate-500">
                    Page {currentPage} of {pageCount}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    disabled={currentPage >= pageCount}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {showUpload && (
        <AssetUploadModal
          category={category}
          onUploaded={handleUploaded}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  );
}
