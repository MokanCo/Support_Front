import { jwtVerify } from "jose";
import type { JwtPayload } from "@/lib/types";
import { jwtClaimsToSessionPayload } from "@/lib/parse-access-jwt";

function getSecretKey(): Uint8Array | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

export async function verifyTokenEdge(
  token: string
): Promise<JwtPayload | null> {
  const key = getSecretKey();
  if (!key) return null;
  try {
    const { payload } = await jwtVerify(token, key);
    return jwtClaimsToSessionPayload(payload as Record<string, unknown>);
  } catch {
    return null;
  }
}
