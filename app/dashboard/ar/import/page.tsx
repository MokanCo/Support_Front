"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  CheckCircle2,
  FileSpreadsheet,
  Upload,
} from "lucide-react";
import { DataTable, type Column } from "@/components/ar/ui/data-table";
import { Panel, PanelBody, PanelHeader } from "@/components/ar/ui/panel";
import {
  Chip,
  EmptyState,
  InlineSpinner,
} from "@/components/ar/ui/primitives";
import { useArToast } from "@/components/ar/ui/toast";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { count, humanize, toNumber } from "@/lib/ar/format";
import { canManageAr } from "@/lib/permissions";
import {
  createArImport,
  downloadImportTemplate,
  executeArImport,
  validateArImport,
} from "@/lib/queries/ar";
import { useSession } from "@/lib/session-context";

const IMPORT_TYPES = ["products", "invoices", "payments", "billing_profiles"];

type ErrorRow = Record<string, unknown>;

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function extractImportId(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  if (typeof obj.id === "string") return obj.id;
  const nested = obj.import ?? obj.job;
  if (nested && typeof nested === "object" && typeof (nested as { id?: string }).id === "string") {
    return (nested as { id: string }).id;
  }
  return null;
}

function extractErrorRows(result: Record<string, unknown> | null): ErrorRow[] {
  if (!result) return [];
  const raw = result.errorRows;
  if (!Array.isArray(raw)) return [];
  return raw.filter((r): r is ErrorRow => r != null && typeof r === "object");
}

const STEPS = [
  { id: 1, label: "Upload" },
  { id: 2, label: "Validate" },
  { id: 3, label: "Import" },
] as const;

