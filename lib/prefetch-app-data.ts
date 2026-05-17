import type { QueryClient } from "@tanstack/react-query";
import type { UserRole } from "@/lib/user-roles";
import {
  DEFAULT_LOCATIONS_LIST_FILTERS,
  DEFAULT_TICKETS_LIST_FILTERS,
  LOCATIONS_OPTIONS_FILTERS,
  ORGANIZATIONS_LOCATIONS_FILTERS,
  queryKeys,
  USERS_PANEL_LOCATIONS_FILTERS,
} from "@/lib/query-keys";
import { sessionQueryOptions } from "@/lib/queries/session";
import {
  adminDashboardQueryOptions,
  supportDashboardQueryOptions,
} from "@/lib/queries/dashboard";
import { usersListQueryOptions } from "@/lib/queries/users";
import {
  fetchLocationOptions,
  fetchLocationsList,
  locationListQueryKey,
  locationOptionsQueryKey,
} from "@/lib/queries/locations";
import { fetchTicketsList, ticketListQueryKey } from "@/lib/queries/tickets";
import { boardsListQueryOptions } from "@/lib/queries/boards";
import { inboxQueryOptions } from "@/lib/queries/conversations";
import { statusNotificationsQueryOptions } from "@/lib/queries/notifications";
import { fetchSidebarNavCounts, sidebarCountsQueryKey } from "@/lib/queries/sidebar";

/**
 * Warm the React Query cache after login so sidebar navigation reuses data.
 */
export async function prefetchAppData(
  queryClient: QueryClient,
  role: UserRole,
): Promise<void> {
  const tasks: Promise<unknown>[] = [
    queryClient.prefetchQuery(sessionQueryOptions),
    queryClient.prefetchQuery({
      queryKey: ticketListQueryKey(DEFAULT_TICKETS_LIST_FILTERS),
      queryFn: () => fetchTicketsList(DEFAULT_TICKETS_LIST_FILTERS),
    }),
    queryClient.prefetchQuery(statusNotificationsQueryOptions),
  ];

  if (role === "admin") {
    tasks.push(
      queryClient.prefetchQuery(adminDashboardQueryOptions),
      queryClient.prefetchQuery(usersListQueryOptions),
      queryClient.prefetchQuery({
        queryKey: locationListQueryKey(DEFAULT_LOCATIONS_LIST_FILTERS),
        queryFn: () => fetchLocationsList(DEFAULT_LOCATIONS_LIST_FILTERS),
      }),
      queryClient.prefetchQuery({
        queryKey: locationListQueryKey(USERS_PANEL_LOCATIONS_FILTERS),
        queryFn: () => fetchLocationsList(USERS_PANEL_LOCATIONS_FILTERS),
      }),
      queryClient.prefetchQuery({
        queryKey: locationListQueryKey(ORGANIZATIONS_LOCATIONS_FILTERS),
        queryFn: () => fetchLocationsList(ORGANIZATIONS_LOCATIONS_FILTERS),
      }),
      queryClient.prefetchQuery({
        queryKey: locationOptionsQueryKey,
        queryFn: fetchLocationOptions,
      }),
      queryClient.prefetchQuery(boardsListQueryOptions),
      queryClient.prefetchQuery(inboxQueryOptions),
      queryClient.prefetchQuery({
        queryKey: sidebarCountsQueryKey(role),
        queryFn: () => fetchSidebarNavCounts(role),
      }),
    );
  } else if (role === "support") {
    tasks.push(
      queryClient.prefetchQuery(supportDashboardQueryOptions),
      queryClient.prefetchQuery(boardsListQueryOptions),
      queryClient.prefetchQuery(inboxQueryOptions),
      queryClient.prefetchQuery({
        queryKey: sidebarCountsQueryKey(role),
        queryFn: () => fetchSidebarNavCounts(role),
      }),
    );
  }

  if (role === "partner") {
    tasks.push(
      queryClient.prefetchQuery({
        queryKey: locationListQueryKey(LOCATIONS_OPTIONS_FILTERS),
        queryFn: () => fetchLocationsList(LOCATIONS_OPTIONS_FILTERS),
      }),
    );
  }

  await Promise.allSettled(tasks);
}

export function prefetchAppDataQueryKeys(role: UserRole): readonly unknown[][] {
  const keys: unknown[][] = [
    [queryKeys.session.me()],
    [ticketListQueryKey(DEFAULT_TICKETS_LIST_FILTERS)],
    [queryKeys.notifications.status()],
  ];
  if (role === "admin") {
    keys.push(
      [queryKeys.dashboard.admin()],
      [queryKeys.users.list()],
      [locationListQueryKey(DEFAULT_LOCATIONS_LIST_FILTERS)],
      [locationListQueryKey(USERS_PANEL_LOCATIONS_FILTERS)],
      [locationListQueryKey(ORGANIZATIONS_LOCATIONS_FILTERS)],
      [locationOptionsQueryKey],
      [queryKeys.boards.list()],
      [queryKeys.conversations.inbox()],
      [sidebarCountsQueryKey(role)],
    );
  } else if (role === "support") {
    keys.push(
      [queryKeys.dashboard.support()],
      [queryKeys.boards.list()],
      [queryKeys.conversations.inbox()],
      [sidebarCountsQueryKey(role)],
    );
  }
  return keys;
}
