const STORAGE_PREFIX = "mokanco_partner_tour_done:";

export const PARTNER_TOUR_PENDING_KEY = "mokanco_partner_show_tour";
export const PARTNER_TOUR_EXPAND_SIDEBAR_EVENT = "mokanco:partner-tour-expand-sidebar";

export function partnerTourStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

export function hasCompletedPartnerTour(userId: string): boolean {
  if (typeof window === "undefined" || !userId) return true;
  return localStorage.getItem(partnerTourStorageKey(userId)) === "1";
}

export function markPartnerTourCompleted(userId: string): void {
  if (typeof window === "undefined" || !userId) return;
  localStorage.setItem(partnerTourStorageKey(userId), "1");
  sessionStorage.removeItem(PARTNER_TOUR_PENDING_KEY);
}

/** Partner tour after first login (or right after mandatory password change). */
export function shouldShowPartnerTour(userId: string): boolean {
  if (!userId || hasCompletedPartnerTour(userId)) return false;
  if (typeof window === "undefined") return false;
  if (sessionStorage.getItem(PARTNER_TOUR_PENDING_KEY) === "1") return true;
  const firstVisitKey = `mokanco_partner_tour_first_visit:${userId}`;
  if (localStorage.getItem(firstVisitKey) === "1") return false;
  localStorage.setItem(firstVisitKey, "1");
  return true;
}

export function requestSidebarExpandForTour(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PARTNER_TOUR_EXPAND_SIDEBAR_EVENT));
}
