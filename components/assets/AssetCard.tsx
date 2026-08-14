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
  Play,
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

export interface AssetBadge {
  label: string;
  tone?: "slate" | "primary" | "blue";
  /** Full set of values this badge summarizes (e.g. every location name).
   *  When there's more than one, the badge becomes hoverable and opens a
   *  popover listing them all instead of relying on truncation. */
  details?: string[];
}

const BADGE_TONE_CLASSES: Record<NonNullable<AssetBadge["tone"]>, string> = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200/80",
  primary: "bg-primary-50 text-primary-800 ring-primary-200/80",
  blue: "bg-blue-50 text-blue-800 ring-blue-200/80",
};

interface Props {
  asset: Asset;
  role: "admin" | "support" | "partner";
  onDeleted: (id: string) => void;
  /** Location id this card is being shown under, when viewed in a per-location group. */
  locationContext?: string;
  onUpdated?: (asset: Asset) => void;
  /** Small pills shown over the preview (e.g. location name, asset type). */
  badges?: AssetBadge[];
}

export function AssetCard({ asset, role, onDeleted, locationContext, onUpdated, badges }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openBadge, setOpenBadge] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerBlob, setViewerBlob] = useState<Blob | null>(null);
  const [viewerIsRemote, setViewerIsRemote] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayName = asset.name || asset.originalFileName || asset.originalName;
  const category = asset.category;
  const isImage = asset.mimeType.startsWith("image/");
  const isVideo = asset.mimeType.startsWith("video/");
  /** Only admins may download videos — and only via the Download control. */
  const canDownload = role === "admin" || !isVideo;
  const canDelete = role === "admin";

  async function handleDownload() {
    if (!canDownload) return;
    setMenuOpen(false);
    setBusy(true);
    try {
      const { blob, filename } = await fetchAssetFile(
        asset.id,
        category,
        undefined,
        asset.originalFileName || displayName,
        { download: true },
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
      // Videos: keep the Blob in memory and play via srcObject (no blob: URL
      // in the DOM that can be copied into another tab).
      if (isVideo || !asset.fileUrl) {
        const { blob } = await fetchAssetFile(
          asset.id,
          category,
          undefined,
          undefined,
          { download: false },
        );
        setViewerIsRemote(false);
        if (isVideo) {
          setViewerBlob(blob);
          setViewerUrl(null);
        } else {
          setViewerBlob(null);
          setViewerUrl(URL.createObjectURL(blob));
        }
        return;
      }
      setViewerBlob(null);
      setViewerIsRemote(true);
      setViewerUrl(asset.fileUrl);
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
    setViewerBlob(null);
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
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card transition-shadow duration-200 hover:shadow-md">
      <div className="relative">
        {badges && badges.length > 0 && (
          <div className="absolute left-2 top-2 z-10 flex max-w-[calc(100%-2.5rem)] flex-wrap gap-1">
            {badges.map((b, i) => {
              const hasMore = (b.details?.length ?? 0) > 1;
              return (
                <div
                  key={i}
                  className="relative leading-none"
                  onMouseEnter={() => hasMore && setOpenBadge(i)}
                  onMouseLeave={() => hasMore && setOpenBadge(null)}
                >
                  <span
                    className={`inline-block truncate rounded-full px-2 py-0.5 align-middle text-[10px] font-medium leading-[14px] ring-1 ring-inset ${BADGE_TONE_CLASSES[b.tone ?? "slate"]} ${hasMore ? "cursor-default" : ""}`}
                  >
                    {b.label}
                  </span>
                  {hasMore && openBadge === i && (
                    <div className="absolute left-0 top-full z-20 mt-1 min-w-[160px] max-w-[220px] rounded-xl border border-slate-200 bg-white p-2 text-xs shadow-lg">
                      <ul className="space-y-1">
                        {b.details?.map((d, di) => (
                          <li key={di} className="truncate text-slate-700">{d}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <button
          type="button"
          disabled={busy}
          onClick={() => void handleView()}
          className="relative flex h-44 w-full cursor-pointer items-center justify-center overflow-hidden bg-slate-100 transition hover:bg-slate-200/80 disabled:cursor-wait"
          title={isVideo ? "Play video" : "View"}
          aria-label={`${isVideo ? "Play" : "View"} ${displayName}`}
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
          ) : isVideo ? (
            <>
              {asset.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={asset.thumbnailUrl}
                  alt=""
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : null}
              <span className="pointer-events-none absolute inset-0 bg-slate-900/25" />
              <span className="relative z-[1] flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-slate-900 shadow-md ring-1 ring-slate-200/80 transition group-hover:scale-105">
                <Play className="ml-0.5 h-7 w-7 fill-current" aria-hidden />
              </span>
            </>
          ) : (
            <PreviewIcon mimeType={asset.mimeType} />
          )}
        </button>
      </div>

      <div className="absolute right-2 top-2" ref={menuRef}>
        <button
          type="button"
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white/80 text-slate-600 shadow backdrop-blur-sm hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-8 z-20 min-w-[140px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
              <button
                type="button"
                onClick={handleView}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Eye className="h-4 w-4" /> {isVideo ? "Play" : "View"}
              </button>
              {canDownload ? (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" /> Download
                </button>
              ) : null}
              {canDelete ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              ) : null}
            </div>
          </>
        )}
      </div>

      <div className="px-3 py-2">
        <p
          title={displayName}
          className="truncate text-sm font-medium text-slate-900"
        >
          {displayName}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          {(asset.size / 1024).toFixed(0)} KB
          {asset.createdAt ? ` · ${formatUploadedDate(asset.createdAt)}` : ""}
        </p>
      </div>

      {(viewerUrl || viewerBlob) && (
        <AssetViewerModal
          fileUrl={viewerUrl || ""}
          videoBlob={viewerBlob}
          mimeType={asset.mimeType}
          filename={displayName}
          onClose={closeViewer}
          onDownload={canDownload ? handleDownload : undefined}
          canDownload={canDownload}
        />
      )}
    </div>
  );
}
