import { apiFetch } from "@/lib/auth-fetch";
import {
  normalizeSessionMeResponse,
  type SessionMeResponse,
} from "@/lib/fetch-session-me";
import { queryKeys } from "@/lib/query-keys";

export async function fetchSessionMe(): Promise<SessionMeResponse | null> {
  const res = await apiFetch("/api/auth/currentUser");
  if (!res.ok) return null;
  const json: unknown = await res.json();
  return normalizeSessionMeResponse(json);
}

export const sessionQueryOptions = {
  queryKey: queryKeys.session.me(),
  queryFn: fetchSessionMe,
  staleTime: 5 * 60 * 1000,
} as const;
