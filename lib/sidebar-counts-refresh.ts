/** Fired to refresh admin/support sidebar ticket & message badges. */
export const SIDEBAR_COUNTS_REFRESH_EVENT = "mokanco:sidebar-counts-refresh";

export function requestSidebarCountsRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SIDEBAR_COUNTS_REFRESH_EVENT));
}
