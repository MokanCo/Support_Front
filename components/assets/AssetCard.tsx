"use client";

import { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import {
  MoreVertical,
  Download,
  Eye,
  Trash2,
  FileText,
  FileImage,
  File,
  ImageOff,
} from "lucide-react";
import type { Asset } from "@/lib/queries/assets";
import { fetchAssetFile, deleteAsset, removeAssetLocation } from "@/lib/queries/assets";
import { AssetViewerModal } from "@/components/assets/AssetViewerModal";
import { Skeleton } from "@/components/ui/skeleton";

function PreviewIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) return <FileImage className="h-12 w-12 text-slate-400" />;
  if (mimeType === "application/pdf") return <FileText className="h-12 w-12 text-red-400" />;
  return <File className="h-12 w-12 text-slate-400" />;
}

interface Props {
  asset: Asset;
  role: "admin" | "support" | "partner";
  onDeleted: (id: string) => void;
  /** Location id this card is being shown under, when viewed in a per-location group.
   *  Omit for General/global assets. If set, Delete only unshares this one location
   *  instead of removing the asset entirely. */
  locationContext?: string;
  onUpdated?: (asset: Asset) => void;
}

export function AssetCard({ asset, role, onDeleted, locationContext, onUpdated }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  async function handleDownload() {
    setMenuOpen(false);
    setBusy(true);
    try {
      const { blob, filename } = await fetchAssetFile(asset.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      void Swal.fire({
        icon: "error",
        title: "Could not download file",
        text: err instanceof Error ? err.message : "The file may no longer be available.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleView() {
    setMenuOpen(false);
    setBusy(true);
    try {
      const { blob } = await fetchAssetFile(asset.id);
      setViewerUrl(URL.createObjectURL(blob));
    } catch (err) {
      void Swal.fire({
        icon: "error",
        title: "Could not open file",
        text: err instanceof Error ? err.message : "The file may no longer be available.",
      });
    } finally {
      setBusy(false);
    }
  }

  function closeViewer() {
    if (viewerUrl) URL.revokeObjectURL(viewerUrl);
    setViewerUrl(null);
  }

  async function handleDelete() {
    setMenuOpen(false);
    const isUnshare = Boolean(locationContext);
    const conf = await Swal.fire({
      title: isUnshare ? "Remove from this location?" : "Delete this file?",
      html: isUnshare
        ? `<p>Remove <strong>${asset.originalName}</strong> from this location?</p><p class="mt-3 text-sm text-slate-600">It will remain available to any other locations it's shared with.</p>`
        : `<p>Remove <strong>${asset.originalName}</strong>?</p><p class="mt-3 text-sm text-slate-600">This cannot be undone.</p>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: isUnshare ? "Remove" : "Delete",
      confirmButtonColor: "#dc2626",
    });
    if (!conf.isConfirmed) return;
    setBusy(true);
    try {
      if (isUnshare && locationContext) {
        const result = await removeAssetLocation(asset.id, locationContext);
        if (result.deleted || !result.asset) {
          onDeleted(asset.id);
        } else {
          onUpdated?.(result.asset);
        }
      } else {
        await deleteAsset(asset.id);
        onDeleted(asset.id);
      }
    } catch (err) {
      void Swal.fire({
        icon: "error",
        title: "Could not remove file",
        text: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  const isImage = asset.mimeType.startsWith("image/");

  useEffect(() => {
    if (!isImage) return;
    let objectUrl: string | null = null;
    setPreviewFailed(false);
    fetchAssetFile(asset.id)
      .then(({ blob }) => {
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      })
      .catch(() => setPreviewFailed(true));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset.id, isImage]);

  return (
    <div className="relative flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-700 dark:bg-slate-800">
      {/* Preview area */}
      <div className="flex h-44 w-full items-center justify-center bg-slate-100 dark:bg-slate-700">
        {isImage ? (
          previewUrl ? (
            <img
              src={previewUrl}
              alt={asset.originalName}
              className="h-full w-full object-cover"
            />
          ) : previewFailed ? (
            <div className="flex flex-col items-center gap-1 text-slate-400">
              <ImageOff className="h-8 w-8" />
              <span className="text-xs">File unavailable</span>
            </div>
          ) : (
            <Skeleton className="h-full w-full" />
          )
        ) : (
          <PreviewIcon mimeType={asset.mimeType} />
        )}
      </div>

      {/* Three-dot menu */}
      <div className="absolute right-2 top-2" ref={menuRef}>
        <button
          disabled={busy}
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-slate-600 shadow backdrop-blur-sm hover:bg-white dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-8 z-20 min-w-[140px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
              <button
                onClick={handleView}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <Eye className="h-4 w-4" /> View
              </button>
              <button
                onClick={handleDownload}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <Download className="h-4 w-4" /> Download
              </button>
              {role === "admin" && (
                <button
                  onClick={handleDelete}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Title */}
      <div className="px-3 py-2">
        <p
          title={asset.originalName}
          className="truncate text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          {asset.originalName}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">
          {(asset.size / 1024).toFixed(0)} KB
        </p>
      </div>

      {viewerUrl && (
        <AssetViewerModal
          fileUrl={viewerUrl}
          mimeType={asset.mimeType}
          filename={asset.originalName}
          onClose={closeViewer}
        />
      )}
    </div>
  );
}
