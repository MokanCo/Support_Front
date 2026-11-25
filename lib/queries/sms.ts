import { apiFetch } from "@/lib/auth-fetch";

export type SmsMessage = {
  id: string;
  bandwidthMessageId: string;
  fromNumber: string;
  toNumber: string;
  messageText: string;
  direction: "inbound" | "outbound";
  status: "received" | "read";
  receivedAt: string;
  mediaUrls: string[];
  createdAt: string;
  updatedAt: string;
};

export type SmsOverview = {
  totalInbound: number;
  unread: number;
  today: number;
};

export type SmsListFilters = {
  page: number;
  pageSize?: number;
  search?: string;
  status?: "all" | "received" | "read";
  from?: string;
  to?: string;
};

async function readBody<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & { error?: string; message?: string };
  if (!res.ok) throw new Error(data.error || data.message || "Request failed");
  return data;
}

function listParams(filters: SmsListFilters): string {
  const params = new URLSearchParams();
  params.set("page", String(filters.page));
  params.set("pageSize", String(filters.pageSize ?? 20));
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  return params.toString();
}

export async function fetchSmsMessages(filters: SmsListFilters): Promise<{
  messages: SmsMessage[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const res = await apiFetch(`/api/ai-receptionist/sms/messages?${listParams(filters)}`);
  return readBody(res);
}

export async function fetchSmsConversation(phoneNumber: string): Promise<{
  phoneNumber: string;
  messages: SmsMessage[];
}> {
  const res = await apiFetch(
    `/api/ai-receptionist/sms/conversations/${encodeURIComponent(phoneNumber)}`,
  );
  return readBody(res);
}

export async function fetchSmsOverview(): Promise<SmsOverview> {
  const res = await apiFetch("/api/ai-receptionist/sms/overview");
  return readBody(res);
}

export async function markSmsRead(id: string): Promise<SmsMessage> {
  const res = await apiFetch(`/api/ai-receptionist/sms/messages/${encodeURIComponent(id)}/read`, {
    method: "PATCH",
  });
  const data = await readBody<{ message: SmsMessage }>(res);
  return data.message;
}

export function otherParty(message: SmsMessage): string {
  return message.direction === "inbound" ? message.fromNumber : message.toNumber;
}
