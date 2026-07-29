import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export function invalidateTickets(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all });
}

export function invalidateLocations(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.locations.all });
}

export function invalidateUsers(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
}

export function invalidateConversations(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: ["conversations"] });
}

/** Prefer cache patches on hot paths; use when inbox list must be refreshed from server. */
export function invalidateConversationsInbox(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.conversations.inbox() });
}

export function invalidateBoards(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.boards.all });
}

export function invalidateDashboard(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: ["dashboard"] });
}

export function invalidateSidebarCounts(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: ["sidebar"] });
}

export function invalidateAssets(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.assets.all });
}
