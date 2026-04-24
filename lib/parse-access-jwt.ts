import type { UserRole } from "@/models/User";
import type { JwtPayload } from "@/lib/types";

const ROLES: readonly UserRole[] = ["admin", "support", "partner"];

function isUserRole(s: string): s is UserRole {
  return (ROLES as readonly string[]).includes(s);
}

/**
 * Maps verified JWT claims to our session shape.
 * Supports backend tokens that only set `sub` + `role`, and `locationId` instead of `organizationId`.
 */
export function jwtClaimsToSessionPayload(
  payload: Record<string, unknown>
): JwtPayload | null {
  const sub =
    typeof payload.sub === "string"
      ? payload.sub
      : payload.sub != null
        ? String(payload.sub)
        : "";
  if (!sub) return null;

  const roleRaw = payload.role;
  if (typeof roleRaw !== "string" || !isUserRole(roleRaw)) return null;

  const organizationId =
    (typeof payload.organizationId === "string" && payload.organizationId) ||
    (typeof payload.locationId === "string" && payload.locationId) ||
    "";

  const email = typeof payload.email === "string" ? payload.email : "";

  return { sub, role: roleRaw, organizationId, email };
}
