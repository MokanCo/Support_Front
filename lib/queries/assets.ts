import type { QueryClient } from "@tanstack/react-query";
import { apiFetch, getBearerAuthorizationHeader } from "@/lib/auth-fetch";
import { resolveApiUrl } from "@/lib/api-base";
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
  hasThumbnail?: boolean;
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
    hasThumbnail: Boolean(raw.hasThumbnail) || isVideo,
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
  return uploadAssetWithProgress(formData);
}

export type AssetUploadProgress = {
  /** 0–100 network upload progress */
  percent: number;
  loaded: number;
  total: number;
  /** True after bytes are sent; waiting on server processing (e.g. video). */
  processing: boolean;
};

/**
 * Upload with byte-level progress via XHR (fetch cannot report upload %).
 */
export function uploadAssetWithProgress(
  formData: FormData,
  onProgress?: (p: AssetUploadProgress) => void,
): Promise<Asset> {
  const category = String(formData.get("category") || "documents") as AssetCategory;
  formData.delete("category");

  const url = String(resolveApiUrl(categoryBasePath(category)));
  const auth = getBearerAuthorizationHeader();

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.withCredentials = false;
    if (auth) xhr.setRequestHeader("Authorization", auth);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
      onProgress?.({
        percent,
        loaded: event.loaded,
        total: event.total,
        processing: false,
      });
    };

    xhr.upload.onload = () => {
      // Bytes fully sent — server may still be converting / writing to R2.
      onProgress?.({
        percent: 99,
        loaded: 1,
        total: 1,
        processing: true,
      });
    };

    xhr.onload = () => {
      let data: { document?: unknown; asset?: unknown; message?: string; error?: string } = {};
      try {
        data = JSON.parse(xhr.responseText || "{}") as typeof data;
      } catch {
        /* ignore */
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(data.message || data.error || "Upload failed"));
        return;
      }
      onProgress?.({ percent: 100, loaded: 1, total: 1, processing: false });
      const row = (data.document ?? data.asset) as Record<string, unknown>;
      resolve(normalizeAsset({ ...row, category }));
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));
    xhr.send(formData);
  });
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

export async function fetchAssetThumbnail(
  id: string,
  category: AssetCategory = "documents",
): Promise<Blob> {
  const res = await apiFetch(`${categoryBasePath(category)}/${id}/thumbnail`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message ?? "Failed to fetch thumbnail",
    );
  }
  return res.blob();
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
