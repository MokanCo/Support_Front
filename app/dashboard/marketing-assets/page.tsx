"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, MapPin } from "lucide-react";
import { useSession } from "@/lib/session-context";
import {
  assetsListQueryOptions,
  MARKETING_ASSET_TYPES,
  setAssetsListCache,
  type Asset,
  type MarketingAssetType,
} from "@/lib/queries/assets";
import {
  fetchLocationOptions,
  locationOptionsQueryKey,
} from "@/lib/queries/locations";
import { AssetCard } from "@/components/assets/AssetCard";
import { AssetUploadModal } from "@/components/assets/AssetUploadModal";
import { AssetsPageSkeleton } from "@/components/ui/skeleton";

function AssetGrid({
  assets,
  role,
  onDeleted,
  locationContext,
  onUpdated,
}: {
  assets: Asset[];
  role: "admin" | "support" | "partner";
  onDeleted: (id: string) => void;
  locationContext?: string;
  onUpdated?: (asset: Asset) => void;
}) {
  if (assets.length === 0) {
    return <p className="py-6 text-sm text-slate-400">None yet.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {assets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          role={role}
          onDeleted={onDeleted}
          locationContext={locationContext}
          onUpdated={onUpdated}
        />
      ))}
    </div>
  );
}

function groupByType(
  assets: Asset[],
): { type: MarketingAssetType; label: string; assets: Asset[] }[] {
  return MARKETING_ASSET_TYPES.map(({ value, label }) => ({
    type: value,
    label,
    assets: assets.filter((a) => (a.type ?? "other") === value),
  })).filter((g) => g.assets.length > 0);
}

function TypeGroups({
  assets,
  role,
  onDeleted,
  locationContext,
  onUpdated,
}: {
  assets: Asset[];
  role: "admin" | "support" | "partner";
  onDeleted: (id: string) => void;
  locationContext?: string;
  onUpdated?: (asset: Asset) => void;
}) {
  const groups = groupByType(assets);
  if (groups.length === 0) {
    return <p className="py-6 text-sm text-slate-400">None yet.</p>;
  }
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.type}>
          <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            {g.label}
          </p>
          <AssetGrid
            assets={g.assets}
            role={role}
            onDeleted={onDeleted}
            locationContext={locationContext}
            onUpdated={onUpdated}
          />
        </div>
      ))}
    </div>
  );
}

export default function MarketingAssetsPage() {
  const { user, location } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);

  const canAccess = user.role === "admin" || user.role === "partner";
  const isAdmin = user.role === "admin";

  useEffect(() => {
    if (!canAccess) router.replace("/dashboard");
  }, [canAccess, router]);

  const assetsQuery = useQuery({
    ...assetsListQueryOptions("marketing_assets"),
    enabled: canAccess,
  });

  const locsQuery = useQuery({
    queryKey: locationOptionsQueryKey,
    queryFn: fetchLocationOptions,
    enabled: canAccess && isAdmin,
  });

  const assets = assetsQuery.data ?? [];
  // Show layout skeleton only on first load (no cached data yet).
  const loading = assetsQuery.isLoading;

  const locationMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const l of locsQuery.data ?? []) map[l.id] = l.name;
    return map;
  }, [locsQuery.data]);

  function handleDeleted(id: string) {
    setAssetsListCache(queryClient, "marketing_assets", (prev) =>
      prev.filter((a) => a.id !== id),
    );
  }

  function handleAssetUpdated(updated: Asset) {
    setAssetsListCache(queryClient, "marketing_assets", (prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a)),
    );
  }

  function handleUploaded(asset: Asset) {
    setAssetsListCache(queryClient, "marketing_assets", (prev) => [
      asset,
      ...prev,
    ]);
  }

  if (!canAccess) return null;

  const generalAssets = assets.filter((a) => a.visibility === "global");
  const locationAssets = assets.filter((a) => a.visibility === "location");

  const locationGroups: Record<string, Asset[]> = {};
  for (const asset of locationAssets) {
    const lids = isAdmin
      ? asset.locationIds.length > 0
        ? asset.locationIds
        : ["unknown"]
      : [location?.id ?? "unknown"];
    for (const lid of lids) {
      if (!locationGroups[lid]) locationGroups[lid] = [];
      locationGroups[lid].push(asset);
    }
  }

  function resolveLocationName(lid: string): string {
    if (isAdmin) return locationMap[lid] ?? lid;
    return location?.name ?? lid;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Marketing Assets
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {isAdmin
              ? "Manage marketing images and materials."
              : "View and download available marketing assets."}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500"
          >
            <Upload className="h-4 w-4" /> Upload
          </button>
        )}
      </div>

      {loading ? (
        <AssetsPageSkeleton variant="marketing_assets" />
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <section>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                General Assets
              </h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                {generalAssets.length}
              </span>
            </div>
            <TypeGroups
              assets={generalAssets}
              role={user.role}
              onDeleted={handleDeleted}
            />
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {isAdmin ? "Location Assets" : "Assets Specific For You"}
              </h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                {locationAssets.length}
              </span>
            </div>
            {Object.keys(locationGroups).length === 0 ? (
              <p className="py-6 text-sm text-slate-400">None yet.</p>
            ) : (
              <div className="space-y-6">
                {Object.entries(locationGroups).map(([lid, group]) => (
                  <div key={lid}>
                    {isAdmin && (
                      <div className="mb-3 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {resolveLocationName(lid)}
                        </p>
                      </div>
                    )}
                    <TypeGroups
                      assets={group}
                      role={user.role}
                      onDeleted={handleDeleted}
                      locationContext={lid !== "unknown" ? lid : undefined}
                      onUpdated={handleAssetUpdated}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {showUpload && (
        <AssetUploadModal
          category="marketing_assets"
          onUploaded={handleUploaded}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  );
}
