"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/Select";
import { fetchReceptionistLocations, receptionistLocationsQueryKey } from "@/components/ai-receptionist/locations";
import { StatusPill } from "@/components/ai-receptionist/ui";
import {
  KNOWLEDGE_CATEGORIES,
  importKnowledge,
  previewKnowledgeImport,
  type KnowledgeImportPreview,
  type KnowledgeImportRequest,
  type KnowledgeImportResult,
} from "@/lib/queries/receptionist";

function scopeLabel(scope: string) {
  if (scope === "global") return "Global";
  if (scope === "branch") return "Branch";
  return "Missing";
}

function requestBody(
  file: { filename: string; text: string },
  locationId: string,
  category: string,
  scope: "global" | "branch",
): KnowledgeImportRequest {
  return {
    filename: file.filename,
    text: file.text,
    category,
    scope,
    ...(locationId ? { locationId } : {}),
  };
}

export function KnowledgeImportControl({ onImported }: { onImported: () => void }) {
  const [file, setFile] = useState<{ filename: string; text: string } | null>(null);
  const [locationId, setLocationId] = useState("");
  const [category, setCategory] = useState<(typeof KNOWLEDGE_CATEGORIES)[number]>(KNOWLEDGE_CATEGORIES[0]);
  const [scope, setScope] = useState<"global" | "branch">("global");
  const [fileError, setFileError] = useState("");
  const [result, setResult] = useState<KnowledgeImportResult | null>(null);
  const locations = useQuery({ queryKey: receptionistLocationsQueryKey, queryFn: fetchReceptionistLocations });
  const preview = useQuery({
    queryKey: ["ai-receptionist", "knowledge-import-preview", file?.filename, file?.text, locationId, category, scope],
    queryFn: () => previewKnowledgeImport(requestBody(file!, locationId, category, scope)),
    enabled: Boolean(file),
    placeholderData: (previous, previousQuery) => (previousQuery?.queryKey[3] === file?.text ? previous : undefined),
  });

  const importer = useMutation({
    mutationFn: () => importKnowledge(requestBody(file!, locationId, category, scope)),
    onSuccess: (data) => {
      setFile(null);
      setResult(data);
      onImported();
    },
  });

  async function onFile(next: File) {
    setFileError("");
    setResult(null);
    if (!/\.(txt|md)$/i.test(next.name)) {
      setFileError("Only .txt and .md files can be imported.");
      return;
    }
    const text = await next.text();
    if (!text.trim()) {
      setFileError("That file is empty.");
      return;
    }
    if (text.length > 200000) {
      setFileError("That file is too large to import.");
      return;
    }
    setFile({ filename: next.name, text });
  }

  const data = preview.data;
  const canImport = Boolean(file && data && data.valid > 0 && !preview.isFetching && !importer.isPending);

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <label className="inline-flex cursor-pointer items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
          Import .txt or .md
          <input
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            className="sr-only"
            onChange={(event) => {
              const next = event.target.files?.[0];
              if (next) void onFile(next);
              event.target.value = "";
            }}
          />
        </label>
        {fileError ? <p className="text-sm text-red-600">{fileError}</p> : null}
      </div>
      <Modal
        open={Boolean(file)}
        size="xl"
        title="Import preview"
        description={file ? file.filename : undefined}
        onClose={() => {
          if (!importer.isPending) setFile(null);
        }}
      >
        {file ? (
          <div className="space-y-4">
            <Select label="Branch for branch-scoped entries" value={locationId} onChange={(event) => setLocationId(event.target.value)}>
              <option value="">Select a branch</option>
              {(locations.data ?? []).map((location) => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </Select>
            <p className="text-sm leading-6 text-slate-500">
              {data?.kind === "legacy"
                ? "This file has no category or scope on each entry. Choose them here. Blocks that start with “Q:” or “Question:” become separate entries."
                : "Entries keep a category written in the file when it matches. Every other entry uses the category selected here. Scope still comes from the file."}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Category" value={category} onChange={(event) => setCategory(event.target.value as (typeof KNOWLEDGE_CATEGORIES)[number])}>
                {KNOWLEDGE_CATEGORIES.map((item) => <option key={item}>{item}</option>)}
              </Select>
              {data?.kind === "legacy" ? (
                <Select label="Scope" value={scope} onChange={(event) => setScope(event.target.value as "global" | "branch")}>
                  <option value="global">Global</option>
                  <option value="branch">Branch</option>
                </Select>
              ) : null}
            </div>
            {preview.isLoading ? <p className="text-sm text-slate-500">Checking entries…</p> : null}
            {preview.isError ? <p className="text-sm text-red-600">{(preview.error as Error).message}</p> : null}
            {importer.isError ? <p className="text-sm text-red-600">{(importer.error as Error).message}</p> : null}
            {data ? <PreviewBody data={data} /> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" disabled={importer.isPending} onClick={() => setFile(null)}>Cancel</Button>
              <Button type="button" disabled={!canImport} onClick={() => importer.mutate()}>
                {importer.isPending ? "Importing…" : `Import ${data?.valid ?? 0} entries`}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
      <Modal open={Boolean(result)} size="lg" title="Import results" description="Each saved row is its own knowledge entry." onClose={() => setResult(null)}>
        {result ? <ResultBody result={result} onClose={() => setResult(null)} /> : null}
      </Modal>
    </>
  );
}

function PreviewBody({ data }: { data: KnowledgeImportPreview }) {
  const groups = data.byCategory.length
    ? data.byCategory
    : [{ category: "Entries", total: data.total, valid: data.valid }];
  return (
    <div className="space-y-4">
      {data.parseError ? <p className="text-sm text-red-600">{data.parseError}</p> : null}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Detected" value={data.total} />
        <Stat label="Valid" value={data.valid} />
        <Stat label="Invalid" value={data.invalid} />
        <Stat label="Duplicates" value={data.duplicates} />
      </div>
      <div className="max-h-[28rem] space-y-4 overflow-y-auto pr-1">
        {groups.map((group) => {
          const entries = data.entries.filter((entry) => (entry.category || "Uncategorized") === group.category);
          return (
            <section key={group.category} className="rounded-xl border border-slate-200">
              <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <h3 className="text-sm font-medium text-slate-900">{group.category}</h3>
                <span className="text-xs text-slate-500">{group.valid} valid / {group.total}</span>
              </header>
              <ul className="divide-y divide-slate-100">
                {entries.map((entry) => (
                  <li key={entry.index} className="space-y-1 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-slate-900">{entry.title || "Untitled entry"}</p>
                      <StatusPill tone={entry.scope ? "neutral" : "warning"}>{scopeLabel(entry.scope)}</StatusPill>
                      {entry.duplicate ? <StatusPill tone="warning">Duplicate</StatusPill> : null}
                      {entry.valid ? <StatusPill tone="positive">Ready</StatusPill> : null}
                    </div>
                    {entry.body ? <p className="line-clamp-2 text-sm leading-6 text-slate-600">{entry.body}</p> : null}
                    {entry.errors.length ? <p className="text-sm text-red-600">{entry.errors.join(" ")}</p> : null}
                    {entry.duplicate ? (
                      <p className="text-sm text-amber-800">
                        {entry.duplicateOf === "file"
                          ? "This title is repeated in the file. Only the first copy can be imported."
                          : "An entry with this title already exists for this scope. It will not be imported again."}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ResultBody({ result, onClose }: { result: KnowledgeImportResult; onClose: () => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Created" value={result.created} />
        <Stat label="Skipped" value={result.skipped.length} />
        <Stat label="Duplicates" value={result.duplicates.length} />
        <Stat label="Failed" value={result.failed.length} />
      </div>
      <div className="max-h-80 space-y-4 overflow-y-auto pr-1 text-sm">
        <ResultList title="Imported" rows={result.entries.map((entry) => entry.title)} empty="No entries were created." />
        <ResultList
          title="Skipped"
          rows={result.skipped.map((entry) => `${entry.title || "Untitled entry"}: ${entry.errors.join(" ")}`)}
          empty="No entries were skipped."
        />
        <ResultList
          title="Duplicates"
          rows={result.duplicates.map((entry) => `${entry.title}: ${entry.reason}`)}
          empty="No duplicates."
        />
        <ResultList
          title="Failed"
          rows={result.failed.map((entry) => `${entry.title || "Untitled entry"}: ${entry.error}`)}
          empty="No entries failed while saving."
        />
      </div>
      <div className="flex justify-end">
        <Button type="button" onClick={onClose}>Done</Button>
      </div>
    </div>
  );
}

function ResultList({ title, rows, empty }: { title: string; rows: string[]; empty: string }) {
  return (
    <section>
      <h3 className="font-medium text-slate-900">{title}</h3>
      {rows.length === 0 ? <p className="mt-1 text-slate-500">{empty}</p> : (
        <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-700">
          {rows.map((row, index) => <li key={`${title}-${index}`}>{row}</li>)}
        </ul>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}
