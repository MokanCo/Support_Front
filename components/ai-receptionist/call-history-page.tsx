"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { fetchReceptionistLocations, receptionistLocationsQueryKey } from "@/components/ai-receptionist/locations";
import { DataTableShell, EmptyRow, FilterField, PageIntro, fieldClass } from "@/components/ai-receptionist/ui";
import {
  fetchCall,
  fetchCalls,
  formatDuration,
  formatWhen,
  updateCallResolution,
  type CallRow,
} from "@/lib/queries/receptionist";

const COLUMNS = ["Caller", "Branch", "Date and time", "Duration", "Outcome", "Handling", "Transfer", "Resolution"];

export function CallHistoryPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState("all");
  const [outcome, setOutcome] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const locations = useQuery({ queryKey: receptionistLocationsQueryKey, queryFn: fetchReceptionistLocations });
  const list = useQuery({
    queryKey: ["ai-receptionist", "calls", { page, search, branchId, outcome, from, to }],
    queryFn: () => fetchCalls({ page, search, locationId: branchId, outcome, from, to }),
  });
  const detail = useQuery({
    queryKey: ["ai-receptionist", "call", selectedId],
    queryFn: () => fetchCall(selectedId as string),
    enabled: Boolean(selectedId),
  });
  useEffect(() => { setPage(1); }, [search, branchId, outcome, from, to]);
  const resolve = useMutation({
    mutationFn: (status: string) => updateCallResolution(selectedId as string, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ai-receptionist", "calls"] });
      await queryClient.invalidateQueries({ queryKey: ["ai-receptionist", "call", selectedId] });
    },
  });
  const rows = list.data?.calls ?? [];

  return (
    <div>
      <PageIntro title="Call History" description="Stored calls only. Filters query the receptionist call records." />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.8fr)]">
        <Card className="overflow-hidden">
          <CardHeader title="Calls" description={list.data ? `${list.data.total} stored` : "Stored calls"} />
          <CardBody className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <FilterField label="Search"><input value={search} onChange={(event) => setSearch(event.target.value)} className={fieldClass} placeholder="Caller number" /></FilterField>
              <FilterField label="From"><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className={fieldClass} /></FilterField>
              <FilterField label="To"><input type="date" value={to} onChange={(event) => setTo(event.target.value)} className={fieldClass} /></FilterField>
              <FilterField label="Branch">
                <select value={branchId} onChange={(event) => setBranchId(event.target.value)} className={fieldClass}>
                  <option value="all">All branches</option>
                  {(locations.data ?? []).map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                </select>
              </FilterField>
              <FilterField label="Outcome">
                <select value={outcome} onChange={(event) => setOutcome(event.target.value)} className={fieldClass}>
                  {["all", "answered", "transferred", "missed", "unresolved", "in_progress"].map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </FilterField>
            </div>
            {list.isError ? <p className="text-sm text-red-600">{(list.error as Error).message}</p> : null}
            <DataTableShell columns={COLUMNS}>
              {list.isLoading ? <EmptyRow colSpan={8} message="Loading calls…" /> : rows.length === 0 ? <EmptyRow colSpan={8} message="No stored calls match these filters." /> : rows.map((row) => (
                <tr key={row.id} onClick={() => setSelectedId(row.id)} className={`cursor-pointer border-b border-slate-100 ${selectedId === row.id ? "bg-primary-50" : "hover:bg-slate-50"}`}>
                  <td className="px-4 py-3">{row.from || "—"}</td>
                  <td className="px-4 py-3">{row.branchName || "—"}</td>
                  <td className="px-4 py-3">{formatWhen(row.startedAt)}</td>
                  <td className="px-4 py-3">{formatDuration(row.durationSeconds)}</td>
                  <td className="px-4 py-3">{row.outcome}</td>
                  <td className="px-4 py-3">{row.handling}</td>
                  <td className="px-4 py-3">{row.transferStatus}</td>
                  <td className="px-4 py-3">{row.resolutionStatus}</td>
                </tr>
              ))}
            </DataTableShell>
            <div className="flex justify-end gap-2 text-sm">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
              <span className="px-2 py-1.5">{page} / {list.data?.totalPages ?? 1}</span>
              <Button size="sm" variant="secondary" disabled={page >= (list.data?.totalPages ?? 1)} onClick={() => setPage((current) => current + 1)}>Next</Button>
            </div>
          </CardBody>
        </Card>
        <CallDetail call={detail.data} loading={detail.isLoading} onResolve={(status) => resolve.mutate(status)} />
      </div>
    </div>
  );
}

function CallDetail({ call, loading, onResolve }: { call?: CallRow; loading: boolean; onResolve: (status: string) => void }) {
  return (
    <Card>
      <CardHeader title="Call detail" description={call ? formatWhen(call.startedAt) : "Select a stored call."} />
      <CardBody className="space-y-3 text-sm text-slate-600">
        {loading ? <p>Loading call…</p> : null}
        {!call && !loading ? <p>No call is selected.</p> : null}
        {call ? (
          <>
            <p>Caller: {call.from || "—"}</p>
            <p>Branch: {call.branchName || "—"}</p>
            <p>Duration: {formatDuration(call.durationSeconds)}</p>
            <p>Outcome: {call.outcome}</p>
            <p>Transfer: {call.transferStatus}</p>
            <p>Summary: {call.summary || "No summary was stored."}</p>
            <Select label="Resolution" value={call.resolutionStatus} onChange={(event) => onResolve(event.target.value)}>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="unresolved">Unresolved</option>
            </Select>
            <div className="space-y-2">
              {(call.turns ?? []).length === 0 ? <p>No transcript was stored.</p> : (call.turns ?? []).map((turn, index) => (
                <p key={`${turn.at}-${index}`}><span className="font-medium capitalize text-slate-800">{turn.speaker}: </span>{turn.text}</p>
              ))}
            </div>
          </>
        ) : null}
      </CardBody>
    </Card>
  );
}
