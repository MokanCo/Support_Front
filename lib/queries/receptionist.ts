import { apiFetch } from "@/lib/auth-fetch";

export const KNOWLEDGE_CATEGORIES = [
  "Company information",
  "General FAQs",
  "Menu information",
  "Menu prices",
  "Promotions",
  "Opening hours",
  "Branch policies",
  "Delivery information",
  "Pickup information",
  "Customer service policies",
  "Other frequently asked questions",
] as const;

async function readJson<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & { error?: string; message?: string };
  if (!res.ok) throw new Error(data.error || data.message || "Request failed");
  return data;
}

function send<T>(input: RequestInfo | URL | Promise<Response>, init?: RequestInit): Promise<T> {
  const pending =
    init === undefined && typeof (input as Promise<Response>).then === "function"
      ? (input as Promise<Response>)
      : apiFetch(input as RequestInfo | URL, init);
  return pending.then((res) => readJson<T>(res));
}

export type AgentSettings = {
  locationId: string | null;
  scope: "global" | "branch";
  inheritsGlobal: boolean;
  agentName: string;
  voice: string;
  voiceSpeed: string;
  language: string;
  speakingStyle: string;
  tone: string;
  greeting: string;
  maxCallDurationSec: number;
  silenceTimeoutSec: number;
  repeatHandling: string;
  interruptionHandling: string;
  unknownQuestionHandling: string;
  escalationRules: string;
  complaintHandling: string;
  afterHoursBehavior: string;
  aiEnabled: boolean;
  updatedAt: string | null;
};

export type KnowledgeEntry = {
  id: string;
  title: string;
  body: string;
  category: string;
  scope: "global" | "branch";
  locationId: string | null;
  branchName: string;
  approved: boolean;
  updatedAt: string;
};

export type ScheduleRow = { day: string; closed: boolean; open: string; close: string };

export type BranchProfile = {
  locationId: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  isDisabled: boolean;
  openingHours: { timezone: string; schedule: ScheduleRow[] };
  holidayHours: string;
  services: string;
  policies: string;
  faqs: string;
  updatedAt: string | null;
};

export type CallRow = {
  id: string;
  from: string;
  to?: string;
  locationId: string | null;
  branchName: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  handling: string;
  outcome: string;
  transferStatus: string;
  resolutionStatus: string;
  summary?: string;
  turns?: { speaker: string; text: string; at: string }[];
  recordingAvailable?: boolean;
  recordingDisclosed?: boolean;
};

export type AnalyticsPayload = {
  kpis: {
    total: number;
    answeredByAi: number;
    transferred: number;
    missed: number;
    averageDurationSeconds: number;
    resolved: number;
    unresolved: number;
    aiAnswerRate: number;
    missedRate: number;
    transferRate: number;
    resolvedRate: number;
    unresolvedRate: number;
  };
  charts: {
    volume: { date: string; total: number; ai: number; human: number }[];
    outcomes: { outcome: string; total: number }[];
    branches: { branchName: string; total: number; transferred: number; missed: number }[];
    hours: { hour: number; total: number }[];
  };
  questions: { text: string; total: number }[];
  complaints: { text: string; total: number }[];
  recentCalls: CallRow[];
  service: {
    telephony: { configured: boolean; webhooksReady: boolean };
    openai: { configured: boolean; model: string };
    recording: { enabled: boolean; retentionDays: number };
    database: string;
    routingLive: boolean;
  };
};

export type ReceptionistSettings = {
  recordingEnabled: boolean;
  retentionDays: number;
  disclosureMessage: string;
  notifyEmail: string;
};

export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds || 0));
  const minutes = Math.floor(safe / 60);
  return `${minutes}:${String(safe % 60).padStart(2, "0")}`;
}