export default function ArImportPage() {
  const { user } = useSession();
  const manage = canManageAr(user.role);
  const toast = useArToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importType, setImportType] = useState("products");
  const [fileName, setFileName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [importId, setImportId] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [executeResult, setExecuteResult] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState(1);

  const createMutation = useMutation({
    mutationFn: () =>
      createArImport({
        importType,
        csvText,
        fileName: fileName || undefined,
      }),
    onSuccess: (data) => {
      const id = extractImportId(data);
      setImportId(id);
      setValidationResult(null);
      setExecuteResult(null);
      setStep(2);
      toast.success("Import job created", id ? `Job ${id}` : undefined);
    },
    onError: (e: Error) => toast.error("Could not create import", e.message),
  });

  const validateMutation = useMutation({
    mutationFn: () => validateArImport(importId!),
    onSuccess: (data) => {
      setValidationResult(data as Record<string, unknown>);
      toast.success("Validation complete");
    },
    onError: (e: Error) => toast.error("Validation failed", e.message),
  });

  const executeMutation = useMutation({
    mutationFn: () => executeArImport(importId!),
    onSuccess: (data) => {
      setExecuteResult(data as Record<string, unknown>);
      setStep(3);
      toast.success("Import executed");
    },
    onError: (e: Error) => toast.error("Import failed", e.message),
  });

  async function loadFile(file: File) {
    setFileName(file.name);
    const text = await file.text();
    setCsvText(text);
    setImportId(null);
    setValidationResult(null);
    setExecuteResult(null);
    setStep(1);
    toast.success("File loaded", file.name);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await loadFile(file);
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      toast.error("Please drop a CSV file");
      return;
    }
    await loadFile(file);
  }

  async function handleDownloadTemplate(type: string) {
    try {
      const blob = await downloadImportTemplate(type);
      downloadBlob(blob, `${type}-template.csv`);
      toast.success("Template downloaded", `${type}-template.csv`);
    } catch (e) {
      toast.error("Template download failed", (e as Error).message);
    }
  }

  const errorRows = useMemo(() => {
    return extractErrorRows(validationResult).map((row, index) => ({
      ...row,
      __rowKey: String(row.id ?? `err-${index}`),
    }));
  }, [validationResult]);

  const errorColumns = useMemo<Column<ErrorRow>[]>(
    () => [
      {
        id: "row",
        header: "Row",
        accessor: (r) =>
          toNumber(r.row ?? r.rowNumber ?? r.line ?? r.index) ||
          String(r.row ?? r.rowNumber ?? "—"),
        cell: (r) => String(r.row ?? r.rowNumber ?? r.line ?? r.index ?? "—"),
      },
      {
        id: "field",
        header: "Field",
        accessor: (r) => String(r.field ?? r.column ?? r.key ?? ""),
        cell: (r) => String(r.field ?? r.column ?? r.key ?? "—"),
      },
      {
        id: "message",
        header: "Message",
        accessor: (r) =>
          String(r.message ?? r.error ?? r.reason ?? r.details ?? ""),
        cell: (r) => (
          <span className="text-rose-700">
            {String(r.message ?? r.error ?? r.reason ?? r.details ?? "—")}
          </span>
        ),
      },
      {
        id: "value",
        header: "Value",
        accessor: (r) => String(r.value ?? r.raw ?? ""),
        defaultHidden: true,
        cell: (r) => (
          <span className="font-mono text-xs text-slate-500">
            {r.value != null || r.raw != null
              ? String(r.value ?? r.raw)
              : "—"}
          </span>
        ),
      },
    ],
    [],
  );

  if (!manage) {
    return (
      <EmptyState
        title="Admin access required"
        description="Only administrators can import AR data."
      />
    );
  }

  const validCount = toNumber(
    validationResult?.validRows ??
      validationResult?.validCount ??
      validationResult?.valid,
  );
  const errorCount = toNumber(
    validationResult?.errorCount ??
      validationResult?.invalidRows ??
      errorRows.length,
  );
  const importedCount = toNumber(
    executeResult?.imported ??
      executeResult?.importedCount ??
      executeResult?.successCount ??
      executeResult?.created,
  );

  return (
    <div className="space-y-5">
      {/* stepper */}
      <Panel padded={false}>
        <div className="flex items-center gap-2 overflow-x-auto px-5 py-4 sm:px-6">
          {STEPS.map((s, i) => {
            const active = step === s.id;
            const done = step > s.id;
            const clickable =
              (s.id === 1) ||
              (s.id === 2 && Boolean(importId)) ||
              (s.id === 3 && Boolean(executeResult));
            return (
              <div key={s.id} className="flex min-w-0 flex-1 items-center gap-2">
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => clickable && setStep(s.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                    active
                      ? "bg-slate-900 text-white shadow-sm"
                      : done
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-slate-50 text-slate-500"
                  } ${clickable ? "cursor-pointer" : "cursor-default"}`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      active
                        ? "bg-white/20 text-white"
                        : done
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-white text-slate-400 ring-1 ring-slate-200"
                    }`}
                  >
                    {done && !active ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      s.id
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11px] font-medium uppercase tracking-wide opacity-70">
                      Step {s.id}
                    </span>
                    <span className="block truncate text-sm font-semibold">
                      {s.label}
                    </span>
                  </span>
                </button>
                {i < STEPS.length - 1 ? (
                  <div
                    className={`hidden h-px w-6 shrink-0 sm:block ${
                      step > s.id ? "bg-emerald-300" : "bg-slate-200"
                    }`}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </Panel>

      {/* step 1 — upload */}
      {step === 1 ? (
        <Panel padded={false}>
          <PanelHeader
            title="Upload CSV"
            description="Choose an import type and drop your file"
          />
          <PanelBody className="space-y-5">
            <Select
              label="Import type"
              value={importType}
              onChange={(e) => {
                setImportType(e.target.value);
                setImportId(null);
                setValidationResult(null);
                setExecuteResult(null);
              }}
            >
              {IMPORT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {humanize(t)}
                </option>
              ))}
            </Select>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">
                Download a template
              </p>
              <div className="flex flex-wrap gap-2">
                {IMPORT_TYPES.map((t) => (
                  <Button
                    key={t}
                    size="sm"
                    variant="secondary"
                    onClick={() => handleDownloadTemplate(t)}
                  >
                    <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                    {humanize(t)}
                  </Button>
                ))}
              </div>
            </div>

            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragging(false);
              }}
              onDrop={handleDrop}
              className={`flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
                dragging
                  ? "border-sky-400 bg-sky-50/80 ring-4 ring-sky-100"
                  : "border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span
                className={`flex h-14 w-14 items-center justify-center rounded-2xl transition ${
                  dragging
                    ? "bg-sky-100 text-sky-700"
                    : "bg-white text-slate-400 ring-1 ring-slate-200"
                }`}
              >
                <Upload className="h-6 w-6" />
              </span>
              <p className="mt-4 text-sm font-semibold text-slate-900">
                {dragging ? "Drop to upload" : "Drag and drop your CSV here"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                or click to browse from your computer
              </p>
              {fileName ? (
                <p className="mt-4 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                  {fileName} · {count(csvText.length)} chars
                </p>
              ) : null}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              {importId ? (
                <p className="text-sm text-slate-600">
                  Import ID:{" "}
                  <span className="font-mono text-slate-900">{importId}</span>
                </p>
              ) : (
                <span />
              )}
              <Button
                disabled={!csvText.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? (
                  <InlineSpinner label="Uploading…" />
                ) : (
                  "Create import"
                )}
              </Button>
            </div>
          </PanelBody>
        </Panel>
      ) : null}

      {/* step 2 — validate */}
      {step === 2 ? (
        <Panel padded={false}>
          <PanelHeader
            title="Validate"
            description={
              importId
                ? `Review the import job before executing · ${importId}`
                : "Create an import job first"
            }
            action={
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  size="sm"
                  disabled={!importId || validateMutation.isPending}
                  onClick={() => validateMutation.mutate()}
                >
                  {validateMutation.isPending ? "Validating…" : "Run validation"}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!importId || executeMutation.isPending}
                  onClick={() => executeMutation.mutate()}
                >
                  {executeMutation.isPending ? "Importing…" : "Execute import"}
                </Button>
              </div>
            }
          />
          <PanelBody className="space-y-4">
            {!importId ? (
              <EmptyState
                compact
                title="No import job yet"
                description="Upload a CSV and create an import job to continue."
                action={
                  <Button size="sm" onClick={() => setStep(1)}>
                    Go to upload
                  </Button>
                }
              />
            ) : !validationResult ? (
              <EmptyState
                compact
                icon={FileSpreadsheet}
                title="Ready to validate"
                description="Run validation to check for row-level errors before importing."
              />
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-3.5">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                      Valid rows
                    </p>
                    <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-700">
                      {count(validCount)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3.5">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                      Error rows
                    </p>
                    <p className="mt-1 text-lg font-semibold tabular-nums text-rose-700">
                      {count(errorCount)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3.5">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                      Status
                    </p>
                    <div className="mt-1.5">
                      <Chip tone={errorCount > 0 ? "pending" : "positive"}>
                        {errorCount > 0 ? "Issues found" : "Ready to import"}
                      </Chip>
                    </div>
                  </div>
                </div>

                {errorRows.length > 0 ? (
                  <div className="-mx-5 border-t border-slate-100 sm:-mx-6">
                    <DataTable
                      columns={errorColumns}
                      rows={errorRows}
                      getRowId={(r) => String(r.__rowKey)}
                      searchPlaceholder="Search errors…"
                      emptyTitle="No error rows"
                      pageSize={10}
                      dense
                    />
                  </div>
                ) : (
                  <p className="text-sm text-emerald-700">
                    All rows passed validation.
                  </p>
                )}
              </>
            )}
          </PanelBody>
        </Panel>
      ) : null}

      {/* step 3 — import result */}
      {step === 3 ? (
        <Panel padded={false}>
          <PanelHeader
            title="Import complete"
            description="Summary of the executed import job"
            action={
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setImportId(null);
                  setValidationResult(null);
                  setExecuteResult(null);
                  setCsvText("");
                  setFileName("");
                  setStep(1);
                }}
              >
                Start another import
              </Button>
            }
          />
          <PanelBody>
            {executeResult ? (
              <div className="flex flex-col items-center text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/80">
                  <CheckCircle2 className="h-7 w-7" />
                </span>
                <p className="mt-4 text-base font-semibold text-slate-900">
                  Import finished successfully
                </p>
                <p className="mt-1 max-w-md text-sm text-slate-500">
                  {importId ? (
                    <>
                      Job <span className="font-mono">{importId}</span> for{" "}
                      {humanize(importType)} has been applied.
                    </>
                  ) : (
                    "Your CSV data has been applied."
                  )}
                </p>
                <dl className="mt-6 grid w-full max-w-lg gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-3.5 text-left">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                      Records imported
                    </dt>
                    <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                      {importedCount > 0 ? count(importedCount) : "—"}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3.5 text-left">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                      Import type
                    </dt>
                    <dd className="mt-1 text-lg font-semibold text-slate-900">
                      {humanize(importType)}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : (
              <EmptyState
                compact
                title="Nothing imported yet"
                description="Execute an import from the validate step to see results here."
                action={
                  <Button size="sm" onClick={() => setStep(2)}>
                    Go to validate
                  </Button>
                }
              />
            )}
          </PanelBody>
        </Panel>
      ) : null}
    </div>
  );
}
