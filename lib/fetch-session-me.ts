import { apiFetch } from "@/lib/auth-fetch";
import type { UserRole } from "@/models/User";
import type { SessionLocation, SessionUser } from "@/lib/session-context";

export type SessionMeResponse = {
  user: SessionUser;
  location: SessionLocation;
};

const ROLES: readonly UserRole[] = ["admin", "support", "partner"];

function isUserRole(s: string): s is UserRole {
  return (ROLES as readonly string[]).includes(s);
}

function parseLocation(raw: unknown): SessionLocation {
  if (!raw || typeof raw !== "object") return null;
  const loc = raw as Record<string, unknown>;
  const id = loc.id != null ? String(loc.id) : "";
  if (!id) return null;
  return {
    id,
    name: String(loc.name ?? ""),
    email: String(loc.email ?? ""),
    phone: String(loc.phone ?? ""),
    address: String(loc.address ?? ""),
  };
}

/**
 * Backend GET /api/auth/currentUser returns `{ user }` with `locationId`;
 * legacy Next returned `{ user, location }` with `organizationId`.
 */
export function normalizeSessionMeResponse(raw: unknown): SessionMeResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const u = o.user;
  if (!u || typeof u !== "object") return null;
  const usr = u as Record<string, unknown>;
  const id = usr.id != null ? String(usr.id) : "";
  if (!id) return null;
  const roleRaw = usr.role;
  if (typeof roleRaw !== "string" || !isUserRole(roleRaw)) return null;

  const organizationId = String(usr.organizationId ?? usr.locationId ?? "");

  return {
    user: {
      id,
      name: String(usr.name ?? ""),
      email: String(usr.email ?? ""),
      role: roleRaw,
      organizationId,
    },
    location: parseLocation(o.location),
  };
}

let inflight: Promise<SessionMeResponse | null> | null = null;
let cached: { data: SessionMeResponse; until: number } | null = null;

/** How long to reuse a successful /api/auth/currentUser response (dev StrictMode + layout). */
const TTL_MS = 5000;

/** Clear cached session (call after login or logout so the next currentUser fetch is fresh). */
export function invalidateSessionMeCache(): void {
  cached = null;
}

/**
 * Single in-flight GET /api/auth/currentUser; short TTL so remounts don’t refetch.
 */
export async function fetchSessionMeOnce(): Promise<SessionMeResponse | null> {
  const now = Date.now();
  if (cached && cached.until > now) {
    return cached.data;
  }
  if (inflight) {
    return inflight;
  }

  inflight = (async () => {
    try {
      const res = await apiFetch("/api/auth/currentUser");
      if (!res.ok) return null;
      const json: unknown = await res.json();
      const data = normalizeSessionMeResponse(json);
      if (!data) return null;
      cached = { data, until: Date.now() + TTL_MS };
      return data;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
