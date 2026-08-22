"use client";

import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2, Maximize, Pause, Play, Volume2, VolumeX, X } from "lucide-react";
import {
  assetInlineFileQueryOptions,
  assetPreviewUrlQueryOptions,
  isPdfAsset,
  type AssetCategory,
} from "@/lib/queries/assets";

interface Props {
  fileUrl: string;
  mimeType: string;
  filename: string;
  onClose: () => void;
  onDownload?: () => void | Promise<void>;
  /** When false, hide download (e.g. partners viewing video). */
  canDownload?: boolean;
  /**
   * Preferred for videos: play via srcObject so no blob: URL appears in the
   * DOM that can be copied into another tab.
   */
  videoBlob?: Blob | null;
  /** When set with category, modal opens immediately and loads the video in the background. */
  assetId?: string;
  category?: AssetCategory;
  videoLoading?: boolean;
  videoError?: string | null;
}

function MinimalVideoPlayer({
  blob,
  title,
}: {
  blob: Blob;
  title: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [maximized, setMaximized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    let objectUrl: string | null = null;
    let revoked = false;
    let cancelled = false;
    let usingFallbackUrl = false;

    const revokeFallbackUrl = () => {
      if (!objectUrl || revoked) return;
      revoked = true;
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    };

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    const attachObjectUrlFallback = () => {
      if (cancelled || usingFallbackUrl) return;
      usingFallbackUrl = true;
      el.srcObject = null;
      objectUrl = URL.createObjectURL(blob);
      el.src = objectUrl;
      const onReady = () => revokeFallbackUrl();
      el.addEventListener("loadeddata", onReady, { once: true });
      el.addEventListener("canplay", onReady, { once: true });
      window.setTimeout(revokeFallbackUrl, 1500);
      void el.play().catch(() => setPlaying(false));
    };

    const onError = () => {
      if (cancelled) return;
      if (!usingFallbackUrl) {
        attachObjectUrlFallback();
        return;
      }
      setError("Could not play this video.");
    };

    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("error", onError);

    setError(null);
    el.pause();
    el.removeAttribute("src");
    el.srcObject = null;
    el.load();

    try {
      el.srcObject = blob;
      void el.play().catch(() => setPlaying(false));
    } catch {
      attachObjectUrlFallback();
    }

    return () => {
      cancelled = true;
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("error", onError);
      revokeFallbackUrl();
      el.pause();
      el.removeAttribute("src");
      el.srcObject = null;
      el.load();
    };
  }, [blob]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setMaximized(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  function blockSaveGestures(e: SyntheticEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function togglePlay() {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  }

  function toggleMute() {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  }

  function onVolumeChange(value: number) {
    const el = videoRef.current;
    if (!el) return;
    el.volume = value;
    el.muted = value === 0;
    setVolume(value);
    setMuted(value === 0);
  }

  async function toggleMaximize() {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      if (container.requestFullscreen) {
        await container.requestFullscreen();
      } else if (
        video &&
        "webkitEnterFullscreen" in video &&
        typeof (video as HTMLVideoElement & { webkitEnterFullscreen: () => void })
          .webkitEnterFullscreen === "function"
      ) {
        (video as HTMLVideoElement & { webkitEnterFullscreen: () => void }).webkitEnterFullscreen();
      }
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      ref={containerRef}
      className="flex w-full flex-col overflow-hidden rounded-lg bg-black"
      onContextMenu={blockSaveGestures}
      onDragStart={blockSaveGestures}
    >
      <video
        ref={videoRef}
        playsInline
        controlsList="nodownload noremoteplayback noplaybackrate"
        disablePictureInPicture
        disableRemotePlayback
        draggable={false}
        className={`w-full bg-black ${maximized ? "min-h-0 flex-1" : "max-h-[70vh]"}`}
        onClick={togglePlay}
        onContextMenu={blockSaveGestures}
        onDragStart={blockSaveGestures}
        aria-label={title}
      >
        Your browser does not support video playback.
      </video>
      {error ? (
        <p className="bg-slate-900 px-3 py-2 text-sm text-red-300">{error}</p>
      ) : null}
      <div className="flex shrink-0 items-center gap-3 bg-slate-900 px-3 py-2">
        <button
          type="button"
          onClick={togglePlay}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white transition hover:bg-white/10"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>
        <button
          type="button"
          onClick={toggleMute}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white transition hover:bg-white/10"
          aria-label={muted || volume === 0 ? "Unmute" : "Mute"}
        >
          {muted || volume === 0 ? (
            <VolumeX className="h-5 w-5" />
          ) : (
            <Volume2 className="h-5 w-5" />
          )}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={muted ? 0 : volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          className="h-1.5 w-28 cursor-pointer accent-white"
          aria-label="Volume"
        />
        <button
          type="button"
          onClick={() => void toggleMaximize()}
          className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg text-white transition hover:bg-white/10"
          aria-label={maximized ? "Exit fullscreen" : "Maximize"}
          title={maximized ? "Exit fullscreen" : "Maximize"}
        >
          <Maximize className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function VideoLoadingState() {
  return (
    <div className="flex min-h-[280px] w-full flex-col items-center justify-center gap-3 rounded-lg bg-slate-900 text-slate-200">
      <Loader2 className="h-8 w-8 animate-spin text-white" aria-hidden />
      <p className="text-sm">Loading video…</p>
    </div>
  );
}

export function AssetViewerModal({
  fileUrl,
  mimeType,
  filename,
  onClose,
  onDownload,
  canDownload = true,
  videoBlob = null,
  assetId,
  category,
  videoLoading = false,
  videoError = null,
}: Props) {
  const isImage = mimeType.startsWith("image/") && !isPdfAsset(mimeType, filename);
  const isPdf = isPdfAsset(mimeType, filename);
  const isVideo = mimeType.startsWith("video/");
  const [downloading, setDownloading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const showDownload = Boolean(canDownload && onDownload);

  useEffect(() => {
    setMounted(true);
  }, []);

  const inlineQuery = useQuery({
    ...assetInlineFileQueryOptions(category ?? "documents", assetId ?? ""),
    enabled: Boolean(isVideo && assetId && category && !videoBlob),
  });

  const previewQuery = useQuery({
    ...assetPreviewUrlQueryOptions(category ?? "documents", assetId ?? ""),
    enabled: Boolean(isPdf && assetId && category),
  });

  const resolvedBlob = videoBlob ?? inlineQuery.data ?? null;
  const loadingFile =
    isVideo &&
    !resolvedBlob &&
    (videoLoading || (inlineQuery.isPending && !inlineQuery.data));
  const loadError =
    videoError ||
    (isVideo && !resolvedBlob && inlineQuery.isError
      ? inlineQuery.error instanceof Error
        ? inlineQuery.error.message
        : "Could not load this file."
      : null);

  const waitingForSignedPdf = Boolean(
    isPdf && assetId && category && previewQuery.isLoading,
  );
  const pdfSrc = isPdf
    ? previewQuery.data || (waitingForSignedPdf ? "" : fileUrl) || ""
    : "";
  const [pdfFrameReady, setPdfFrameReady] = useState(false);
  useEffect(() => {
    setPdfFrameReady(false);
    if (!pdfSrc) return;
    const t = window.setTimeout(() => setPdfFrameReady(true), 8000);
    return () => window.clearTimeout(t);
  }, [pdfSrc]);

  const loadingPdf = Boolean(isPdf && !pdfSrc && waitingForSignedPdf);
  const pdfError =
    isPdf && !pdfSrc && !waitingForSignedPdf
      ? previewQuery.isError
        ? previewQuery.error instanceof Error
          ? previewQuery.error.message
          : "Could not load this PDF."
        : "Could not open this PDF."
      : null;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function handleDownload() {
    if (!onDownload || downloading) return;
    setDownloading(true);
    try {
      await onDownload();
    } finally {
      setDownloading(false);
    }
  }

  const dialog = (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`flex w-full flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl ${
          isVideo
            ? "h-auto max-h-[90vh] max-w-4xl"
            : isPdf
              ? "h-[90vh] max-w-6xl"
              : "h-[85vh] max-w-3xl"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <p
            className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight text-slate-900"
            title={filename}
          >
            {filename}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            {showDownload ? (
              <button
                type="button"
                onClick={() => void handleDownload()}
                disabled={downloading}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
                title="Download"
              >
                <Download className="h-4 w-4" />
                {downloading ? "Downloading…" : "Download"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div
          className={`flex min-h-0 flex-1 items-center justify-center overflow-auto bg-slate-100 p-4 ${
            isVideo ? "" : ""
          }`}
        >
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fileUrl}
              alt={filename}
              className="max-h-full max-w-full object-contain"
            />
          ) : isPdf ? (
            loadingPdf ? (
              <div className="flex min-h-[280px] w-full flex-col items-center justify-center gap-3 text-slate-500">
                <Loader2 className="h-8 w-8 animate-spin text-slate-700" aria-hidden />
                <p className="text-sm">Opening PDF…</p>
              </div>
            ) : pdfSrc ? (
              <div className="relative h-full min-h-[70vh] w-full">
                {!pdfFrameReady ? (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg bg-white text-slate-500">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-700" aria-hidden />
                    <p className="text-sm">Loading first pages…</p>
                  </div>
                ) : null}
                <iframe
                  src={`${pdfSrc}#toolbar=1&navpanes=0`}
                  title={filename}
                  className="h-full min-h-[70vh] w-full rounded-lg bg-white"
                  onLoad={() => setPdfFrameReady(true)}
                />
              </div>
            ) : (
              <p className="text-sm text-red-600">
                {pdfError || "Could not open this PDF."}
              </p>
            )
          ) : isVideo ? (
            resolvedBlob ? (
              <MinimalVideoPlayer blob={resolvedBlob} title={filename} />
            ) : loadingFile ? (
              <VideoLoadingState />
            ) : (
              <p className="text-sm text-red-600">
                {loadError || "Preview not available for this file type."}
              </p>
            )
          ) : (
            <p className="text-sm text-slate-500">
              Preview not available for this file type.
            </p>
          )}
        </div>
      </div>
    </div>
  );

  if (!mounted || typeof document === "undefined") return null;
  return createPortal(dialog, document.body);
}
