import { SignJWT, jwtVerify } from "jose";
import type { JwtPayload } from "@/lib/types";
import { jwtClaimsToSessionPayload } from "@/lib/parse-access-jwt";

export type { JwtPayload };

/** Signing (local tokens) still requires a strong secret. */
function getSecretKeyForSign(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

function getSecretKeyForVerify(): Uint8Array | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({
    role: payload.role,
    organizationId: payload.organizationId,
    email: payload.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKeyForSign());
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  const key = getSecretKeyForVerify();
  if (!key) return null;
  try {
    const { payload } = await jwtVerify(token, key);
    return jwtClaimsToSessionPayload(payload as Record<string, unknown>);
  } catch {
    return null;
  }
}

