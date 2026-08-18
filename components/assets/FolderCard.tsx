"use client";

import { useEffect, useRef, useState } from "react";
import { Folder, MoreVertical, Pencil, Trash2, FolderOpen } from "lucide-react";
import type { AssetFolder } from "@/lib/queries/assets";

interface Props {
  folder: AssetFolder;
  isAdmin: boolean;
  selected?: boolean;
  dropActive?: boolean;
  onOpen: () => void;
  onSelect?: () => void;
  onRename: () => void;
  onDelete: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

export function FolderCard({
  folder,
  isAdmin,
  selected = false,
  dropActive = false,
  onOpen,
  onSelect,
  onRename,
  onDelete,
  onDragOver,
  onDragLeave,
  onDrop,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  return (
    <div
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("[data-menu]")) return;
        if (onSelect) onSelect();
        else onOpen();
      }}
      onDoubleClick={(e) => {
        e.preventDefault();
        onOpen();
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-white transition ${
        dropActive
          ? "border-primary-500 bg-primary-50/40 ring-2 ring-primary-400/40"
          : selected
            ? "border-blue-500 ring-2 ring-blue-500/30 shadow-md"
            : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
      }`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen();
        if (e.key === " " && onSelect) {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-selected={selected}
    >
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-2.5 py-2">
        <Folder className="h-4 w-4 shrink-0 fill-amber-200 text-amber-600" />
        <span title={folder.name} className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
          {folder.name}
        </span>
        {isAdmin ? (
          <div className="relative shrink-0" ref={menuRef} data-menu>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200/80 hover:text-slate-800"
              aria-label="Folder actions"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-8 z-20 min-w-[148px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onOpen();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <FolderOpen className="h-4 w-4" /> Open
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onRename();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Pencil className="h-4 w-4" /> Rename
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onDelete();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="p-2">
        <div className="flex h-36 w-full items-center justify-center rounded-lg bg-slate-50">
          <Folder className="h-16 w-16 fill-amber-100 text-amber-500" strokeWidth={1.25} />
        </div>
      </div>
    </div>
  );
}
