import { resolveApiUrl } from "@/lib/api-base";

export type PublicAchSetupPayload = {
  company: {
    name: string;
    logoUrl?: string;
  };
  customerName?: string;
  /** Already linked and verified — nothing left to do. */
  alreadyLinked?: boolean;
};

async function publicJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(resolveApiUrl(path), {
    ...init,
    credentials: "omit",
  });
  const data = (await res.json()) as T & { error?: string; message?: string };
  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error ||
        (data as { message?: string }).message ||
        "Request failed",
    );
  }
  return data;
}

/** Canonical link for the one-time "authorize automatic ACH billing" page —
 *  sent once per customer, independent of any specific invoice. */
export function publicAchSetupHref(token: string) {
  return `/ach-setup?token=${encodeURIComponent(token)}`;
}

export async function fetchPublicAchSetup(token: string) {
  return publicJson<PublicAchSetupPayload>(
    `/api/public/ach-setup/${encodeURIComponent(token)}`,
  );
}

/** Creates a Stripe SetupIntent to link + authorize a bank account with no
 *  charge attached — the mandate and payment method are saved for later
 *  off-session ACH debits against any future invoice. */
export async function createPublicAchSetupIntent(token: string) {
  return publicJson<{ clientSecret: string; publishableKey: string }>(
    `/api/public/ach-setup/${encodeURIComponent(token)}/setup-intent`,
    { method: "POST" },
  );
}
