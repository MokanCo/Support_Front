"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { SplitChart, VolumeChart } from "@/components/ai-receptionist/charts";
import { fetchReceptionistLocations, receptionistLocationsQueryKey } from "@/components/ai-receptionist/locations";
import { FilterField, PageIntro, StageNotice, fieldClass } from "@/components/ai-receptionist/ui";
import { exportAnalytics, fetchAnalytics, formatDuration } from "@/lib/queries/receptionist";

export function AnalyticsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [branchId, setBranchId] = useState("all");
  const [exportError, setExportError] = useState("");
  const locations = useQuery({ queryKey: receptionistLocationsQueryKey, queryFn: fetchReceptionistLocations });
  const report = useQuery({
    queryKey: ["ai-receptionist", "analytics", { from, to, branchId }],
    queryFn: () => fetchAnalytics({ from, to, locationId: branchId }),
  });
  const data = report.data;

  return (
    <div>
      <PageIntro title="Analytics" description="Rates and lists are calculated from stored calls. Peak hours use America/New_York." />
      <StageNotice>Export downloads the stored calls for this filter. It does not invent rows when the database is empty.</StageNotice>
      <Card className="mb-6">
        <CardBody className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <FilterField label="From"><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className={fieldClass} /></FilterField>
          <FilterField label="To"><input type="date" value={to} onChange={(event) => setTo(event.target.value)} className={fieldClass} /></FilterField>
          <FilterField label="Branch">
            <select value={branchId} onChange={(event) => setBranchId(event.target.value)} className={fieldClass}>
              <option value="all">All branches</option>
              {(locations.data ?? []).map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </select>
          </FilterField>
          <Button variant="secondary" onClick={() => {
            setExportError("");
            exportAnalytics({ from, to, locationId: branchId }).catch((reason: Error) => setExportError(reason.message));
          }}>Export</Button>
        </CardBody>
        {exportError ? <p className="px-6 pb-5 text-sm text-red-600">{exportError}</p> : null}
      </Card>
      {report.isLoading ? <p className="text-sm text-slate-500">Calculating from stored calls…</p> : null}
      {report.isError ? <p className="text-sm text-red-600">{(report.error as Error).message}</p> : null}
      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Total incoming calls" value={data.kpis.total} />
            <Stat label="AI answer rate" value={`${data.kpis.aiAnswerRate}%`} />
            <Stat label="Missed call rate" value={`${data.kpis.missedRate}%`} />
            <Stat label="Human transfer rate" value={`${data.kpis.transferRate}%`} />
            <Stat label="Average call duration" value={formatDuration(data.kpis.averageDurationSeconds)} />
            <Stat label="Resolved inquiry rate" value={`${data.kpis.resolvedRate}%`} />
            <Stat label="Unresolved inquiry rate" value={`${data.kpis.unresolvedRate}%`} />
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card><CardHeader title="Call volume" /><CardBody className="pt-0"><VolumeChart data={data.charts.volume} /></CardBody></Card>
            <Card><CardHeader title="Peak calling hours" /><CardBody className="pt-0"><SplitChart data={data.charts.hours.map((row) => ({ label: `${row.hour}:00`, total: row.total }))} /></CardBody></Card>
            <ListCard title="Most common questions" rows={data.questions} />
            <ListCard title="Common complaints" rows={data.complaints} />
            <Card className="lg:col-span-2">
              <CardHeader title="Branch performance" />
              <CardBody className="pt-0"><SplitChart data={data.charts.branches.map((row) => ({ label: row.branchName, total: row.total }))} /></CardBody>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function ListCard({ title, rows }: { title: string; rows: { text: string; total: number }[] }) {
  return (
    <Card>
      <CardHeader title={title} description="Grouped from stored caller transcripts" />
      <CardBody>
        {rows.length === 0 ? <p className="text-sm text-slate-500">No matching transcript text is stored.</p> : (
          <ul className="space-y-2 text-sm">
            {rows.map((row) => (
              <li key={row.text} className="flex justify-between gap-3"><span>{row.text}</span><span className="text-slate-500">{row.total}</span></li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
