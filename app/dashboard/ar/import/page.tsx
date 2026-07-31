"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useSession } from "@/lib/session-context";
import { canManageAr } from "@/lib/permissions";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import {
  createArImport,
  downloadImportTemplate,
  executeArImport,
  validateArImport,
} from "@/lib/queries/ar";

const IMPORT_TYPES = ["products", "invoices", "payments", "billing_profiles"];

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ArImportPage() {
  const { user } = useSession();
  const manage = canManageAr(user.role);
  const [importType, setImportType] = useState("products");
  const [fileName, setFileName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [importId, setImportId] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<Record<string, unknown> | null>(null);
  const [executeResult, setExecuteResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      createArImport({
        importType,
        csvText,
        fileName: fileName || undefined,
      }),
    onSuccess: (data) => {
      const id = (data as { id?: string }).id;
      setImportId(id ?? null);
      setValidationResult(null);
      setExecuteResult(null);
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const validateMutation = useMutation({
    mutationFn: () => validateArImport(importId!),
    onSuccess: (data) => {
      setValidationResult(data as Record<string, unknown>);
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const executeMutation = useMutation({
    mutationFn: () => executeArImport(importId!),
    onSuccess: (data) => {
      setExecuteResult(data as Record<string, unknown>);
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    setCsvText(text);
    setImportId(null);
    setValidationResult(null);
    setExecuteResult(null);
  }

  async function handleDownloadTemplate(type: string) {
    try {
      const blob = await downloadImportTemplate(type);
      downloadBlob(blob, `${type}-template.csv`);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!manage) {
    return <p className="text-sm text-slate-500">Admin access required.</p>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Import data"
          description="Upload CSV files to bulk-import AR records"
        />
        <CardBody className="space-y-4">
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
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </Select>

          <div className="flex flex-wrap gap-2">
            {IMPORT_TYPES.map((t) => (
              <Button key={t} size="sm" variant="secondary" onClick={() => handleDownloadTemplate(t)}>
                {t.replace(/_/g, " ")} template
              </Button>
            ))}
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">CSV file</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700"
            />
          </label>

          {fileName ? (
            <p className="text-sm text-slate-500">
              Selected: {fileName} ({csvText.length.toLocaleString()} chars)
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!csvText.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? "Uploading…" : "Create import"}
            </Button>
            <Button
              variant="secondary"
              disabled={!importId || validateMutation.isPending}
              onClick={() => validateMutation.mutate()}
            >
              {validateMutation.isPending ? "Validating…" : "Validate"}
            </Button>
            <Button
              variant="secondary"
              disabled={!importId || executeMutation.isPending}
              onClick={() => executeMutation.mutate()}
            >
              {executeMutation.isPending ? "Executing…" : "Execute"}
            </Button>
          </div>

          {importId ? (
            <p className="text-sm text-slate-600">
              Import ID: <span className="font-mono">{importId}</span>
            </p>
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          {validationResult ? (
            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-700">Validation result</h3>
              <pre className="max-h-64 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-800">
                {JSON.stringify(validationResult, null, 2)}
              </pre>
            </div>
          ) : null}

          {executeResult ? (
            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-700">Execute result</h3>
              <pre className="max-h-64 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-800">
                {JSON.stringify(executeResult, null, 2)}
              </pre>
            </div>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
