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
  Archive,
} from "lucide-react";
import type { Asset } from "@/lib/queries/assets";
import {
  fetchAssetFile,
  fetchAssetThumbnail,
  deleteAsset,
  removeAssetLocation,
} from "@/lib/queries/assets";
import { AssetViewerModal } from "@/components/assets/AssetViewerModal";
import { Skeleton } from "@/components/ui/skeleton";

function PreviewIcon({ mimeType, className = "h-14 w-14" }: { mimeType: string; className?: string }) {
  if (mimeType.startsWith("image/")) return <FileImage className={`${className} text-slate-400`} />;
  if (mimeType === "application/pdf") return <FileText className={`${className} text-red-400`} />;
  if (
    mimeType.includes("zip") ||
    mimeType.includes("compressed") ||
    mimeType === "application/x-zip-compressed"
  ) {
    return <Archive className={`${className} text-slate-500`} />;
  }
  return <File className={`${className} text-slate-400`} />;
}

function HeaderIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) return <FileImage className="h-4 w-4 shrink-0 text-slate-500" />;
  if (mimeType === "application/pdf") return <FileText className="h-4 w-4 shrink-0 text-red-500" />;
  if (mimeType.includes("zip") || mimeType.includes("compressed")) {
    return <Archive className="h-4 w-4 shrink-0 text-slate-500" />;
  }
  if (mimeType.startsWith("video/")) return <Play className="h-4 w-4 shrink-0 text-slate-500" />;
  return <File className="h-4 w-4 shrink-0 text-slate-500" />;
}

export interface AssetBadge {
  label: string;
  tone?: "slate" | "primary" | "blue";
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
  locationContext?: string;
  onUpdated?: (asset: Asset) => void;
  badges?: AssetBadge[];
  /** Drive-style selection (no checkbox). */
  selected?: boolean;
  onSelect?: () => void;
  /** Allow dragging this card onto a folder. */
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
}

export function AssetCard({
  asset,
  role,
  onDeleted,
  locationContext,
  onUpdated,
  badges,
  selected = false,
  onSelect,
  draggable = false,
  onDragStart,
  onDragEnd,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openBadge, setOpenBadge] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [videoThumbUrl, setVideoThumbUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerBlob, setViewerBlob] = useState<Blob | null>(null);
  const [viewerIsRemote, setViewerIsRemote] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayName = asset.name || asset.originalFileName || asset.originalName;
  const category = asset.category;
  const isImage = asset.mimeType.startsWith("image/");
  const isVideo = asset.mimeType.startsWith("video/");
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
      if (isVideo || !asset.fileUrl) {
        const { blob } = await fetchAssetFile(asset.id, category, undefined, undefined, {
          download: false,
        });
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

  useEffect(() => {
    if (!isVideo) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    setVideoThumbUrl(null);

    fetchAssetThumbnail(asset.id, category)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setVideoThumbUrl(objectUrl);
      })
      .catch(() => {
        /* play button only */
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [asset.id, category, isVideo]);

  function handleCardClick(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest("[data-menu]")) return;
    if (onSelect) {
      onSelect();
      return;
    }
    void handleView();
  }

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={handleCardClick}
      onDoubleClick={(e) => {
        e.preventDefault();
        void handleView();
      }}
      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-white transition ${
        selected
          ? "border-blue-500 ring-2 ring-blue-500/30 shadow-md"
          : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
      }`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (onSelect) onSelect();
          else void handleView();
        }
      }}
      aria-selected={selected}
    >
      {/* Drive-style header: icon + name + ⋮ */}
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-2.5 py-2">
        <HeaderIcon mimeType={asset.mimeType} />
        <span title={displayName} className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
          {displayName}
        </span>
        <div className="relative shrink-0" ref={menuRef} data-menu>
          <button
            type="button"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200/80 hover:text-slate-800"
            aria-label="More actions"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                }}
              />
              <div className="absolute right-0 top-8 z-20 min-w-[148px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleView();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Eye className="h-4 w-4" /> {isVideo ? "Play" : "View"}
                </button>
                {canDownload ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDownload();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" /> Download
                  </button>
                ) : null}
                {canDelete ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDelete();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Preview body */}
      <div className="p-2">
        <div className="relative flex h-36 w-full items-center justify-center overflow-hidden rounded-lg bg-slate-100">
        {badges && badges.length > 0 && (
          <div className="absolute left-2 top-2 z-10 flex max-w-[calc(100%-1rem)] flex-wrap gap-1">
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
                    className={`inline-block truncate rounded-full px-2 py-0.5 align-middle text-[10px] font-medium leading-[14px] ring-1 ring-inset ${BADGE_TONE_CLASSES[b.tone ?? "slate"]}`}
                  >
                    {b.label}
                  </span>
                  {hasMore && openBadge === i && (
                    <div className="absolute left-0 top-full z-20 mt-1 min-w-[160px] max-w-[220px] rounded-xl border border-slate-200 bg-white p-2 text-xs shadow-lg">
                      <ul className="space-y-1">
                        {b.details?.map((d, di) => (
                          <li key={di} className="truncate text-slate-700">
                            {d}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {isImage ? (
          previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt=""
              className="pointer-events-none h-full w-full object-cover"
              onError={() => setPreviewFailed(true)}
            />
          ) : previewFailed ? (
            <div className="flex flex-col items-center gap-1 text-slate-400">
              <ImageOff className="h-8 w-8" />
              <span className="text-xs">Unavailable</span>
            </div>
          ) : (
            <Skeleton className="h-full w-full rounded-none" />
          )
        ) : isVideo ? (
          <>
            {videoThumbUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={videoThumbUrl}
                alt=""
                className="pointer-events-none absolute inset-0 h-full w-full object-cover"
              />
            ) : null}
            <span className="pointer-events-none absolute inset-0 bg-slate-900/20" />
            <span className="relative z-[1] flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-slate-900 shadow-md ring-1 ring-slate-200/80">
              <Play className="ml-0.5 h-6 w-6 fill-current" aria-hidden />
            </span>
          </>
        ) : (
          <PreviewIcon mimeType={asset.mimeType} />
        )}
        </div>
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
