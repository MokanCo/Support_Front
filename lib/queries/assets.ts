import type { QueryClient } from "@tanstack/react-query";
import { apiFetch, getBearerAuthorizationHeader } from "@/lib/auth-fetch";
import { resolveApiUrl } from "@/lib/api-base";
import { queryKeys } from "@/lib/query-keys";
import { zipBlobs } from "@/lib/zip-store";

export type AssetCategory = "documents" | "marketing_assets";
export type AssetVisibility = "global" | "location";
export type MarketingAssetType = "postcard" | "banner" | "logo" | "video" | "other";

export function isPdfAsset(mimeType: string, filename = "") {
  const mime = String(mimeType || "").toLowerCase();
  const name = String(filename || "").toLowerCase();
  return mime.includes("pdf") || name.endsWith(".pdf");
}

export const MARKETING_ASSET_TYPES: {
  value: MarketingAssetType;
  label: string;
}[] = [
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
  folderId?: string | null;
  uploadedBy: string;
  expiresAt: string;
  createdAt: string;
  updatedAt?: string;
  isDeleted?: boolean;
}

export interface AssetFolder {
  id: string;
  name: string;
  parentId: string | null;
  category: AssetCategory;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
  containsVideo?: boolean;
}

function categoryBasePath(category: AssetCategory): string {
  return category === "documents" ? "/api/documents" : "/api/marketing-assets";
}

export function assetFileApiPath(category: AssetCategory, id: string): string {
  return `${categoryBasePath(category)}/${id}/file`;
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
    folderId: raw.folderId ? String(raw.folderId) : null,
    uploadedBy: String(raw.uploadedBy ?? ""),
    expiresAt: String(raw.expiresAt ?? ""),
    createdAt: String(raw.createdAt ?? ""),
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
    isDeleted: Boolean(raw.isDeleted),
  };
}

export async function fetchAssets(
  category: AssetCategory,
  opts?: { folderId?: string | null; allFolders?: boolean },
): Promise<Asset[]> {
  const params = new URLSearchParams();
  if (opts?.allFolders) params.set("allFolders", "1");
  else if (opts?.folderId) params.set("folderId", opts.folderId);
  const qs = params.toString();
  const res = await apiFetch(
    `${categoryBasePath(category)}${qs ? `?${qs}` : ""}`,
  );
  if (!res.ok) throw new Error("Failed to fetch assets");
  const data = (await res.json()) as {
    documents?: unknown[];
    assets?: unknown[];
  };
  const rows = (category === "documents" ? data.documents : data.assets) ?? [];
  return rows.map((row) => normalizeAsset(row as Record<string, unknown>));
}

export function assetsListQueryKey(
  category: AssetCategory,
  folderId: string | null = null,
) {
  return queryKeys.assets.list(category, folderId);
}

export function assetsListQueryOptions(
  category: AssetCategory,
  folderId: string | null = null,
) {
  return {
    queryKey: assetsListQueryKey(category, folderId),
    queryFn: () => fetchAssets(category, { folderId }),
  } as const;
}

export function assetsFoldersQueryOptions(
  category: AssetCategory,
  parentId: string | null = null,
) {
  return {
    queryKey: queryKeys.assets.folders(category, parentId),
    queryFn: () => fetchFolders(category, parentId),
  } as const;
}

/** Video card thumbs — long-lived; remounting a card must not refetch. */
export function assetThumbnailQueryOptions(
  category: AssetCategory,
  id: string,
) {
  return {
    queryKey: queryKeys.assets.thumbnail(category, id),
    queryFn: () => fetchAssetThumbnail(id, category),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  } as const;
}

