"use client";

import { useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import type { ArInvoiceBlock } from "@/lib/queries/ar";
import { TemplatePreview } from "@/components/ar/templates/preview";

function newBlockId() {
  return Math.random().toString(16).slice(2, 14);
}

export function cloneBlocks(blocks: ArInvoiceBlock[]): ArInvoiceBlock[] {
  return blocks.map((b) => ({ ...b, id: newBlockId() }));
}

export type TemplateBlockEditorProps = {
  blocks: ArInvoiceBlock[];
  onChange: (blocks: ArInvoiceBlock[]) => void;
  blockTypes: { type: string; label: string }[];
  /** When true, hide mutation controls (drag still works for inspection). */
  readOnly?: boolean;
  showPreview?: boolean;
};

/**
 * Drag-to-reorder block canvas with enable/disable, alignment, font size,
 * custom-text, and palette add — extracted from the old playground.
 */
export function TemplateBlockEditor({
  blocks,
  onChange,
  blockTypes,
  readOnly = false,
  showPreview = true,
}: TemplateBlockEditorProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function addBlock(type: string, label: string) {
    if (readOnly) return;
    onChange([
      ...blocks,
      {
        id: newBlockId(),
        type,
        enabled: true,
        label,
        content: type === "custom_text" ? "Custom message" : "",
        align: "left",
        fontSize: 10,
      },
    ]);
  }

  function updateBlock(id: string, patch: Partial<ArInvoiceBlock>) {
    if (readOnly) return;
    onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function removeBlock(id: string) {
    if (readOnly) return;
    onChange(blocks.filter((b) => b.id !== id));
  }

  function onDrop(targetIndex: number) {
    if (readOnly || dragIndex == null || dragIndex === targetIndex) return;
    const next = [...blocks];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    onChange(next);
    setDragIndex(null);
  }

  return (
    <div
      className={`grid gap-4 ${
        showPreview
          ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)_minmax(0,1fr)]"
          : "lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)]"
      }`}
    >
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Layout (drag to reorder)
        </p>
        <ul className="space-y-2">
          {blocks.map((block, index) => (
            <li
              key={block.id}
              draggable={!readOnly}
              onDragStart={() => !readOnly && setDragIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(index)}
              className={`rounded-xl border bg-white p-3 shadow-sm ${
                block.enabled ? "border-slate-200" : "border-slate-100 opacity-60"
              }`}
            >
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  className="mt-1 cursor-grab text-slate-400 active:cursor-grabbing"
                  aria-label="Drag"
                  disabled={readOnly}
                >
                  <GripVertical className="h-4 w-4" />
                </button>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-slate-800">
                      {block.label || block.type}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase text-slate-500">
                      {block.type.replace(/_/g, " ")}
                    </span>
                    <label className="ml-auto flex items-center gap-1.5 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={block.enabled}
                        disabled={readOnly}
                        onChange={(e) =>
                          updateBlock(block.id, { enabled: e.target.checked })
                        }
                      />
                      Show
                    </label>
                    {!readOnly ? (
                      <button
                        type="button"
                        className="text-slate-400 hover:text-red-600"
                        onClick={() => removeBlock(block.id)}
                        aria-label="Remove block"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                  {block.type === "custom_text" ? (
                    <Textarea
                      label="Custom text"
                      hideLabel
                      value={block.content || ""}
                      disabled={readOnly}
                      onChange={(e) =>
                        updateBlock(block.id, { content: e.target.value })
                      }
                      className="min-h-[72px]"
                    />
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Select
                      label="Align"
                      value={block.align || "left"}
                      disabled={readOnly}
                      onChange={(e) =>
                        updateBlock(block.id, {
                          align: e.target.value as ArInvoiceBlock["align"],
                        })
                      }
                      className="w-28"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </Select>
                    <Input
                      label="Size"
                      type="number"
                      min={8}
                      max={24}
                      disabled={readOnly}
                      value={String(block.fontSize || 10)}
                      onChange={(e) =>
                        updateBlock(block.id, {
                          fontSize: Number(e.target.value) || 10,
                        })
                      }
                      className="w-24"
                    />
                  </div>
                </div>
              </div>
            </li>
          ))}
          {blocks.length === 0 ? (
            <li className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
              Add blocks from the palette to build this template.
            </li>
          ) : null}
        </ul>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Add blocks
        </p>
        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
          {blockTypes.map((bt) => (
            <button
              key={bt.type}
              type="button"
              disabled={readOnly}
              onClick={() => addBlock(bt.type, bt.label)}
              className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50"
            >
              <Plus className="h-4 w-4 text-slate-400" />
              {bt.label}
            </button>
          ))}
          {blockTypes.length === 0 ? (
            <p className="px-1 py-2 text-xs text-slate-400">Palette unavailable.</p>
          ) : null}
        </div>
      </div>

      {showPreview ? <TemplatePreview blocks={blocks} /> : null}
    </div>
  );
}
