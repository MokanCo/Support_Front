import type { QueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/auth-fetch";
import { queryKeys } from "@/lib/query-keys";

export type AssetCategory = "documents" | "marketing_assets";
export type AssetVisibility = "global" | "location";
export type MarketingAssetType = "postcard" | "banner" | "logo" | "video" | "other";

export const MARKETING_ASSET_TYPES: { value: MarketingAssetType; label: string }[] = [
  { value: "postcard", label: "Post card" },
  { value: "banner", label: "Banners" },
  { value: "logo", label: "Logo" },
  { value: "video", label: "Video" },
  { value: "other", label: "Other" },
];

export interface Asset {
  id: string;
  name: string;
  originalFileName: string;
  originalName: string;
  fileUrl: string;
  thumbnailUrl?: string;
  contentType: string;
  mimeType: string;
  fileSize: number;
  size: number;
  category: AssetCategory;
  visibility: AssetVisibility;
  locationIds: string[];
  type?: MarketingAssetType;
  uploadedBy: string;
  expiresAt: string;
  createdAt: string;
  updatedAt?: string;
  isDeleted?: boolean;
}

function categoryBasePath(category: AssetCategory): string {
  return category === "documents" ? "/api/documents" : "/api/marketing-assets";
}

function normalizeAsset(raw: Record<string, unknown>): Asset {
  const originalFileName = String(
    raw.originalFileName ?? raw.originalName ?? "",
  );
  const mimeType = String(raw.contentType ?? raw.mimeType ?? "");
  const size = Number(raw.fileSize ?? raw.size ?? 0);
  const isVideo = mimeType.startsWith("video/");
  // Never keep a direct CDN URL for videos on the client.
  const fileUrl = isVideo ? "" : String(raw.fileUrl ?? "");
  return {
    id: String(raw.id),
    name: String(raw.name || originalFileName),
    originalFileName,
    originalName: originalFileName,
    fileUrl,
    thumbnailUrl: String(raw.thumbnailUrl ?? ""),
    contentType: mimeType,
    mimeType,
    fileSize: size,
    size,
    category: raw.category as AssetCategory,
    visibility: (raw.visibility as AssetVisibility) ?? "global",
    locationIds: Array.isArray(raw.locationIds)
      ? raw.locationIds.map(String)
      : [],
    type: raw.type as MarketingAssetType | undefined,
    uploadedBy: String(raw.uploadedBy ?? ""),
    expiresAt: String(raw.expiresAt ?? ""),
    createdAt: String(raw.createdAt ?? ""),
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
    isDeleted: Boolean(raw.isDeleted),
  };
}

export async function fetchAssets(category: AssetCategory): Promise<Asset[]> {
  const res = await apiFetch(categoryBasePath(category));
  if (!res.ok) throw new Error("Failed to fetch assets");
  const data = (await res.json()) as {
    documents?: unknown[];
    assets?: unknown[];
  };
  const rows = (category === "documents" ? data.documents : data.assets) ?? [];
  return rows.map((row) => normalizeAsset(row as Record<string, unknown>));
}

export function assetsListQueryKey(category: AssetCategory) {
  return queryKeys.assets.list(category);
}

export function assetsListQueryOptions(category: AssetCategory) {
  return {
    queryKey: assetsListQueryKey(category),
    queryFn: () => fetchAssets(category),
  } as const;
}

export function setAssetsListCache(
  queryClient: QueryClient,
  category: AssetCategory,
  updater: (prev: Asset[]) => Asset[],
) {
  queryClient.setQueryData<Asset[]>(assetsListQueryKey(category), (prev) =>
    updater(prev ?? []),
  );
}

export async function fetchAssetById(
  category: AssetCategory,
  id: string,
): Promise<Asset> {
  const res = await apiFetch(`${categoryBasePath(category)}/${id}`);
  if (!res.ok) throw new Error("Failed to fetch asset");
  const data = (await res.json()) as { document?: unknown; asset?: unknown };
  const row = (category === "documents" ? data.document : data.asset) as Record<
    string,
    unknown
  >;
  return normalizeAsset(row);
}

export async function uploadAsset(formData: FormData): Promise<Asset> {
  const category = String(formData.get("category") || "documents") as AssetCategory;
  // Dedicated routes infer category — remove so body stays clean
  formData.delete("category");

  const res = await apiFetch(categoryBasePath(category), {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Upload failed");
  }
  const data = (await res.json()) as { document?: unknown; asset?: unknown };
  const row = (data.document ?? data.asset) as Record<string, unknown>;
  return normalizeAsset({ ...row, category });
}

export async function deleteAsset(
  id: string,
  category: AssetCategory = "documents",
): Promise<void> {
  const res = await apiFetch(`${categoryBasePath(category)}/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete asset");
}

/**
 * Removes one location from an asset shared across multiple locations,
 * instead of deleting it entirely. Returns the updated asset, or null if
 * that was its last location (in which case it was fully deleted).
 */
export async function removeAssetLocation(
  id: string,
  locationId: string,
  category: AssetCategory = "documents",
): Promise<{ deleted: boolean; asset: Asset | null }> {
  const res = await apiFetch(
    `${categoryBasePath(category)}/${id}/locations/${locationId}`,
    { method: "DELETE" },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message ?? "Failed to remove from location",
    );
  }
  const data = (await res.json()) as {
    deleted: boolean;
    asset: Record<string, unknown> | null;
  };
  return {
    deleted: data.deleted,
    asset: data.asset ? normalizeAsset(data.asset) : null,
  };
}

export async function fetchAssetFile(
  id: string,
  category: AssetCategory = "documents",
  _fileUrl?: string,
  preferredFilename?: string,
  options?: { download?: boolean },
): Promise<{ blob: Blob; filename: string }> {
  // Always go through the API so Content-Disposition/download works reliably
  // (cross-origin R2 URLs ignore the HTML download attribute).
  const asDownload = options?.download !== false;
  const res = await apiFetch(
    `${categoryBasePath(category)}/${id}/file${asDownload ? "?download=1" : ""}`,
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message ?? "Failed to fetch file",
    );
  }
  const cd = res.headers.get("content-disposition") ?? "";
  const match = cd.match(/filename\*?=(?:UTF-8''|(['"]))?([^'";\n]+)\1?/i);
  const rawName = match?.[2] ? decodeURIComponent(match[2]) : "";
  const filename = preferredFilename?.trim() || rawName || "file";
  const blob = await res.blob();
  return { blob, filename };
}
