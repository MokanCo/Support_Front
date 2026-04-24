import { NextResponse } from "next/server";

/** Headers to forward from the incoming Next request to the backend. */
const FORWARD_REQUEST_HEADERS = [
  "authorization",
  "content-type",
  "accept",
  "accept-language",
  "x-user-id",
  "x-user-role",
  "x-organization-id",
] as const;

/** Response headers we avoid copying (hop-by-hop / length mismatches after buffering). */
const SKIP_RESPONSE_HEADERS = new Set([
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
]);

export function getBackendBaseUrl(): string {
  const raw = process.env.BACKEND_API_URL?.trim();
  if (!raw) {
    throw new Error(
      "BACKEND_API_URL is not set. Add it to .env.local (e.g. BACKEND_API_URL=http://localhost:4000)."
    );
  }
  return raw.replace(/\/$/, "");
}

/**
 * Forwards the request to the external backend, preserving path and query string.
 * Expects the backend to expose the same `/api/...` routes as this app.
 */
export async function proxyToBackend(request: Request): Promise<Response> {
  let base: string;
  try {
    base = getBackendBaseUrl();
  } catch (e) {
    const message = e instanceof Error ? e.message : "BACKEND_API_URL not set";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const incoming = new URL(request.url);
  const target = `${base}${incoming.pathname}${incoming.search}`;

  const headers = new Headers();
  for (const name of FORWARD_REQUEST_HEADERS) {
    const v = request.headers.get(name);
    if (v) headers.set(name, v);
  }

  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    init.duplex = "half";
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      ...init,
      signal: AbortSignal.timeout(60_000),
    });
  } catch (err) {
    console.error("[backend-proxy] fetch failed:", target, err);
    return NextResponse.json(
      { error: "Could not reach the backend API. Check BACKEND_API_URL and that the server is running." },
      { status: 502 }
    );
  }

  const body = await upstream.arrayBuffer();
  const out = new NextResponse(body, {
    status: upstream.status,
    statusText: upstream.statusText,
  });

  upstream.headers.forEach((value, key) => {
    if (!SKIP_RESPONSE_HEADERS.has(key.toLowerCase())) {
      out.headers.set(key, value);
    }
  });

  return out;
}
