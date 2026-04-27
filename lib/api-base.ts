/**
 * Static export has no same-origin `/api` proxy. Set `NEXT_PUBLIC_API_URL` (or
 * `BACKEND_API_URL`, mirrored in `next.config.mjs`) so `/api/...` resolves to your backend.
 * The backend must allow CORS for your static site origin and validate JWTs on `/api/*`.
 */
export function resolveApiUrl(input: RequestInfo | URL): RequestInfo | URL {
  const base = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "");
  if (!base) return input;

  const toAbsolute = (pathWithQuery: string) =>
    pathWithQuery.startsWith("/") ? `${base}${pathWithQuery}` : `${base}/${pathWithQuery}`;

  if (typeof input === "string") {
    if (input.startsWith("/api")) return toAbsolute(input);
    return input;
  }
  if (input instanceof URL) {
    if (input.pathname.startsWith("/api")) {
      return toAbsolute(`${input.pathname}${input.search}`);
    }
    return input;
  }
  return input;
}
