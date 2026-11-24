"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { fetchReceptionistLocations, receptionistLocationsQueryKey } from "@/components/ai-receptionist/locations";
import { PageIntro, StageNotice } from "@/components/ai-receptionist/ui";
import {
  deleteAgentOverride,
  fetchAgentSettings,
  saveAgentSettings,
  type AgentSettings,
} from "@/lib/queries/receptionist";

const ORDER_REPLY =
  "I can help answer questions about our menu and services, but I cannot place orders over the phone at this time. I can connect you with our branch team for further assistance.";

export function AgentSettingsPage() {
  const queryClient = useQueryClient();
  const [scope, setScope] = useState("global");
  const [branchId, setBranchId] = useState("");
  const [form, setForm] = useState<AgentSettings | null>(null);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState("");
  const locations = useQuery({ queryKey: receptionistLocationsQueryKey, queryFn: fetchReceptionistLocations });
  const locationId = scope === "branch" ? branchId : undefined;
  const settings = useQuery({
    queryKey: ["ai-receptionist", "agent", locationId ?? "global"],
    queryFn: () => fetchAgentSettings(locationId),
    enabled: scope === "global" || Boolean(branchId),
  });

  useEffect(() => {
    if (settings.data) setForm(settings.data);
  }, [settings.data]);

  const save = useMutation({
    mutationFn: () =>
      saveAgentSettings({
        ...(form as AgentSettings),
        locationId: scope === "branch" ? branchId : null,
      }),
    onSuccess: async (next) => {
      setForm(next);
      setError("");
      await queryClient.invalidateQueries({ queryKey: ["ai-receptionist", "agent"] });
    },
    onError: (reason: Error) => setError(reason.message),
  });
  const remove = useMutation({
    mutationFn: () => deleteAgentOverride(branchId),
    onSuccess: async () => {
      setError("");
      await queryClient.invalidateQueries({ queryKey: ["ai-receptionist", "agent"] });
    },
    onError: (reason: Error) => setError(reason.message),
  });

  function setField<K extends keyof AgentSettings>(key: K, value: AgentSettings[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  return (
    <div>
      <PageIntro
        title="AI Agent Settings"
        description="Global defaults and branch overrides for the receptionist. A branch override replaces the global settings for that branch."
      />
      <StageNotice>
        Saving these settings does not place a call. The line answers only when the branch number and these settings both have AI enabled, and only after the carrier points at the webhook.
      </StageNotice>
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Select label="Configuration scope" value={scope} onChange={(event) => setScope(event.target.value)}>
          <option value="global">Global default</option>
          <option value="branch">Branch override</option>
        </Select>
        <Select label="Branch" value={branchId} disabled={scope !== "branch"} onChange={(event) => setBranchId(event.target.value)}>
          <option value="">Select a branch</option>
          {(locations.data ?? []).map((location) => (
            <option key={location.id} value={location.id}>{location.name}</option>
          ))}
        </Select>
      </div>
      {settings.isLoading ? <p className="text-sm text-slate-500">Loading settings…</p> : null}
      {settings.isError ? <p className="mb-4 text-sm text-red-600">{(settings.error as Error).message}</p> : null}
      {form && (scope === "global" || branchId) ? (
        <>
          {form.inheritsGlobal ? (
            <p className="mb-4 text-sm text-slate-600">This branch is using the global default. Saving creates an override.</p>
          ) : null}
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader title="Voice and personality" />
              <CardBody className="space-y-4">
                <Input label="AI agent name" value={form.agentName} onChange={(event) => setField("agentName", event.target.value)} />
                <Select label="Voice" value={form.voice} onChange={(event) => setField("voice", event.target.value)}>
                  {["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse"].map((voice) => (
                    <option key={voice} value={voice}>{voice}</option>
                  ))}
                </Select>
                <Select label="Voice speed" value={form.voiceSpeed} onChange={(event) => setField("voiceSpeed", event.target.value)}>
                  <option value="slow">Slow</option>
                  <option value="natural">Natural</option>
                  <option value="brisk">Brisk</option>
                </Select>
                <Select label="Language" value={form.language} onChange={(event) => setField("language", event.target.value)}>
                  <option value="en">English</option>
                </Select>
                <Select label="Speaking style" value={form.speakingStyle} onChange={(event) => setField("speakingStyle", event.target.value)}>
                  <option value="clear">Clear</option>
                  <option value="warm">Warm</option>
                  <option value="concise">Concise</option>
                </Select>
                <Select label="Conversation tone" value={form.tone} onChange={(event) => setField("tone", event.target.value)}>
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="formal">Formal</option>
                </Select>
                <Textarea label="Greeting message" rows={3} value={form.greeting} onChange={(event) => setField("greeting", event.target.value)} />
                <label className="flex items-center gap-3 text-sm text-slate-700">
                  <input type="checkbox" checked={form.aiEnabled} onChange={(event) => setField("aiEnabled", event.target.checked)} />
                  AI enabled for this {scope === "branch" ? "branch" : "default"}
                </label>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Conversation settings" />
              <CardBody className="space-y-4">
                <Input label="Maximum call duration (seconds)" type="number" value={String(form.maxCallDurationSec)} onChange={(event) => setField("maxCallDurationSec", Number(event.target.value))} />
                <Input label="Silence timeout (seconds)" type="number" value={String(form.silenceTimeoutSec)} onChange={(event) => setField("silenceTimeoutSec", Number(event.target.value))} />
                <Textarea label="Repeat handling" rows={2} value={form.repeatHandling} onChange={(event) => setField("repeatHandling", event.target.value)} />
                <Textarea label="Interruption handling" rows={2} value={form.interruptionHandling} onChange={(event) => setField("interruptionHandling", event.target.value)} />
                <Textarea label="Unknown-question handling" rows={2} value={form.unknownQuestionHandling} onChange={(event) => setField("unknownQuestionHandling", event.target.value)} />
                <Textarea label="Escalation rules" rows={2} value={form.escalationRules} onChange={(event) => setField("escalationRules", event.target.value)} />
                <Textarea label="Complaint handling" rows={2} value={form.complaintHandling} onChange={(event) => setField("complaintHandling", event.target.value)} />
                <Textarea label="After-hours behavior" rows={2} value={form.afterHoursBehavior} onChange={(event) => setField("afterHoursBehavior", event.target.value)} />
              </CardBody>
            </Card>
          </div>
          <Card className="mt-4">
            <CardHeader title="Order requests" description="This reply is fixed. The receptionist cannot take an order." />
            <CardBody><p className="text-sm leading-6 text-slate-700">{ORDER_REPLY}</p></CardBody>
          </Card>
          {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            {scope === "branch" && branchId && !form.inheritsGlobal ? (
              <Button variant="ghost" onClick={() => remove.mutate()} disabled={remove.isPending}>Remove override</Button>
            ) : null}
            <Button variant="secondary" onClick={() => setPreview((open) => !open)}>Preview greeting</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || (scope === "branch" && !branchId)}>
              {save.isPending ? "Saving…" : "Save settings"}
            </Button>
          </div>
          {preview ? (
            <Card className="mt-4">
              <CardHeader title="Text preview" description="No call is placed and no audio is generated." />
              <CardBody>
                <p className="text-sm leading-6 text-slate-800">This is {form.agentName}. {form.greeting}</p>
              </CardBody>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
