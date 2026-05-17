import { apiFetch } from "@/lib/auth-fetch";
import { parseUsersListJson } from "@/lib/users-api";
import { queryKeys } from "@/lib/query-keys";

export async function fetchUsersList(): Promise<unknown> {
  const res = await apiFetch("/api/users");
  const data: unknown = await res.json();
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to load users");
  return parseUsersListJson(data);
}

export const usersListQueryOptions = {
  queryKey: queryKeys.users.list(),
  queryFn: fetchUsersList,
} as const;
