"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageIntro, StageNotice, StatusPill } from "@/components/ai-receptionist/ui";
import {
  fetchRecording,
  fetchRecordingAudio,
  fetchRecordings,
  formatDuration,
  formatWhen,
} from "@/lib/queries/receptionist";

export function RecordingsPage() {
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioError, setAudioError] = useState("");
  const list = useQuery({
    queryKey: ["ai-receptionist", "recordings", page],
    queryFn: () => fetchRecordings({ page }),
  });
  const detail = useQuery({
    queryKey: ["ai-receptionist", "recording", selectedId],
    queryFn: () => fetchRecording(selectedId as string),
    enabled: Boolean(selectedId),
  });

  useEffect(() => {
    if (!selectedId) return;
    let url = "";
    let cancelled = false;
    setAudioError("");
    fetchRecordingAudio(selectedId)
      .then((next) => {
        if (cancelled) URL.revokeObjectURL(next);
        else {
          url = next;
          setAudioUrl(next);
        }
      })
      .catch((reason: Error) => {
        if (!cancelled) setAudioError(reason.message);
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
      setAudioUrl("");
    };
  }, [selectedId]);

  const call = detail.data?.call;

  return (
    <div>
      <PageIntro
        title="Recordings & Transcripts"
        description="Playback stays inside the portal for administrators. Audio is requested with your sign-in and is not a public link."
      />
      <StageNotice>
        Recording stays off until it is enabled in System Settings. A recording is kept only after the caller hears the disclosure, and it is removed when the retention period ends.
      </StageNotice>
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Policy title="Disclosure" body="The greeting includes the disclosure before a recording starts." />
        <Policy title="Access" body="Only an administrator with a valid portal token can open the audio." />
        <Policy title="Retention" body="Transcripts and audio are cleared after the configured number of days. Call totals remain for reporting." />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <Card>
          <CardHeader title="Recordings" action={<StatusPill>Private</StatusPill>} />
          <CardBody className="space-y-2">
            {list.isLoading ? <p className="text-sm text-slate-500">Loading recordings…</p> : null}
            {list.isError ? <p className="text-sm text-red-600">{(list.error as Error).message}</p> : null}
            {(list.data?.calls ?? []).length === 0 && !list.isLoading ? (
              <p className="text-sm text-slate-500">No recordings are stored.</p>
            ) : (list.data?.calls ?? []).map((row) => (
              <button key={row.id} type="button" onClick={() => setSelectedId(row.id)} className={`block w-full rounded-xl px-3 py-2 text-left text-sm ${selectedId === row.id ? "bg-primary-50" : "hover:bg-slate-50"}`}>
                <span className="font-medium text-slate-900">{row.from || "Unknown caller"}</span>
                <span className="mt-1 block text-xs text-slate-500">{row.branchName || "Unassigned"} · {formatWhen(row.startedAt)}</span>
              </button>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Transcript" description={call ? `${call.branchName || "Call"} · ${formatDuration(call.durationSeconds)}` : "Select a recording."} />
          <CardBody className="space-y-4">
            {audioError ? <p className="text-sm text-red-600">{audioError}</p> : null}
            {audioUrl ? <audio controls src={audioUrl} className="w-full" /> : <p className="text-sm text-slate-500">No audio loaded.</p>}
            {call ? (
              <>
                <p className="text-sm text-slate-600">Outcome: {call.outcome}. Transfer: {call.transferStatus}. Disclosure: {call.recordingDisclosed ? "played" : "not played"}.</p>
                <p className="text-sm text-slate-700">{call.summary || "No summary was stored."}</p>
                <div className="space-y-2 text-sm">
                  {(call.turns ?? []).map((turn, index) => (
                    <p key={`${turn.at}-${index}`}><span className="font-medium capitalize">{turn.speaker}: </span>{turn.text}</p>
                  ))}
                </div>
              </>
            ) : null}
          </CardBody>
        </Card>
      </div>
      <div className="mt-4 flex justify-end gap-2 text-sm text-slate-500">
        <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-lg px-3 py-1.5 disabled:opacity-40">Previous</button>
        <span className="py-1.5">{page} / {list.data?.totalPages ?? 1}</span>
        <button type="button" disabled={page >= (list.data?.totalPages ?? 1)} onClick={() => setPage((current) => current + 1)} className="rounded-lg px-3 py-1.5 disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}

function Policy({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <CardHeader title={title} />
      <CardBody><p className="text-sm leading-6 text-slate-600">{body}</p></CardBody>
    </Card>
  );
}
