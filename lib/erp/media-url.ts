/** Resolve media paths (e.g. `/uploads/...`) against the API origin. */
export function resolveErpMediaUrl(url: string | null | undefined): string {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw) || raw.startsWith("data:")) return raw;
  const base = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/$/, "");
  if (!base) return raw;
  if (raw.startsWith("/")) return `${base}${raw}`;
  return `${base}/${raw}`;
}

/** Alias for non-ERP public assets (Zelle QR, logos, payment proofs). */
export const resolveMediaUrl = resolveErpMediaUrl;
