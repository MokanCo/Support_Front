/**
 * Static export has no same-origin `/api` proxy. Set `NEXT_PUBLIC_API_URL` to your
 * backend origin (e.g. `https://api.example.com`) so the browser calls `/api/...` there.
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
