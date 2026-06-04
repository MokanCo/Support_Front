import type { QueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/auth-fetch";
import type { UserRole } from "@/lib/user-roles";
import { sumInboxUnreadFromCache } from "@/lib/queries/conversation-cache";
import { queryKeys } from "@/lib/query-keys";
import type { SidebarNavCounts } from "@/lib/use-sidebar-nav-counts";

const emptyCounts: SidebarNavCounts = {
  newTicketsCount: null,
  messagesUnreadTotal: null,
};

export async function fetchSidebarNavCounts(
  role: UserRole,
  queryClient?: QueryClient,
): Promise<SidebarNavCounts> {
  if (role !== "admin" && role !== "support") return emptyCounts;

  const cachedUnread = queryClient ? sumInboxUnreadFromCache(queryClient) : null;

  const tRes = await apiFetch("/api/tickets?page=1&pageSize=1&newQueue=1");
  const tJson = (await tRes.json()) as { total?: number; error?: string };
  const newTicketsCount =
    tRes.ok && typeof tJson.total === "number" ? tJson.total : null;

  let messagesUnreadTotal: number | null = cachedUnread;
  if (messagesUnreadTotal == null) {
    const cRes = await apiFetch("/api/conversations/inbox");
    const cJson = (await cRes.json()) as {
      conversations?: { unreadCount?: number }[];
    };
    if (cRes.ok) {
      const rows = Array.isArray(cJson.conversations) ? cJson.conversations : [];
      messagesUnreadTotal = rows.reduce(
        (sum, r) => sum + (typeof r.unreadCount === "number" ? r.unreadCount : 0),
        0,
      );
    }
  }

  return { newTicketsCount, messagesUnreadTotal };
}

export function sidebarCountsQueryKey(role: UserRole) {
  return queryKeys.sidebar.counts(role);
}
