"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface Props {
  fileUrl: string;
  mimeType: string;
  filename: string;
  onClose: () => void;
}

export function AssetViewerModal({ fileUrl, mimeType, filename, onClose }: Props) {
  const isImage = mimeType.startsWith("image/");
  const isPdf = mimeType === "application/pdf";

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200" title={filename}>
            {filename}
          </p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center overflow-auto bg-slate-100 p-4 dark:bg-slate-900">
          {isImage ? (
            <img src={fileUrl} alt={filename} className="max-h-full max-w-full object-contain" />
          ) : isPdf ? (
            <iframe src={fileUrl} title={filename} className="h-full w-full rounded-lg bg-white" />
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Preview not available for this file type.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
