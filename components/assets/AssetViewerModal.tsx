"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface Props {
  fileUrl: string;
  mimeType: string;
  filename: string;
  onClose: () => void;
  onDownload?: () => void | Promise<void>;
}

export function AssetViewerModal({
  fileUrl,
  mimeType,
  filename,
  onClose,
  onDownload,
}: Props) {
  const isImage = mimeType.startsWith("image/");
  const isPdf = mimeType === "application/pdf";
  const [downloading, setDownloading] = useState(false);

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

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl"
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
            {onDownload && (
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
            )}
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

        <div className="flex flex-1 items-center justify-center overflow-auto bg-slate-100 p-4">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fileUrl}
              alt={filename}
              className="max-h-full max-w-full object-contain"
            />
          ) : isPdf ? (
            <iframe
              src={fileUrl}
              title={filename}
              className="h-full w-full rounded-lg bg-white"
            />
          ) : (
            <p className="text-sm text-slate-500">
              Preview not available for this file type.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
