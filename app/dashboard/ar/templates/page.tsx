"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  Eye,
  FileStack,
  LayoutTemplate,
  Loader2,
  Pencil,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { useSession } from "@/lib/session-context";
import { canManageAr } from "@/lib/permissions";
import { shortDate } from "@/lib/ar/format";
import { CARD } from "@/lib/ar/theme";
import {
  createArInvoiceTemplate,
  deleteArInvoiceTemplate,
  fetchArInvoiceTemplatePalette,
  fetchArInvoiceTemplates,
  updateArInvoiceTemplate,
  type ArInvoiceBlock,
  type ArInvoiceTemplate,
} from "@/lib/queries/ar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/modal";
import { Panel, PanelBody, PanelHeader } from "@/components/ar/ui/panel";
import {
  Chip,
  EmptyState,
  ErrorState,
  InlineSpinner,
  SkeletonRows,
} from "@/components/ar/ui/primitives";
import { useArToast } from "@/components/ar/ui/toast";
import {
  TemplateBlockEditor,
  cloneBlocks,
} from "@/components/ar/templates/block-editor";
import { TemplatePreview } from "@/components/ar/templates/preview";
import { TemplateThumbnail } from "@/components/ar/templates/thumbnail";

type EditorMode = "create" | "edit";

type EditorState = {
  mode: EditorMode;
  id: string | null;
  name: string;
  description: string;
  blocks: ArInvoiceBlock[];
};

function blankEditor(paletteBlocks: ArInvoiceBlock[]): EditorState {
  return {
    mode: "create",
    id: null,
    name: "New template",
    description: "",
    blocks: cloneBlocks(paletteBlocks),
  };
}

function editorFromTemplate(tpl: ArInvoiceTemplate): EditorState {
  return {
    mode: "edit",
    id: tpl.id,
    name: tpl.name,
    description: tpl.description || "",
    blocks: tpl.blocks.map((b) => ({ ...b })),
  };
}

