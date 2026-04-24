import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyTokenEdge } from "@/lib/auth-edge";

const publicPaths = ["/login", "/api/auth/login"];

function isPublicPath(pathname: string): boolean {
  if (publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    /\.(ico|png|jpg|jpeg|svg|webp|gif|txt|woff2?)$/i.test(pathname)
  ) {
    return true;
  }
  return false;
}

function extractBearer(authorization: string | null): string | null {
  if (!authorization) return null;
  const m = authorization.match(/^\s*Bearer\s+(\S+)\s*$/i);
  return m ? m[1] : null;
}

function isPublicApi(pathname: string, request: NextRequest): boolean {
  if (pathname === "/api/auth/login" && request.method === "POST") return true;
  if (pathname === "/api/auth/logout" && request.method === "POST") return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    if (isPublicApi(pathname, request)) {
      return NextResponse.next();
    }
    const token = extractBearer(request.headers.get("authorization"));
    const session = token ? await verifyTokenEdge(token) : null;
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const requestHeaders = new Headers(request.headers);
    // Re-apply Bearer so downstream route handlers / proxy always see a normalized header.
    if (token) {
      requestHeaders.set("authorization", `Bearer ${token}`);
    }
    requestHeaders.set("x-user-id", session.sub);
    requestHeaders.set("x-user-role", session.role);
    requestHeaders.set("x-organization-id", session.organizationId);
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