/** Inline file blob for the viewer modal (videos + PDFs) — cache so reopen is instant. */
export function assetInlineFileQueryOptions(
  category: AssetCategory,
  id: string,
) {
  return {
    queryKey: queryKeys.assets.file(category, id, "inline"),
    queryFn: async () => {
      const { blob } = await fetchAssetFile(id, category, undefined, undefined, {
        download: false,
      });
      return blob;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  } as const;
}

/** Short-lived R2 URL so the browser can stream a PDF (range requests). */
export function assetPreviewUrlQueryOptions(
  category: AssetCategory,
  id: string,
) {
  return {
    queryKey: queryKeys.assets.previewUrl(category, id),
    queryFn: () => fetchAssetPreviewUrl(id, category),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  } as const;
}

export function setAssetsListCache(
  queryClient: QueryClient,
  category: AssetCategory,
  updater: (prev: Asset[]) => Asset[],
  folderId: string | null = null,
) {
  queryClient.setQueryData<Asset[]>(assetsListQueryKey(category, folderId), (prev) =>
    updater(prev ?? []),
  );
}

function normalizeFolder(raw: Record<string, unknown>): AssetFolder {
  return {
    id: String(raw.id),
    name: String(raw.name ?? ""),
    parentId: raw.parentId ? String(raw.parentId) : null,
    category: raw.category as AssetCategory,
    createdBy: raw.createdBy ? String(raw.createdBy) : null,
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
    containsVideo: Boolean(raw.containsVideo),
  };
}

export async function fetchFolders(
  category: AssetCategory,
  parentId: string | null = null,
  opts?: { allFolders?: boolean },
): Promise<AssetFolder[]> {
  const params = new URLSearchParams();
  if (opts?.allFolders) params.set("allFolders", "1");
  else if (parentId) params.set("parentId", parentId);
  const qs = params.toString();
  const res = await apiFetch(
    `${categoryBasePath(category)}/folders${qs ? `?${qs}` : ""}`,
  );
  if (!res.ok) throw new Error("Failed to fetch folders");
  const data = (await res.json()) as { folders: unknown[] };
  return (data.folders ?? []).map((f) =>
    normalizeFolder(f as Record<string, unknown>),
  );
}

export async function fetchFolderPath(
  category: AssetCategory,
  folderId: string,
): Promise<AssetFolder[]> {
  const res = await apiFetch(
    `${categoryBasePath(category)}/folders/${folderId}/path`,
  );
  if (!res.ok) throw new Error("Failed to fetch folder path");
  const data = (await res.json()) as { path: unknown[] };
  return (data.path ?? []).map((f) =>
    normalizeFolder(f as Record<string, unknown>),
  );
}

export async function createFolder(
  category: AssetCategory,
  body: { name: string; parentId?: string | null },
): Promise<AssetFolder> {
  const res = await apiFetch(`${categoryBasePath(category)}/folders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Could not create folder");
  }
  const data = (await res.json()) as { folder: Record<string, unknown> };
  return normalizeFolder(data.folder);
}

export async function renameFolder(
  category: AssetCategory,
  id: string,
  name: string,
): Promise<AssetFolder> {
  const res = await apiFetch(`${categoryBasePath(category)}/folders/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Could not rename folder");
  }
  const data = (await res.json()) as { folder: Record<string, unknown> };
  return normalizeFolder(data.folder);
}

export async function moveFolder(
  category: AssetCategory,
  id: string,
  parentId: string | null,
): Promise<AssetFolder> {
  const res = await apiFetch(`${categoryBasePath(category)}/folders/${id}/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parentId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Could not move folder");
  }
  const data = (await res.json()) as { folder: Record<string, unknown> };
  return normalizeFolder(data.folder);
}

export async function deleteFolder(
  category: AssetCategory,
  id: string,
  force = false,
): Promise<{
  ok: boolean;
  deletedAssets?: number;
  deletedFolders?: number;
  code?: string;
  assetCount?: number;
  subfolderCount?: number;
  message?: string;
}> {
  const res = await apiFetch(`${categoryBasePath(category)}/folders/${id}?force=${force ? "1" : "0"}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ force }),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    return {
      ok: false,
      message: String(data.message ?? data.error ?? "Could not delete folder"),
      code: data.code ? String(data.code) : undefined,
      assetCount: Number(data.assetCount ?? 0),
      subfolderCount: Number(data.subfolderCount ?? 0),
    };
  }
  return {
    ok: true,
    deletedAssets: Number(data.deletedAssets ?? 0),
    deletedFolders: Number(data.deletedFolders ?? 0),
  };
}

