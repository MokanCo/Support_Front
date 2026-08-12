"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Copy,
  Download,
  Eye,
  Loader2,
  MoreHorizontal,
  Send,
  XCircle,
} from "lucide-react";

type Props = {
  canManage: boolean;
  /** True while an action for THIS row is in flight — shows a spinner on the
   *  trigger so the user has feedback even after the dropdown menu closes. */
  busy?: boolean;
  onView: () => void;
  onSend: () => void;
  onApprove: () => void;
  onDuplicate: () => void;
  onDownload: () => void;
  onCancel: () => void;
};

export function InvoiceRowActions({
  canManage,
  busy,
  onView,
  onSend,
  onApprove,
  onDuplicate,
  onDownload,
  onCancel,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function run(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <div className="relative flex justify-end" ref={ref}>
      <button
        type="button"
        aria-label={busy ? "Processing…" : "Invoice actions"}
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MoreHorizontal className="h-4 w-4" />
        )}
      </button>
      {open ? (
        <div
          className="absolute right-0 z-40 mt-1 w-48 origin-top-right rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
          style={{ animation: "fadeIn 120ms ease-out both" }}
          onClick={(e) => e.stopPropagation()}
        >
          <MenuItem icon={Eye} label="View" onClick={() => run(onView)} />
          {canManage ? (
            <>
              <MenuItem icon={Send} label="Send" onClick={() => run(onSend)} />
              <MenuItem
                icon={CheckCircle2}
                label="Approve"
                onClick={() => run(onApprove)}
              />
              <MenuItem
                icon={Copy}
                label="Duplicate"
                onClick={() => run(onDuplicate)}
              />
            </>
          ) : null}
          <MenuItem
            icon={Download}
            label="Download PDF"
            onClick={() => run(onDownload)}
          />
          {canManage ? (
            <MenuItem
              icon={XCircle}
              label="Cancel"
              tone="danger"
              onClick={() => run(onCancel)}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  tone = "default",
}: {
  icon: typeof Eye;
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm transition ${
        tone === "danger"
          ? "text-rose-600 hover:bg-rose-50"
          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
      {label}
    </button>
  );
}
