"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { PageIntro, StageNotice, StatusPill } from "@/components/ai-receptionist/ui";
import {
  fetchAudit,
  fetchHealth,
  fetchSettings,
  formatWhen,
  saveSettings,
  type ReceptionistSettings,
} from "@/lib/queries/receptionist";

export function SystemSettingsPage() {
  const queryClient = useQueryClient();
  const health = useQuery({ queryKey: ["ai-receptionist", "health"], queryFn: fetchHealth });
  const settings = useQuery({ queryKey: ["ai-receptionist", "settings"], queryFn: fetchSettings });
  const audit = useQuery({ queryKey: ["ai-receptionist", "audit"], queryFn: fetchAudit });
  const [form, setForm] = useState<ReceptionistSettings | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (settings.data) setForm(settings.data);
  }, [settings.data]);

  const save = useMutation({
    mutationFn: () => saveSettings(form as ReceptionistSettings),
    onSuccess: async (next) => {
      setForm(next);
      setError("");
      await queryClient.invalidateQueries({ queryKey: ["ai-receptionist", "settings"] });
      await queryClient.invalidateQueries({ queryKey: ["ai-receptionist", "health"] });
      await queryClient.invalidateQueries({ queryKey: ["ai-receptionist", "audit"] });
    },
    onError: (reason: Error) => setError(reason.message),
  });

  return (
    <div>
      <PageIntro
        title="System Settings"
        description="Recording, retention, and notification preferences. Provider keys stay in the server environment and are never shown or saved here."
      />
      <StageNotice>
        Carrier routing is not changed from this page. Bandwidth and OpenAI are ready only when their environment variables are present on the API server.
      </StageNotice>
      <div className="grid gap-4 md:grid-cols-2">
        <StatusCard title="Telephony" value={health.data?.telephony.configured ? "Credentials present" : "Not configured"} ok={Boolean(health.data?.telephony.configured)} body="Bandwidth webhooks use the server username and password. Numbers are assigned in the Bandwidth voice application, not from the portal." />
        <StatusCard title="OpenAI" value={health.data?.openai.configured ? "Credentials present" : "Not configured"} ok={Boolean(health.data?.openai.configured)} body={health.data?.openai.configured ? `Answers can be phrased with ${health.data.openai.model} and are checked against approved facts.` : "Without a key, the receptionist speaks the approved entry text directly."} />
        <StatusCard title="Call routing" value={health.data?.routingLive ? "Live" : "Not live"} ok={false} body="routingLive stays false. Point a number at the voice webhook only after approval." />
        <StatusCard title="Database" value={health.data?.database === "connected" ? "Connected" : "Unknown"} ok={health.data?.database === "connected"} body="Call records, knowledge, and settings use the existing MongoDB database." />
      </div>
      <Card className="mt-4">
        <CardHeader title="Recording and notifications" />
        <CardBody>
          {form ? (
            <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
              <label className="flex items-center gap-3 text-sm text-slate-700">
                <input type="checkbox" checked={form.recordingEnabled} onChange={(event) => setForm({ ...form, recordingEnabled: event.target.checked })} />
                Record calls after the disclosure is played
              </label>
              <Input label="Retention days" type="number" value={String(form.retentionDays)} onChange={(event) => setForm({ ...form, retentionDays: Number(event.target.value) })} />
              <Textarea label="Disclosure message" rows={2} value={form.disclosureMessage} onChange={(event) => setForm({ ...form, disclosureMessage: event.target.value })} />
              <Input label="Notification email" value={form.notifyEmail} onChange={(event) => setForm({ ...form, notifyEmail: event.target.value })} />
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <div className="flex justify-end">
                <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save settings"}</Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-slate-500">{settings.isError ? (settings.error as Error).message : "Loading settings…"}</p>
          )}
        </CardBody>
      </Card>
      <Card className="mt-4">
        <CardHeader title="Recent changes" description="Configuration audit. Secret values are not stored." />
        <CardBody>
          {(audit.data ?? []).length === 0 ? <p className="text-sm text-slate-500">No receptionist changes are recorded yet.</p> : (
            <ul className="divide-y divide-slate-100 text-sm">
              {(audit.data ?? []).map((event) => (
                <li key={event.id} className="flex justify-between gap-3 py-2">
                  <span>{event.action} {event.entityType}</span>
                  <span className="text-slate-500">{formatWhen(event.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function StatusCard({ title, value, ok, body }: { title: string; value: string; ok: boolean; body: string }) {
  return (
    <Card>
      <CardHeader title={title} action={<StatusPill tone={ok ? "positive" : "warning"}>{value}</StatusPill>} />
      <CardBody><p className="text-sm leading-6 text-slate-600">{body}</p></CardBody>
    </Card>
  );
}
