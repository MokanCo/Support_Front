import { resolveApiUrl } from "@/lib/api-base";

export type OnboardingConfig = {
  brandName: string;
  welcomeTitle: string;
  welcomeDescription: string;
  wizardTitle: string;
  wizardSidebarTitle: string;
  wizardSidebarDescription: string;
  stepLabels: string[];
  welcomeSteps: { num: number; label: string }[];
  stepSubtitles: Record<string, string>;
  successTitle: string;
  successDescription: string;
  successEmailNote: string;
  enabled: boolean;
};

export type OnboardingService = {
  id: string;
  slug: string;
  title: string;
  section: string;
  iconKey: string;
  iconClass: string;
};

export type OnboardingServiceSection = {
  title: string;
  services: OnboardingService[];
};

export type PersonalInfo = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
};

export type LocationInfo = {
  locationName: string;
  locationEmail: string;
  locationPhone: string;
  openingDate: string;
  address: string;
  city: string;
  state: string;
  zip: string;
};

export type OnboardingRequest = {
  id: string;
  trackingToken: string;
  status: "draft" | "pending" | "approved" | "rejected";
  personal: PersonalInfo;
  location: LocationInfo;
  selectedServices: string[];
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
};

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { message?: string };
  if (!res.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Request failed",
    );
  }
  return data;
}

export async function fetchOnboardingConfig(): Promise<OnboardingConfig | null> {
  const res = await fetch(resolveApiUrl("/api/onboarding/config"), {
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { config?: OnboardingConfig };
  return data.config ?? null;
}

export async function fetchOnboardingServices(): Promise<
  OnboardingServiceSection[]
> {
  const res = await fetch(resolveApiUrl("/api/onboarding/services"), {
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { sections?: OnboardingServiceSection[] };
  return data.sections ?? [];
}

export async function createOnboardingDraft(payload: {
  personal: PersonalInfo;
  additionalPartners?: PersonalInfo[];
  location: LocationInfo;
  trackingToken?: string;
}): Promise<{ request: OnboardingRequest; trackingToken: string }> {
  const res = await fetch(resolveApiUrl("/api/onboarding/requests/draft"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function saveOnboardingServices(
  trackingToken: string,
  selectedServices: string[],
): Promise<{ request: OnboardingRequest }> {
  const res = await fetch(
    resolveApiUrl(
      `/api/onboarding/requests/${encodeURIComponent(trackingToken)}/services`,
    ),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedServices }),
    },
  );
  return parseJson(res);
}

export async function finalizeOnboardingRequest(
  trackingToken: string,
): Promise<{
  request: OnboardingRequest;
  trackingUrl: string;
  message: string;
}> {
  const res = await fetch(
    resolveApiUrl(
      `/api/onboarding/requests/${encodeURIComponent(trackingToken)}/submit`,
    ),
    { method: "POST" },
  );
  return parseJson(res);
}

export async function submitOnboardingRequest(payload: {
  personal: PersonalInfo;
  location: LocationInfo;
  selectedServices: string[];
}): Promise<{
  request: OnboardingRequest;
  trackingUrl: string;
  message: string;
}> {
  const res = await fetch(resolveApiUrl("/api/onboarding/requests"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function checkEmailAvailable(
  email: string,
): Promise<{ available: boolean }> {
  const res = await fetch(
    resolveApiUrl(
      `/api/onboarding/check-email?email=${encodeURIComponent(email)}`,
    ),
    { cache: "no-store" },
  );
  if (!res.ok) return { available: true };
  return (await res.json()) as { available: boolean };
}

export async function trackOnboardingRequest(token: string): Promise<{
  request: OnboardingRequest;
  trackingUrl: string;
}> {
  const res = await fetch(
    resolveApiUrl(
      `/api/onboarding/requests/track/${encodeURIComponent(token)}`,
    ),
    { cache: "no-store" },
  );
  return parseJson(res);
}
