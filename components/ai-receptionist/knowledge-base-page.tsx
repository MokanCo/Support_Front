"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
import { KnowledgeImportControl } from "@/components/ai-receptionist/knowledge-import";
import { fetchReceptionistLocations, receptionistLocationsQueryKey } from "@/components/ai-receptionist/locations";
import { EmptyRow, FilterField, PageIntro, StageNotice, fieldClass } from "@/components/ai-receptionist/ui";
import {
  KNOWLEDGE_CATEGORIES,
  deleteKnowledge,
  fetchKnowledge,
  saveKnowledge,
  type KnowledgeEntry,
} from "@/lib/queries/receptionist";

type Draft = {
  title: string;
  body: string;
  category: (typeof KNOWLEDGE_CATEGORIES)[number];
  scope: "global" | "branch";
  locationId: string;
};

const empty: Draft = { title: "", body: "", category: KNOWLEDGE_CATEGORIES[0], scope: "global", locationId: "" };

export function KnowledgeBasePage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [scope, setScope] = useState("all");
  const [editing, setEditing] = useState<Draft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const locations = useQuery({ queryKey: receptionistLocationsQueryKey, queryFn: fetchReceptionistLocations });
  const list = useQuery({
    queryKey: ["ai-receptionist", "knowledge", { page, search, category, scope }],
    queryFn: () => fetchKnowledge({ page, search, category, scope }),
  });

  useEffect(() => { setPage(1); }, [search, category, scope]);

  const save = useMutation({
    mutationFn: () =>
      saveKnowledge(editingId, {
        title: editing?.title,
        body: editing?.body,
        category: editing?.category,
        scope: editing?.scope,
        locationId: editing?.scope === "branch" ? editing.locationId : null,
      }),
    onSuccess: async () => {
      setEditing(null);
      setEditingId(null);
      setError("");
      await queryClient.invalidateQueries({ queryKey: ["ai-receptionist", "knowledge"] });
    },
    onError: (reason: Error) => setError(reason.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteKnowledge(id),
    onSuccess: async () => {
      setRemoveId(null);
      await queryClient.invalidateQueries({ queryKey: ["ai-receptionist", "knowledge"] });
    },
  });

  function openEdit(entry?: KnowledgeEntry) {
    setError("");
    setEditingId(entry?.id ?? null);
    setEditing(entry ? {
      title: entry.title,
      body: entry.body,
      category: entry.category as Draft["category"],
      scope: entry.scope,
      locationId: entry.locationId ?? "",
    } : { ...empty });
  }

  const rows = list.data?.entries ?? [];

  return (
    <div>
      <PageIntro
        title="Knowledge Base"
        description="Approved answers for the receptionist. A branch entry is used ahead of a global entry for that branch. Prices and hours are repeated only when they are written in an entry."
      />
      <StageNotice>
        If an entry does not contain the answer, the receptionist says it cannot confirm the information and offers a transfer.
      </StageNotice>
      <Card className="overflow-hidden">
        <CardHeader
          title="Entries"
          action={
            <div className="flex gap-2">
              <KnowledgeImportControl onImported={() => { void queryClient.invalidateQueries({ queryKey: ["ai-receptionist", "knowledge"] }); }} />
              <Button onClick={() => openEdit()}>Add entry</Button>
            </div>
          }
        />
        <CardBody className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <FilterField label="Search">
              <input value={search} onChange={(event) => setSearch(event.target.value)} className={fieldClass} placeholder="Question or answer" />
            </FilterField>
            <FilterField label="Category">
              <select value={category} onChange={(event) => setCategory(event.target.value)} className={fieldClass}>
                <option value="all">All categories</option>
                {KNOWLEDGE_CATEGORIES.map((item) => <option key={item}>{item}</option>)}
              </select>
            </FilterField>
            <FilterField label="Scope">
              <select value={scope} onChange={(event) => setScope(event.target.value)} className={fieldClass}>
                <option value="all">Global and branch</option>
                <option value="global">Global</option>
                <option value="branch">Branch-specific</option>
              </select>
            </FilterField>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {list.isLoading ? <p className="text-sm text-slate-500">Loading entries…</p> : null}
          {list.isError ? <p className="text-sm text-red-600">{(list.error as Error).message}</p> : null}
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  {["Title", "Category", "Scope", "Updated", "Actions"].map((column) => (
                    <th key={column} className="px-4 py-3 font-medium">{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <EmptyRow colSpan={5} message="No approved entries match these filters." />
                ) : rows.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-900">{entry.title}</td>
                    <td className="px-4 py-3">{entry.category}</td>
                    <td className="px-4 py-3">{entry.scope === "branch" ? entry.branchName || "Branch" : "Global"}</td>
                    <td className="px-4 py-3">{entry.updatedAt ? new Date(entry.updatedAt).toLocaleString() : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => openEdit(entry)}>Edit</Button>
                        <Button size="sm" variant="ghost" onClick={() => setRemoveId(entry.id)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2 text-sm">
            <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
            <span className="px-2 py-1.5">{page} / {list.data?.totalPages ?? 1}</span>
            <Button size="sm" variant="secondary" disabled={page >= (list.data?.totalPages ?? 1)} onClick={() => setPage((current) => current + 1)}>Next</Button>
          </div>
        </CardBody>
      </Card>
      <Modal open={Boolean(editing)} size="lg" title={editingId ? "Edit entry" : "Add entry"} description="Only this approved text can be used in an answer." onClose={() => setEditing(null)}>
        {editing ? (
          <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
            <Input label="Title" value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} />
            <Textarea label="Approved answer" rows={5} value={editing.body} onChange={(event) => setEditing({ ...editing, body: event.target.value })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Category" value={editing.category} onChange={(event) => setEditing({ ...editing, category: event.target.value as Draft["category"] })}>
                {KNOWLEDGE_CATEGORIES.map((item) => <option key={item}>{item}</option>)}
              </Select>
              <Select label="Scope" value={editing.scope} onChange={(event) => setEditing({ ...editing, scope: event.target.value as "global" | "branch" })}>
                <option value="global">Global</option>
                <option value="branch">Branch-specific</option>
              </Select>
            </div>
            {editing.scope === "branch" ? (
              <Select label="Branch" value={editing.locationId} onChange={(event) => setEditing({ ...editing, locationId: event.target.value })}>
                <option value="">Select a branch</option>
                {(locations.data ?? []).map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
              </Select>
            ) : null}
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save entry"}</Button>
            </div>
          </form>
        ) : null}
      </Modal>
      <ConfirmModal open={Boolean(removeId)} title="Delete entry" message="The receptionist will no longer be able to use this answer." confirmLabel="Delete" onClose={() => setRemoveId(null)} onConfirm={() => { if (removeId) remove.mutate(removeId); }} />
    </div>
  );
}
