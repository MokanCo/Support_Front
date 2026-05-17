"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserRole } from "@/lib/user-roles";
import { SIDEBAR_COUNTS_REFRESH_EVENT } from "@/lib/sidebar-counts-refresh";
import {
  fetchSidebarNavCounts,
  sidebarCountsQueryKey,
} from "@/lib/queries/sidebar";

/** Fallback poll when socket/cache miss; keep high to avoid duplicating inbox HTTP. */
const POLL_MS = 120_000;

export type SidebarNavCounts = {
  newTicketsCount: number | null;
  messagesUnreadTotal: number | null;
};

const emptyCounts: SidebarNavCounts = {
  newTicketsCount: null,
  messagesUnreadTotal: null,
};

export function formatSidebarBadgeCount(n: number): string {
  if (n > 99) return "99+";
  return String(n);
}

/**
 * Loads new-queue ticket count + inbox unread for admin/support sidebar badges.
 */
export function useSidebarNavCounts(role: UserRole): SidebarNavCounts {
  const queryClient = useQueryClient();
  const enabled = role === "admin" || role === "support";

  const { data } = useQuery({
    queryKey: sidebarCountsQueryKey(role),
    queryFn: () => fetchSidebarNavCounts(role, queryClient),
    enabled,
    refetchInterval: enabled ? POLL_MS : false,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (!enabled) return;
    const onVis = () => {
      if (document.visibilityState === "visible") {
        void queryClient.invalidateQueries({
          queryKey: sidebarCountsQueryKey(role),
        });
      }
    };
    const onRefresh = () => {
      void queryClient.invalidateQueries({
        queryKey: sidebarCountsQueryKey(role),
      });
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener(SIDEBAR_COUNTS_REFRESH_EVENT, onRefresh);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener(SIDEBAR_COUNTS_REFRESH_EVENT, onRefresh);
    };
  }, [enabled, queryClient, role]);

  if (!enabled) return emptyCounts;
  return data ?? emptyCounts;
}