export default function ArTemplatesPage() {
  const { user } = useSession();
  const manage = canManageAr(user.role);
  const toast = useArToast();
  const queryClient = useQueryClient();

  const [previewId, setPreviewId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const templatesQuery = useQuery({
    queryKey: ["ar", "invoice-templates"],
    queryFn: fetchArInvoiceTemplates,
  });

  const paletteQuery = useQuery({
    queryKey: ["ar", "invoice-templates", "palette"],
    queryFn: fetchArInvoiceTemplatePalette,
  });

  const templates = templatesQuery.data ?? [];
  const blockTypes = paletteQuery.data?.blockTypes ?? [];
  const paletteBlocks = paletteQuery.data?.blocks ?? [];

  const previewTemplate = useMemo(
    () => templates.find((t) => t.id === previewId) ?? null,
    [templates, previewId],
  );

  const deleteTarget = useMemo(
    () => templates.find((t) => t.id === deleteId) ?? null,
    [templates, deleteId],
  );

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["ar", "invoice-templates"] });

  const saveMutation = useMutation({
    mutationFn: async (state: EditorState) => {
      if (!state.name.trim()) throw new Error("Template name is required");
      if (state.mode === "edit" && state.id) {
        return {
          mode: state.mode as EditorMode,
          template: await updateArInvoiceTemplate(state.id, {
            name: state.name.trim(),
            description: state.description.trim(),
            blocks: state.blocks,
          }),
        };
      }
      return {
        mode: state.mode as EditorMode,
        template: await createArInvoiceTemplate({
          name: state.name.trim(),
          description: state.description.trim(),
          blocks: state.blocks,
        }),
      };
    },
    onSuccess: ({ mode, template }) => {
      invalidate();
      setEditor(null);
      toast.success(
        mode === "edit" ? "Template updated" : "Template created",
        template.name,
      );
    },
    onError: (e: Error) => toast.error("Could not save template", e.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (tpl: ArInvoiceTemplate) =>
      createArInvoiceTemplate({
        name: `${tpl.name} (copy)`,
        description: tpl.description,
        blocks: cloneBlocks(tpl.blocks),
      }),
    onSuccess: (tpl) => {
      invalidate();
      toast.success("Template duplicated", tpl.name);
    },
    onError: (e: Error) => toast.error("Could not duplicate", e.message),
  });

  const defaultMutation = useMutation({
    mutationFn: (id: string) => updateArInvoiceTemplate(id, { isDefault: true }),
    onSuccess: (tpl) => {
      invalidate();
      toast.success("Default template updated", tpl.name);
    },
    onError: (e: Error) => toast.error("Could not set default", e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteArInvoiceTemplate(id),
    onSuccess: () => {
      invalidate();
      setDeleteId(null);
      toast.success("Template deleted");
    },
    onError: (e: Error) => toast.error("Could not delete template", e.message),
  });

  function openCreate() {
    if (!manage) return;
    setEditor(blankEditor(paletteBlocks));
  }

  function openEdit(tpl: ArInvoiceTemplate) {
    if (!manage) return;
    setEditor(editorFromTemplate(tpl));
  }

  function requestDelete(tpl: ArInvoiceTemplate) {
    if (!manage) return;
    if (tpl.isDefault) {
      toast.error(
        "Cannot delete default template",
        "Set another template as default before deleting this one.",
      );
      return;
    }
    setDeleteId(tpl.id);
  }

  if (templatesQuery.error) {
    return (
      <ErrorState
        message={(templatesQuery.error as Error).message}
        onRetry={() => templatesQuery.refetch()}
      />
    );
  }

  return (
    <div className="space-y-5">
      <Panel padded={false}>
        <PanelHeader
          title="Template library"
          description="Design and manage invoice PDF layouts"
          icon={
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <LayoutTemplate className="h-[18px] w-[18px]" />
            </span>
          }
          action={
            manage ? (
              <Button size="sm" onClick={openCreate}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Create template
              </Button>
            ) : null
          }
        />
        <PanelBody>
          {templatesQuery.isLoading ? (
            <SkeletonRows rows={6} cols={3} />
          ) : templates.length === 0 && !manage ? (
            <EmptyState
              icon={FileStack}
              title="No templates yet"
              description="Ask an admin to create an invoice template."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {templates.map((tpl) => (
                <TemplateCard
                  key={tpl.id}
                  template={tpl}
                  manage={manage}
                  busy={
                    duplicateMutation.isPending ||
                    defaultMutation.isPending ||
                    deleteMutation.isPending
                  }
                  duplicating={
                    duplicateMutation.isPending &&
                    duplicateMutation.variables?.id === tpl.id
                  }
                  settingDefault={
                    defaultMutation.isPending && defaultMutation.variables === tpl.id
                  }
                  onPreview={() => setPreviewId(tpl.id)}
                  onEdit={() => openEdit(tpl)}
                  onDuplicate={() => duplicateMutation.mutate(tpl)}
                  onSetDefault={() => defaultMutation.mutate(tpl.id)}
                  onDelete={() => requestDelete(tpl)}
                />
              ))}

              {manage ? (
                <button
                  type="button"
                  onClick={openCreate}
                  className={`${CARD} group flex min-h-[260px] flex-col items-center justify-center gap-3 border-dashed border-slate-300 bg-slate-50/40 p-6 text-center transition hover:border-slate-400 hover:bg-slate-50`}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-slate-400 transition group-hover:border-slate-400 group-hover:text-slate-600">
                    <Plus className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Create new</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Start from the default block palette
                    </p>
                  </div>
                </button>
              ) : null}
            </div>
          )}
        </PanelBody>
      </Panel>

      {/* Preview modal */}
      <Modal
        open={Boolean(previewTemplate)}
        onClose={() => setPreviewId(null)}
        title={previewTemplate?.name ?? "Preview"}
        description={previewTemplate?.description || "Live layout preview"}
        size="lg"
      >
        {previewTemplate ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              {previewTemplate.isDefault ? <Chip tone="pending">Default</Chip> : null}
              <span>
                {previewTemplate.blocks.filter((b) => b.enabled).length} blocks
              </span>
              <span>·</span>
              <span>Updated {shortDate(previewTemplate.updatedAt)}</span>
            </div>
            <TemplatePreview blocks={previewTemplate.blocks} />
            {manage ? (
              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setPreviewId(null);
                    openEdit(previewTemplate);
                  }}
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Edit
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      {/* Edit / create modal */}
      <Modal
        open={Boolean(editor)}
        onClose={() => !saveMutation.isPending && setEditor(null)}
        title={editor?.mode === "edit" ? "Edit template" : "Create template"}
        description="Reorder blocks, toggle visibility, and tune typography"
        size="2xl"
      >
        {editor ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Template name"
                value={editor.name}
                onChange={(e) =>
                  setEditor((s) => (s ? { ...s, name: e.target.value } : s))
                }
              />
              <Input
                label="Description"
                value={editor.description}
                onChange={(e) =>
                  setEditor((s) =>
                    s ? { ...s, description: e.target.value } : s,
                  )
                }
              />
            </div>

            {paletteQuery.isLoading ? (
              <InlineSpinner label="Loading block palette…" />
            ) : (
              <TemplateBlockEditor
                blocks={editor.blocks}
                onChange={(blocks) =>
                  setEditor((s) => (s ? { ...s, blocks } : s))
                }
                blockTypes={blockTypes}
              />
            )}

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              <Button
                variant="secondary"
                disabled={saveMutation.isPending}
                onClick={() => setEditor(null)}
              >
                Cancel
              </Button>
              <Button
                disabled={saveMutation.isPending}
                onClick={() => saveMutation.mutate(editor)}
              >
                {saveMutation.isPending
                  ? "Saving…"
                  : editor.mode === "edit"
                    ? "Save template"
                    : "Create template"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => !deleteMutation.isPending && setDeleteId(null)}
        title="Delete template"
        description={
          deleteTarget
            ? `Permanently remove “${deleteTarget.name}”? This cannot be undone.`
            : undefined
        }
        size="md"
      >
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            disabled={deleteMutation.isPending}
            onClick={() => setDeleteId(null)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={deleteMutation.isPending || !deleteTarget}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
          >
            {deleteMutation.isPending ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </Modal>

      {!manage ? (
        <p className="text-center text-xs text-slate-400">
          Viewing in read-only mode. Ask an admin to create or edit templates.
        </p>
      ) : null}
    </div>
  );
}

function TemplateCard({
  template,
  manage,
  busy,
  duplicating = false,
  settingDefault = false,
  onPreview,
  onEdit,
  onDuplicate,
  onSetDefault,
  onDelete,
}: {
  template: ArInvoiceTemplate;
  manage: boolean;
  busy: boolean;
  duplicating?: boolean;
  settingDefault?: boolean;
  onPreview: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onSetDefault: () => void;
  onDelete: () => void;
}) {
  const enabledCount = template.blocks.filter((b) => b.enabled).length;

  return (
    <article
      className={`${CARD} flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]`}
    >
      <button type="button" onClick={onPreview} className="block w-full text-left">
        <div className="border-b border-slate-100 p-4 pb-3">
          <TemplateThumbnail blocks={template.blocks} />
        </div>
      </button>

      <div className="flex flex-1 flex-col gap-3 p-4 pt-3">
        <div className="min-w-0">
          <div className="flex items-start gap-2">
            <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">
              {template.name}
            </h3>
            {template.isDefault ? <Chip tone="pending">Default</Chip> : null}
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
            {template.description?.trim() || "No description"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
          <span className="tabular-nums">{enabledCount} blocks</span>
          <span aria-hidden>·</span>
          <span>Updated {shortDate(template.updatedAt)}</span>
        </div>

        <div className="mt-auto flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
          <Button size="sm" variant="secondary" onClick={onPreview}>
            <Eye className="mr-1 h-3.5 w-3.5" />
            Preview
          </Button>
          {manage ? (
            <>
              <Button size="sm" variant="secondary" onClick={onEdit} disabled={busy}>
                <Pencil className="mr-1 h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onDuplicate}
                disabled={busy}
                aria-label={duplicating ? "Duplicating…" : "Duplicate"}
              >
                {duplicating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
              {!template.isDefault ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onSetDefault}
                  disabled={busy}
                  aria-label={settingDefault ? "Setting as default…" : "Set as default"}
                >
                  {settingDefault ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Star className="h-3.5 w-3.5" />
                  )}
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="ghost"
                onClick={onDelete}
                disabled={busy}
                aria-label="Delete"
                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}
