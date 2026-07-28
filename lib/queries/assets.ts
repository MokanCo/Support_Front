import { apiFetch } from "@/lib/auth-fetch";

export type AssetCategory = "documents" | "marketing_assets";
export type AssetVisibility = "global" | "location";
export type MarketingAssetType = "postcard" | "banner" | "logo" | "other";

export const MARKETING_ASSET_TYPES: { value: MarketingAssetType; label: string }[] = [
  { value: "postcard", label: "Post card" },
  { value: "banner", label: "Banners" },
  { value: "logo", label: "Logo" },
  { value: "other", label: "Other" },
];

export interface Asset {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  category: AssetCategory;
  visibility: AssetVisibility;
  locationIds: string[];
  type?: MarketingAssetType;
  uploadedBy: string;
  expiresAt: string;
  createdAt: string;
}

export async function fetchAssets(category: AssetCategory): Promise<Asset[]> {
  const res = await apiFetch(`/api/assets?category=${category}`);
  if (!res.ok) throw new Error("Failed to fetch assets");
  const data = await res.json();
  return data.assets as Asset[];
}

export async function uploadAsset(formData: FormData): Promise<Asset> {
  const res = await apiFetch("/api/assets", { method: "POST", body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Upload failed");
  }
  const data = await res.json();
  return data.asset as Asset;
}

export async function deleteAsset(id: string): Promise<void> {
  const res = await apiFetch(`/api/assets/${id}`, { method: "DELETE" });
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
): Promise<{ deleted: boolean; asset: Asset | null }> {
  const res = await apiFetch(`/api/assets/${id}/locations/${locationId}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Failed to remove from location");
  }
  return res.json();
}

export async function fetchAssetFile(
  id: string,
): Promise<{ blob: Blob; filename: string }> {
  const res = await apiFetch(`/api/assets/${id}/file`);
  if (!res.ok) throw new Error("Failed to fetch file");
  const cd = res.headers.get("content-disposition") ?? "";
  const match = cd.match(/filename[^;=\n]*=(?:(['"])([^'"]*)\1|([^;\n]*))/);
  const filename = match?.[2] ?? match?.[3] ?? "file";
  const blob = await res.blob();
  return { blob, filename };
}
