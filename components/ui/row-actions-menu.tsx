"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/Button";

export type RowActionItem = {
  id: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
};

type MenuCoords = { top: number; left?: number; right?: number };

/**
 * Compact “three dots” menu for table row actions. Closes on outside click.
 * Menu is portaled to document.body so it is not clipped by overflow on tables/cards.
 */
export function RowActionsMenu({
  items,
  align = "right",
  "aria-label": ariaLabel = "Row actions",
}: {
  items: RowActionItem[];
  align?: "left" | "right";
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [coords, setCoords] = useState<MenuCoords | null>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setCoords(null);
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    const gap = 4;
    if (align === "right") {
      setCoords({
        top: rect.bottom + gap,
        right: document.documentElement.clientWidth - rect.right,
      });
    } else {
      setCoords({
        top: rect.bottom + gap,
        left: rect.left,
      });
    }
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onReposition = () => setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [open]);

  const menu =
    open && coords && typeof document !== "undefined"
      ? createPortal(
          <ul
            ref={menuRef}
            role="menu"
            className="fixed z-[1000] min-w-[11rem] rounded-xl border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black/5"
            style={{
              top: coords.top,
              ...(coords.right !== undefined ? { right: coords.right } : {}),
              ...(coords.left !== undefined ? { left: coords.left } : {}),
            }}
          >
            {items.map((item, i) => {
              const isFirstDanger = Boolean(
                item.danger && !items.slice(0, i).some((x) => x.danger),
              );
              return (
                <li key={item.id} role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className={`flex w-full items-center px-3 py-2 text-left text-sm transition-colors ${
                      isFirstDanger ? "mt-1 border-t border-slate-100 pt-1 " : ""
                    } ${
                      item.danger
                        ? "text-red-600 hover:bg-red-50"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                    onClick={() => {
                      item.onClick();
                      setOpen(false);
                    }}
                  >
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body,
        )
      : null;

  return (
    <>
      <div
        className={`relative inline-flex ${align === "right" ? "justify-end" : "justify-start"}`}
        ref={triggerRef}
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 shrink-0 p-0 text-slate-500 hover:text-slate-900"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((v) => !v)}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>
      {menu}
    </>
  );
}
