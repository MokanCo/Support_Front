"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserRole } from "@/lib/user-roles";
import { SIDEBAR_COUNTS_REFRESH_EVENT } from "@/lib/sidebar-counts-refresh";
import {
  fetchSidebarNavCounts,
  sidebarCountsQueryKey,
} from "@/lib/queries/sidebar";

const POLL_MS = 45_000;

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
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const enabled = role === "admin" || role === "support";

  const { data } = useQuery({
    queryKey: sidebarCountsQueryKey(role),
    queryFn: () => fetchSidebarNavCounts(role),
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

  useEffect(() => {
    if (!enabled) return;
    if (!pathname.startsWith("/dashboard/conversations")) return;
    const t = window.setTimeout(() => {
      void queryClient.invalidateQueries({
        queryKey: sidebarCountsQueryKey(role),
      });
    }, 400);
    return () => window.clearTimeout(t);
  }, [pathname, enabled, queryClient, role]);

  if (!enabled) return emptyCounts;
  return data ?? emptyCounts;
}
