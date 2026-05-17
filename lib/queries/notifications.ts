import { apiFetch } from "@/lib/auth-fetch";
import {
  parseStatusNotificationsList,
  type StatusNotificationRow,
} from "@/lib/use-status-notifications";
import { queryKeys } from "@/lib/query-keys";

export async function fetchStatusNotifications(): Promise<StatusNotificationRow[]> {
  const res = await apiFetch("/api/notifications?channel=status");
  const data: unknown = await res.json();
  if (!res.ok) return [];
  return parseStatusNotificationsList(data);
}

export const statusNotificationsQueryOptions = {
  queryKey: queryKeys.notifications.status(),
  queryFn: fetchStatusNotifications,
} as const;
