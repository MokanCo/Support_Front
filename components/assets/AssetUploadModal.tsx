"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import type { AssetCategory, MarketingAssetType } from "@/lib/queries/assets";
import { uploadAsset, MARKETING_ASSET_TYPES, type Asset } from "@/lib/queries/assets";
import { fetchLocationOptions } from "@/lib/queries/locations";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  category: AssetCategory;
  onUploaded: (asset: Asset) => void;
  onClose: () => void;
}

export function AssetUploadModal({ category, onUploaded, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [visibility, setVisibility] = useState<"global" | "location">("global");
  const [locationIds, setLocationIds] = useState<string[]>([]);
  const [assetType, setAssetType] = useState<MarketingAssetType>("postcard");
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState("");
  const [failedUploads, setFailedUploads] = useState<string[]>([]);

  useEffect(() => {
    if (visibility !== "location") return;
    if (locations.length > 0) return;
    setLoadingLocations(true);
    fetchLocationOptions()
      .then((data) => setLocations(data))
      .catch(() => setError("Failed to load locations."))
      .finally(() => setLoadingLocations(false));
  }, [visibility, locations.length]);

  function toggleLocation(id: string) {
    setLocationIds((prev) => (prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]));
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) { setError("Please select at least one file."); return; }
    if (visibility === "location" && locationIds.length === 0) {
      setError("Please select at least one location.");
      return;
    }
    setUploading(true);
    setError("");
    setFailedUploads([]);
    setProgress({ done: 0, total: files.length });

    const failures: string[] = [];
    for (const file of files) {
      try {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          throw new Error(
            `${formatFileSize(file.size)} exceeds the 50 MB limit`,
          );
        }
        const fd = new FormData();
        fd.append("file", file);
        fd.append("category", category);
        fd.append("name", file.name.replace(/\.[^.]+$/, "") || file.name);
        fd.append("visibility", visibility);
        if (visibility === "location") {
          for (const id of locationIds) fd.append("locationIds", id);
        }
        if (category === "marketing_assets") {
          fd.append("type", assetType);
        }
        const asset = await uploadAsset(fd);
        if (visibility === "location" && asset.locationIds.length === 0) {
          asset.locationIds = locationIds;
        }
        if (category === "marketing_assets" && !asset.type) {
          asset.type = assetType;
        }
        onUploaded(asset);
      } catch (err) {
        const reason = err instanceof Error ? err.message : "Upload failed";
        failures.push(`${file.name} (${reason})`);
      } finally {
        setProgress((p) => ({ ...p, done: p.done + 1 }));
      }
    }

    setUploading(false);
    if (failures.length > 0) {
      setFailedUploads(failures);
      return;
    }
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Upload ${category === "documents" ? "Documents" : "Marketing Assets"}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* File picker */}
        <div>
          <div
            onClick={() => fileRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-8 transition hover:border-primary-400"
          >
            <Upload className="mb-2 h-8 w-8 text-slate-400" />
            <p className="text-sm text-slate-500">
              Click to select file(s) (max 50 MB each)
            </p>
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
          {files.length > 0 && (
            <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto">
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600"
                >
                  <span className="truncate">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="ml-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Type — marketing assets only */}
        {category === "marketing_assets" && (
          <Select
            label="Type"
            value={assetType}
            onChange={(e) => setAssetType(e.target.value as MarketingAssetType)}
          >
            {MARKETING_ASSET_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </Select>
        )}

        {/* Visibility */}
        <Select
          label="Visibility"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as "global" | "location")}
        >
          <option value="global">General (visible to all partners)</option>
          <option value="location">Specific location(s) only</option>
        </Select>

        {/* Location picker — shown only when visibility is "location" */}
        {visibility === "location" && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Locations
            </label>
            {loadingLocations ? (
              <Skeleton className="h-24 w-full rounded-lg" />
            ) : locations.length === 0 ? (
              <p className="text-sm text-slate-400">No locations found.</p>
            ) : (
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
                {locations.map((l) => (
                  <label
                    key={l.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={locationIds.includes(l.id)}
                      onChange={() => toggleLocation(l.id)}
                      className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    {l.name}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        {failedUploads.length > 0 && (
          <div className="rounded-lg bg-red-50 p-3">
            <p className="text-sm font-medium text-red-700">
              {failedUploads.length === 1 ? "1 file failed to upload:" : `${failedUploads.length} files failed to upload:`}
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-red-600">
              {failedUploads.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={uploading}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={uploading || files.length === 0 || (visibility === "location" && locationIds.length === 0)}
          >
            {uploading ? `Uploading ${progress.done}/${progress.total}…` : "Upload"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
