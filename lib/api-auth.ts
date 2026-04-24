import { headers } from "next/headers";
import { verifyToken } from "@/lib/auth";
import type { JwtPayload } from "@/lib/types";

function extractBearer(authorization: string | null): string | null {
  if (!authorization) return null;
  const m = authorization.match(/^\s*Bearer\s+(\S+)\s*$/i);
  return m ? m[1] : null;
}

/** Resolves the current user session from the `Authorization: Bearer` header. */
export async function getBearerSession(): Promise<JwtPayload | null> {
  const auth = headers().get("authorization");
  const token = extractBearer(auth);
  if (!token) return null;
  return verifyToken(token);
}
