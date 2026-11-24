"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { SplitChart, VolumeChart } from "@/components/ai-receptionist/charts";
import {
  DataTableShell,
  EmptyRow,
  PageIntro,
  StageNotice,
  StatusPill,
} from "@/components/ai-receptionist/ui";
import { fetchOverview, formatDuration, formatWhen } from "@/lib/queries/receptionist";

const COLUMNS = ["Caller number", "Branch", "Date and time", "Duration", "Handling", "Outcome", "Transfer", "Resolution"];

export function OverviewPage() {
  const query = useQuery({
    queryKey: ["ai-receptionist", "overview"],
    queryFn: () => fetchOverview({}),
  });
  const data = query.data;
  const kpis = data?.kpis;

  return (
    <div>
      <PageIntro
        title="Overview"
        description="Performance calculated from stored receptionist calls. These figures stay at zero until a call is recorded."
      />
      <StageNotice>
        Live carrier routing is off. Calls appear here only after a branch number is pointed at the receptionist webhook.
      </StageNotice>
      {query.isLoading ? <p className="text-sm text-slate-500">Loading call metrics…</p> : null}
      {query.isError ? <p className="text-sm text-red-600">{(query.error as Error).message}</p> : null}
      {data ? (
        <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-card">
            <div>
              <p className="text-sm font-medium text-slate-900">AI service status</p>
              <p className="mt-1 text-sm text-slate-500">
                Telephony {data.service.telephony.configured ? "credentials are set" : "is not configured"}.
                OpenAI {data.service.openai.configured ? "is set" : "is not set"}. Routing is not live.
              </p>
            </div>
            <StatusPill tone={data.service.telephony.webhooksReady ? "positive" : "warning"}>
              {data.service.telephony.webhooksReady ? "Webhooks ready" : "Not connected"}
            </StatusPill>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Metric label="Total incoming calls" value={kpis?.total ?? 0} />
            <Metric label="Answered by AI" value={kpis?.answeredByAi ?? 0} />
            <Metric label="Transferred to employees" value={kpis?.transferred ?? 0} />
            <Metric label="Missed calls" value={kpis?.missed ?? 0} />
            <Metric label="Average call duration" value={formatDuration(kpis?.averageDurationSeconds ?? 0)} />
            <Metric label="Unresolved inquiries" value={kpis?.unresolved ?? 0} />
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Call volume" description="Stored calls by day, America/New_York" />
              <CardBody className="pt-0"><VolumeChart data={data.charts.volume} /></CardBody>
            </Card>
            <Card>
              <CardHeader title="AI and human handling" description="From the handling stored on each call" />
              <CardBody className="pt-0">
                <SplitChart
                  data={[
                    { label: "AI", total: kpis?.answeredByAi ?? 0 },
                    { label: "Transferred", total: kpis?.transferred ?? 0 },
                    { label: "Missed", total: kpis?.missed ?? 0 },
                  ]}
                />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Branch performance" description="Stored calls by branch" />
              <CardBody className="pt-0">
                <SplitChart data={data.charts.branches.map((row) => ({ label: row.branchName, total: row.total }))} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Call outcomes" description="Stored outcomes" />
              <CardBody className="pt-0">
                <SplitChart data={data.charts.outcomes.map((row) => ({ label: row.outcome, total: row.total }))} />
              </CardBody>
            </Card>
          </div>
          <Card className="mt-6 overflow-hidden">
            <CardHeader title="Recent calls" description="Latest stored calls" />
            <CardBody className="px-0 py-0">
              <DataTableShell columns={COLUMNS}>
                {data.recentCalls.length === 0 ? (
                  <EmptyRow colSpan={COLUMNS.length} message="No calls have been stored." />
                ) : (
                  data.recentCalls.map((call) => (
                    <tr key={call.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3">{call.from || "—"}</td>
                      <td className="px-4 py-3">{call.branchName || "—"}</td>
                      <td className="px-4 py-3">{formatWhen(call.startedAt)}</td>
                      <td className="px-4 py-3">{formatDuration(call.durationSeconds)}</td>
                      <td className="px-4 py-3">{call.handling}</td>
                      <td className="px-4 py-3">{call.outcome}</td>
                      <td className="px-4 py-3">{call.transferStatus}</td>
                      <td className="px-4 py-3">{call.resolutionStatus}</td>
                    </tr>
                  ))
                )}
              </DataTableShell>
            </CardBody>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{value}</div>
    </div>
  );
}
