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

function formatUploadedDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

interface Props {
  asset: Asset;
  role: "admin" | "support" | "partner";
  onDeleted: (id: string) => void;
  /** Location id this card is being shown under, when viewed in a per-location group. */
  locationContext?: string;
  onUpdated?: (asset: Asset) => void;
}

export function AssetCard({ asset, role, onDeleted, locationContext, onUpdated }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerIsRemote, setViewerIsRemote] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayName = asset.name || asset.originalFileName || asset.originalName;
  const category = asset.category;

  async function handleDownload() {
    setMenuOpen(false);
    setBusy(true);
    try {
      // Always fetch as blob so download works for cross-origin R2 URLs
      // (the HTML download attribute is ignored for other origins).
      const { blob, filename } = await fetchAssetFile(
        asset.id,
        category,
        asset.fileUrl || undefined,
        asset.originalFileName || displayName,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || displayName;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
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
      if (asset.fileUrl) {
        setViewerIsRemote(true);
        setViewerUrl(asset.fileUrl);
        return;
      }
      const { blob } = await fetchAssetFile(asset.id, category);
      setViewerIsRemote(false);
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
    if (viewerUrl && !viewerIsRemote) URL.revokeObjectURL(viewerUrl);
    setViewerUrl(null);
    setViewerIsRemote(false);
  }

  async function handleDelete() {
    setMenuOpen(false);
    const isUnshare = Boolean(locationContext);
    const conf = await Swal.fire({
      title: isUnshare ? "Remove from this location?" : "Delete this file?",
      html: isUnshare
        ? `<p>Remove <strong>${displayName}</strong> from this location?</p><p class="mt-3 text-sm text-slate-600">It will remain available to any other locations it's shared with.</p>`
        : `<p>Remove <strong>${displayName}</strong>?</p><p class="mt-3 text-sm text-slate-600">This cannot be undone.</p>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: isUnshare ? "Remove" : "Delete",
      confirmButtonColor: "#dc2626",
    });
    if (!conf.isConfirmed) return;
    setBusy(true);
    try {
      if (isUnshare && locationContext) {
        const result = await removeAssetLocation(asset.id, locationContext, category);
        if (result.deleted || !result.asset) {
          onDeleted(asset.id);
        } else {
          onUpdated?.(result.asset);
        }
      } else {
        await deleteAsset(asset.id, category);
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
    let cancelled = false;
    setPreviewFailed(false);
    setPreviewUrl(null);

    if (asset.fileUrl) {
      setPreviewUrl(asset.fileUrl);
      return () => {
        cancelled = true;
      };
    }

    fetchAssetFile(asset.id, category)
      .then(({ blob }) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setPreviewFailed(true);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [asset.id, asset.fileUrl, category, isImage]);

  return (
    <div className="relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleView()}
        className="flex h-44 w-full cursor-pointer items-center justify-center bg-slate-100 transition hover:bg-slate-200/80 disabled:cursor-wait dark:bg-slate-700 dark:hover:bg-slate-600/80"
        title="View"
        aria-label={`View ${displayName}`}
      >
        {isImage ? (
          previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={displayName}
              className="pointer-events-none h-full w-full object-cover"
              onError={() => setPreviewFailed(true)}
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
      </button>

      <div className="absolute right-2 top-2" ref={menuRef}>
        <button
          type="button"
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white/80 text-slate-600 shadow backdrop-blur-sm hover:bg-white dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-8 z-20 min-w-[140px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
              <button
                type="button"
                onClick={handleView}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <Eye className="h-4 w-4" /> View
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <Download className="h-4 w-4" /> Download
              </button>
              {role === "admin" && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <div className="px-3 py-2">
        <p
          title={displayName}
          className="truncate text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          {displayName}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">
          {(asset.size / 1024).toFixed(0)} KB
          {asset.createdAt ? ` · ${formatUploadedDate(asset.createdAt)}` : ""}
        </p>
      </div>

      {viewerUrl && (
        <AssetViewerModal
          fileUrl={viewerUrl}
          mimeType={asset.mimeType}
          filename={displayName}
          onClose={closeViewer}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
}
