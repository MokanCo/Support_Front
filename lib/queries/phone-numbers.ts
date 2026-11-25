import { apiFetch } from "@/lib/auth-fetch";

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const DAY_LABEL: Record<Weekday, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

export const PROVIDERS = [
  { value: "unknown", label: "Not identified" },
  { value: "existing_carrier", label: "Existing carrier" },
  { value: "ptcl", label: "PTCL" },
  { value: "forwarded", label: "Forward later" },
  { value: "sip", label: "SIP later" },
  { value: "bandwidth", label: "Bandwidth" },
  { value: "other", label: "Other" },
] as const;

export type PhoneProvider = (typeof PROVIDERS)[number]["value"];
export type ForwardMode = "none" | "forward" | "sip" | "manual";
export type ForwardingStatus = "not_configured" | "pending" | "active";

export const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
];

export type ScheduleRow = {
  day: Weekday;
  closed: boolean;
  open: string;
  close: string;
};

export type PhoneForwarding = {
  mode: ForwardMode;
  status: ForwardingStatus;
  destination: string;
  notes: string;
  routingLive: false;
};

export type BranchPhoneNumber = {
  id: string;
  locationId: string;
  branchName: string;
  branchPhone: string;
  branchIsDisabled: boolean;
  existingPhoneNumber: string;
  aiDestinationNumber: string;
  provider: PhoneProvider;
  providerLabel: string;
  aiEnabled: boolean;
  businessHours: {
    timezone: string;
    schedule: ScheduleRow[];
  };
  humanFallbackNumber: string;
  transferNumber: string;
  forwarding: PhoneForwarding;
  connectionStatus: "not_connected";
  lastTestAt: string | null;
  lastTestResult: "not_run" | "unavailable" | "invalid";
  lastTestMessage: string;
  createdAt?: string;
  updatedAt?: string;
};

export type PhoneNumberWrite = {
  locationId?: string;
  existingPhoneNumber?: string;
  aiDestinationNumber?: string;
  provider?: PhoneProvider;
  providerLabel?: string;
  aiEnabled?: boolean;
  businessHours?: BranchPhoneNumber["businessHours"];
  humanFallbackNumber?: string;
  transferNumber?: string;
  forwarding?: {
    mode: ForwardMode;
    status: ForwardingStatus;
    destination: string;
    notes: string;
    routingLive: false;
  };
};

export type PhoneNumberListFilters = {
  page: number;
  pageSize: number;
  search?: string;
  locationId?: string;
};

export type PhoneNumberTestResult = {
  phoneNumber: BranchPhoneNumber;
  test: {
    result: "unavailable" | "invalid";
    message: string;
    placedCall: false;
    routingChanged: false;
  };
};

export function blankSchedule(): ScheduleRow[] {
  return WEEKDAYS.map((day) => ({ day, closed: false, open: "", close: "" }));
}

export function providerLabel(row: Pick<BranchPhoneNumber, "provider" | "providerLabel">): string {
  if (row.provider === "other") return row.providerLabel || "Other";
  return PROVIDERS.find((item) => item.value === row.provider)?.label ?? "Not identified";
}

export function forwardingLabel(forwarding: PhoneForwarding): string {
  const status = forwarding.status === "active" ? "Active" : forwarding.status === "pending" ? "Pending" : "Not configured";
  if (forwarding.mode === "forward") return `Carrier forwarding, ${status}`;
  if (forwarding.mode === "sip") return `SIP forwarding, ${status}`;
  if (forwarding.mode === "manual") return `Manual, ${status}`;
  return "Not configured";
}

export function hoursLabel(hours: BranchPhoneNumber["businessHours"] | undefined): string {
  const openDays = (hours?.schedule ?? []).filter((row) => !row.closed && row.open && row.close);
  if (openDays.length === 0) return "Not set";
  return openDays.map((row) => `${DAY_LABEL[row.day]} ${row.open}–${row.close}`).join(", ");
}

async function readBody<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & { error?: string; message?: string };
  if (!res.ok) {
    throw new Error(data.error || data.message || "Request failed");
  }
  return data;
}

function listParams(filters: PhoneNumberListFilters): string {
  const params = new URLSearchParams();
  params.set("page", String(filters.page));
  params.set("pageSize", String(filters.pageSize));
  params.set("sort", "createdAt");
  params.set("order", "desc");
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.locationId && filters.locationId !== "all") {
    params.set("locationId", filters.locationId);
  }
  return params.toString();
}

export async function fetchPhoneNumbers(filters: PhoneNumberListFilters): Promise<{
  phoneNumbers: BranchPhoneNumber[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const res = await apiFetch(`/api/ai-receptionist/phone-numbers?${listParams(filters)}`);
  return readBody(res);
}

export async function createPhoneNumber(body: PhoneNumberWrite): Promise<BranchPhoneNumber> {
  const res = await apiFetch("/api/ai-receptionist/phone-numbers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await readBody<{ phoneNumber: BranchPhoneNumber }>(res);
  return data.phoneNumber;
}

export async function updatePhoneNumber(
  id: string,
  body: PhoneNumberWrite,
): Promise<BranchPhoneNumber> {
  const res = await apiFetch(`/api/ai-receptionist/phone-numbers/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await readBody<{ phoneNumber: BranchPhoneNumber }>(res);
  return data.phoneNumber;
}

export async function deletePhoneNumber(id: string): Promise<void> {
  const res = await apiFetch(`/api/ai-receptionist/phone-numbers/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  await readBody(res);
}

export async function testPhoneNumber(id: string): Promise<PhoneNumberTestResult> {
  const res = await apiFetch(
    `/api/ai-receptionist/phone-numbers/${encodeURIComponent(id)}/test`,
    { method: "POST" },
  );
  return readBody(res);
}