export async function ensureFolderPath(
  category: AssetCategory,
  body: { parentId?: string | null; pathParts: string[] },
): Promise<{ folderId: string | null }> {
  const res = await apiFetch(`${categoryBasePath(category)}/folders/ensure-path`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Could not create folder path");
  }
  const data = (await res.json()) as { folderId: string | null };
  return { folderId: data.folderId };
}

export async function moveAssets(
  category: AssetCategory,
  body: { assetIds: string[]; folderId: string | null },
): Promise<Asset[]> {
  const res = await apiFetch(`${categoryBasePath(category)}/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Could not move assets");
  }
  const data = (await res.json()) as { assets: unknown[] };
  return (data.assets ?? []).map((a) =>
    normalizeAsset(a as Record<string, unknown>),
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

export async function fetchAssetPreviewUrl(
  id: string,
  category: AssetCategory = "documents",
): Promise<string> {
  const res = await apiFetch(`${categoryBasePath(category)}/${id}/preview-url`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message ?? "Could not open this file.",
    );
  }
  const data = (await res.json()) as { url?: string };
  if (!data.url) throw new Error("Could not open this file.");
  return data.url;
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

function filenameFromDisposition(res: Response, fallback: string) {
  const cd = res.headers.get("content-disposition") ?? "";
  const match = cd.match(/filename\*?=(?:UTF-8''|(['"]))?([^'";\n]+)\1?/i);
  const rawName = match?.[2] ? decodeURIComponent(match[2]) : "";
  return rawName || fallback;
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function readApiError(res: Response, fallback: string) {
  const text = await res.text();
  try {
    const data = JSON.parse(text) as { message?: string; error?: string };
    return data.message || data.error || fallback;
  } catch {
    return text.slice(0, 180) || fallback;
  }
}

type ZipManifest = {
  zipName: string;
  files: { id: string; name: string; zipPath: string }[];
};

async function downloadManifestZip(
  category: AssetCategory,
  manifest: ZipManifest,
) {
  if (!manifest.files?.length) {
    throw new Error("This folder has no files to download");
  }
  const packed: { path: string; blob: Blob }[] = [];
  for (const file of manifest.files) {
    try {
      const { blob } = await fetchAssetFile(
        file.id,
        category,
        undefined,
        file.name,
        { download: true },
      );
      packed.push({ path: file.zipPath || file.name, blob });
    } catch {
      /* skip files the user isn't allowed to download */
    }
  }
  if (!packed.length) {
    throw new Error("Could not download any files from this selection");
  }
  const zip = await zipBlobs(packed);
  triggerBlobDownload(zip, manifest.zipName || "download.zip");
}

export async function downloadFolderZip(
  category: AssetCategory,
  folderId: string,
): Promise<void> {
  const res = await apiFetch(
    `${categoryBasePath(category)}/folders/${folderId}/download`,
    { method: "POST" },
  );
  if (!res.ok) {
    throw new Error(await readApiError(res, "Could not download folder"));
  }
  const manifest = (await res.json()) as ZipManifest;
  await downloadManifestZip(category, manifest);
}

export async function downloadAssetsZip(
  category: AssetCategory,
  assetIds: string[],
): Promise<void> {
  const res = await apiFetch(`${categoryBasePath(category)}/download-zip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetIds }),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res, "Could not download files"));
  }
  const manifest = (await res.json()) as ZipManifest;
  await downloadManifestZip(category, manifest);
}

export async function bulkDeleteAssets(
  category: AssetCategory,
  assetIds: string[],
): Promise<{ deleted: number }> {
  const res = await apiFetch(`${categoryBasePath(category)}/bulk-delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message ?? "Could not delete files",
    );
  }
  const data = (await res.json()) as { deleted?: number };
  return { deleted: Number(data.deleted ?? 0) };
}
