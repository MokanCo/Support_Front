"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function Modal({
  open,
  title,
  description,
  titleNode,
  children,
  onClose,
  size = "md",
}: {
  open: boolean;
  title?: string;
  description?: ReactNode;
  titleNode?: ReactNode;
  children: React.ReactNode;
  onClose: () => void;
  size?: "md" | "lg" | "xl" | "2xl";
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !mounted || typeof document === "undefined") return null;

  const width =
    size === "2xl"
      ? "max-w-6xl"
      : size === "xl"
        ? "max-w-4xl"
        : size === "lg"
          ? "max-w-2xl"
          : "max-w-lg";

  return createPortal(
    <div
      className="fixed inset-0 z-[600] flex min-h-[100dvh] min-w-0 items-center justify-center overflow-y-auto overflow-x-hidden p-4 sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        className="fixed inset-0 min-h-[100dvh] w-screen bg-slate-900/55 backdrop-blur-sm transition-opacity"
        aria-label="Close modal"
        onClick={onClose}
      />
      <div
        className={`relative z-[1] my-auto w-full ${width} rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-start justify-between gap-4">
          {titleNode ? (
            <div id="modal-title" className="min-w-0 flex-1">
              {titleNode}
            </div>
          ) : (
            <div className="min-w-0 flex-1">
              <h2 id="modal-title" className="text-lg font-semibold tracking-tight text-slate-900">
                {title ?? ""}
              </h2>
              {description ? (
                <div className="mt-1 text-sm text-slate-500">{description}</div>
              ) : null}
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}