export function formatWhen(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function queryString(filters: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "" && value !== "all") params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

export function fetchOverview(filters: { from?: string; to?: string; locationId?: string }) {
  return send<AnalyticsPayload>(apiFetch(`/api/ai-receptionist/overview${queryString(filters)}`));
}

export function fetchAgentSettings(locationId?: string) {
  return send<{ settings: AgentSettings }>(
    apiFetch(`/api/ai-receptionist/agent-settings${queryString({ locationId })}`),
  ).then((data) => data.settings);
}

export function saveAgentSettings(body: Partial<AgentSettings> & { locationId: string | null }) {
  return send<{ settings: AgentSettings }>(
    apiFetch("/api/ai-receptionist/agent-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  ).then((data) => data.settings);
}

export function deleteAgentOverride(locationId: string) {
  return send<{ ok: boolean }>(
    apiFetch(`/api/ai-receptionist/agent-settings?locationId=${encodeURIComponent(locationId)}`, {
      method: "DELETE",
    }),
  );
}

export function fetchKnowledge(filters: {
  page: number;
  search?: string;
  category?: string;
  scope?: string;
  locationId?: string;
}) {
  return send<{
    entries: KnowledgeEntry[];
    total: number;
    page: number;
    totalPages: number;
  }>(apiFetch(`/api/ai-receptionist/knowledge${queryString({ ...filters, pageSize: 10 })}`));
}

export function saveKnowledge(id: string | null, body: Record<string, unknown>) {
  return send<{ entry: KnowledgeEntry }>(
    apiFetch(id ? `/api/ai-receptionist/knowledge/${id}` : "/api/ai-receptionist/knowledge", {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  ).then((data) => data.entry);
}

export function deleteKnowledge(id: string) {
  return send(apiFetch(`/api/ai-receptionist/knowledge/${id}`, { method: "DELETE" }));
}

export function importKnowledge(body: Record<string, unknown>) {
  return send<{ imported: number }>(
    apiFetch("/api/ai-receptionist/knowledge/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export function fetchBranches(search?: string) {
  return send<{ branches: BranchProfile[] }>(
    apiFetch(`/api/ai-receptionist/branches${queryString({ search })}`),
  ).then((data) => data.branches);
}

export function saveBranchProfile(locationId: string, body: Record<string, unknown>) {
  return send<{ branch: BranchProfile }>(
    apiFetch(`/api/ai-receptionist/branches/${locationId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  ).then((data) => data.branch);
}

export function fetchCalls(filters: {
  page: number;
  search?: string;
  locationId?: string;
  outcome?: string;
  from?: string;
  to?: string;
  hasRecording?: string;
}) {
  return send<{ calls: CallRow[]; total: number; page: number; totalPages: number }>(
    apiFetch(`/api/ai-receptionist/calls${queryString({ ...filters, pageSize: 10 })}`),
  );
}

export function fetchCall(id: string) {
  return send<{ call: CallRow }>(apiFetch(`/api/ai-receptionist/calls/${id}`)).then((data) => data.call);
}

export function updateCallResolution(id: string, resolutionStatus: string) {
  return send<{ call: CallRow }>(
    apiFetch(`/api/ai-receptionist/calls/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolutionStatus }),
    }),
  ).then((data) => data.call);
}

export function fetchRecordings(filters: { page: number; locationId?: string }) {
  return send<{ calls: CallRow[]; total: number; page: number; totalPages: number }>(
    apiFetch(`/api/ai-receptionist/recordings${queryString({ ...filters, pageSize: 10 })}`),
  );
}

export function fetchRecording(callId: string) {
  return send<{ recording: Record<string, unknown>; call: CallRow }>(
    apiFetch(`/api/ai-receptionist/recordings/${callId}`),
  );
}

export async function fetchRecordingAudio(callId: string): Promise<string> {
  const res = await apiFetch(`/api/ai-receptionist/recordings/${callId}/audio`);
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new Error(data.error || data.message || "Recording could not be played");
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export function fetchAnalytics(filters: { from?: string; to?: string; locationId?: string }) {
  return send<AnalyticsPayload>(apiFetch(`/api/ai-receptionist/analytics${queryString(filters)}`));
}

export async function exportAnalytics(filters: { from?: string; to?: string; locationId?: string }) {
  const res = await apiFetch(`/api/ai-receptionist/analytics/export${queryString(filters)}`);
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || "Export failed");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "receptionist-calls.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function fetchSettings() {
  return send<{ settings: ReceptionistSettings }>(apiFetch("/api/ai-receptionist/settings")).then(
    (data) => data.settings,
  );
}

export function saveSettings(body: ReceptionistSettings) {
  return send<{ settings: ReceptionistSettings }>(
    apiFetch("/api/ai-receptionist/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  ).then((data) => data.settings);
}

export function fetchHealth() {
  return send<AnalyticsPayload["service"]>(apiFetch("/api/ai-receptionist/health"));
}

export function fetchAudit() {
  return send<{ events: { id: string; action: string; entityType: string; createdAt: string }[] }>(
    apiFetch("/api/ai-receptionist/audit"),
  ).then((data) => data.events);
}
