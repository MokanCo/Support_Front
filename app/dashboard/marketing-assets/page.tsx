"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session-context";
import { Upload, MapPin } from "lucide-react";
import {
  fetchAssets,
  MARKETING_ASSET_TYPES,
  type Asset,
  type MarketingAssetType,
} from "@/lib/queries/assets";
import { fetchLocationOptions } from "@/lib/queries/locations";
import { AssetCard } from "@/components/assets/AssetCard";
import { AssetUploadModal } from "@/components/assets/AssetUploadModal";
import { Skeleton } from "@/components/ui/skeleton";

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

  const [assets, setAssets] = useState<Asset[]>([]);
  const [locationMap, setLocationMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    if (user.role !== "admin" && user.role !== "partner") {
      router.replace("/dashboard");
    }
  }, [user.role, router]);

  useEffect(() => {
    if (user.role !== "admin" && user.role !== "partner") return;

    const promises: Promise<void>[] = [
      fetchAssets("marketing_assets").then((data) => setAssets(data)),
    ];

    if (user.role === "admin") {
      promises.push(
        fetchLocationOptions().then((locs) => {
          const map: Record<string, string> = {};
          for (const l of locs) map[l.id] = l.name;
          setLocationMap(map);
        }),
      );
    }

    Promise.all(promises).finally(() => setLoading(false));
  }, [user.role]);

  function handleDeleted(id: string) {
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }

  function handleAssetUpdated(updated: Asset) {
    setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  }

  if (user.role !== "admin" && user.role !== "partner") return null;

  const isAdmin = user.role === "admin";
  const generalAssets = assets.filter((a) => a.visibility === "global");
  const locationAssets = assets.filter((a) => a.visibility === "location");

  // Partners only ever see their own location's bucket, even if an asset is
  // shared with other locations too — the backend already scopes the list to
  // global + their location, so group everything under just that one id.
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
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, col) => (
            <div key={col} className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-60 rounded-xl" />
              ))}
            </div>
          ))}
        </div>
      ) : (
        /* General and Location side by side, each grouped by type — same layout for admin and partner */
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* General assets */}
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

          {/* Location-specific assets */}
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
          onUploaded={(asset) => setAssets((prev) => [asset, ...prev])}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  );
}
