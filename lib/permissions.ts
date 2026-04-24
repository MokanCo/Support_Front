import type { UserRole } from "@/models/User";

export function isAdmin(role: UserRole): boolean {
  return role === "admin";
}

export function isSupport(role: UserRole): boolean {
  return role === "support";
}

export function isPartner(role: UserRole): boolean {
  return role === "partner";
}

/** Admin-only: create/update/delete locations */
export function canManageLocations(role: UserRole): boolean {
  return role === "admin";
}

/** @deprecated use canManageLocations */
export function canManageOrganizations(role: UserRole): boolean {
  return canManageLocations(role);
}

export function canCreateUsers(role: UserRole): boolean {
  return role === "admin";
}

export function canPatchUsers(role: UserRole): boolean {
  return role === "admin";
}

/** Admin: global ticket list and optional location filter */
export function canViewAllTickets(role: UserRole): boolean {
  return role === "admin";
}

/** CSV / analytics exports (admin only) */
export function canAccessTicketReports(role: UserRole): boolean {
  return role === "admin";
}

export function canAccessConversationsInbox(role: UserRole): boolean {
  return role === "admin";
}

export function canAssignOrUpdateTicketStatus(role: UserRole): boolean {
  return role === "admin" || role === "support";
}

export function canListAllUsers(role: UserRole): boolean {
  return role === "admin" || role === "support";
}

export function canListLocations(role: UserRole): boolean {
  return role === "admin";
}

/** Read-only location list (e.g. staff creating tickets). Locations pages stay admin-only. */
export function canFetchLocationDirectory(role: UserRole): boolean {
  return role === "admin" || role === "support";
}
