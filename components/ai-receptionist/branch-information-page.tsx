"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { FilterField, PageIntro, StageNotice, StatusPill, fieldClass } from "@/components/ai-receptionist/ui";
import { fetchBranches, saveBranchProfile, type BranchProfile } from "@/lib/queries/receptionist";

export function BranchInformationPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<BranchProfile | null>(null);
  const [error, setError] = useState("");
  const query = useQuery({
    queryKey: ["ai-receptionist", "branches", search],
    queryFn: () => fetchBranches(search),
  });
  const selected = query.data?.find((branch) => branch.locationId === selectedId) ?? null;

  useEffect(() => {
    setDraft(selected);
  }, [selected]);

  const save = useMutation({
    mutationFn: () => saveBranchProfile(draft!.locationId, {
      openingHours: draft!.openingHours,
      holidayHours: draft!.holidayHours,
      services: draft!.services,
      policies: draft!.policies,
      faqs: draft!.faqs,
    }),
    onSuccess: async (branch) => {
      setDraft(branch);
      setError("");
      await queryClient.invalidateQueries({ queryKey: ["ai-receptionist", "branches"] });
    },
    onError: (reason: Error) => setError(reason.message),
  });

  return (
    <div>
      <PageIntro
        title="Branch Information"
        description="Name, address, and phone stay on the existing location record. Hours, services, policies, and FAQs are saved here for the receptionist."
      />
      <StageNotice>This page does not create a second branch. Use Locations to change the public address or phone number.</StageNotice>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card className="overflow-hidden">
          <CardHeader title="Branches" />
          <CardBody className="space-y-4">
            <FilterField label="Search">
              <input value={search} onChange={(event) => setSearch(event.target.value)} className={fieldClass} placeholder="Name, phone, or address" />
            </FilterField>
            {query.isLoading ? <p className="text-sm text-slate-500">Loading branches…</p> : null}
            {query.isError ? <p className="text-sm text-red-600">{(query.error as Error).message}</p> : null}
            <ul className="divide-y divide-slate-100">
              {(query.data ?? []).map((branch) => (
                <li key={branch.locationId}>
                  <button type="button" onClick={() => setSelectedId(branch.locationId)} className={`flex w-full items-start justify-between gap-3 px-2 py-3 text-left ${selectedId === branch.locationId ? "bg-primary-50" : "hover:bg-slate-50"}`}>
                    <span>
                      <span className="block text-sm font-medium text-slate-900">{branch.name}</span>
                      <span className="mt-1 block text-xs text-slate-500">{branch.address || "—"}</span>
                    </span>
                    {branch.isDisabled ? <StatusPill tone="warning">Disabled</StatusPill> : null}
                  </button>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={draft?.name ?? "Branch detail"} description={draft ? "Receptionist details for this location." : "Select a branch."} />
          <CardBody>
            {draft ? (
              <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
                <p className="text-sm text-slate-600">Contact number: {draft.phone || "—"}</p>
                <p className="text-sm text-slate-600">Email: {draft.email || "—"}</p>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-slate-700">Timezone</span>
                  <input value={draft.openingHours.timezone} onChange={(event) => setDraft({ ...draft, openingHours: { ...draft.openingHours, timezone: event.target.value } })} className={fieldClass} />
                </label>
                <div className="space-y-2">
                  {draft.openingHours.schedule.map((row) => (
                    <div key={row.day} className="grid grid-cols-[4rem_1fr_1fr] gap-2">
                      <span className="pt-2 text-xs uppercase text-slate-500">{row.day}</span>
                      <input type="time" value={row.open} aria-label={`${row.day} open`} onChange={(event) => setDraft({ ...draft, openingHours: { ...draft.openingHours, schedule: draft.openingHours.schedule.map((item) => item.day === row.day ? { ...item, open: event.target.value, closed: false } : item) } })} className={fieldClass} />
                      <input type="time" value={row.close} aria-label={`${row.day} close`} onChange={(event) => setDraft({ ...draft, openingHours: { ...draft.openingHours, schedule: draft.openingHours.schedule.map((item) => item.day === row.day ? { ...item, close: event.target.value, closed: false } : item) } })} className={fieldClass} />
                    </div>
                  ))}
                </div>
                <Textarea label="Holiday hours" rows={2} value={draft.holidayHours} onChange={(event) => setDraft({ ...draft, holidayHours: event.target.value })} />
                <Textarea label="Available services" rows={3} value={draft.services} onChange={(event) => setDraft({ ...draft, services: event.target.value })} />
                <Textarea label="Branch policies" rows={3} value={draft.policies} onChange={(event) => setDraft({ ...draft, policies: event.target.value })} />
                <Textarea label="Branch FAQs" rows={3} value={draft.faqs} onChange={(event) => setDraft({ ...draft, faqs: event.target.value })} />
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
                <div className="flex items-center justify-between gap-3">
                  <Link href={`/dashboard/locations/view?id=${encodeURIComponent(draft.locationId)}`} className="text-sm font-medium text-primary-700 underline-offset-4 hover:underline">Open location record</Link>
                  <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save receptionist details"}</Button>
                </div>
              </form>
            ) : (
              <p className="text-sm text-slate-500">Choose a branch to edit the details the receptionist can use.</p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
