import { apiFetch } from "@/lib/auth-fetch";
import { resolveApiUrl } from "@/lib/api-base";

export type OnboardingStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "rejected";

export type OnboardingListFilters = {
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
  status?: OnboardingStatus;
  service?: string;
};

export type OnboardingListRow = {
  id: string;
  trackingId: string | null;
  status: OnboardingStatus;
  ownerName: string;
  email: string;
  phone: string;
  locationName: string;
  submittedAt: string;
  progressPercent: number;
};

export type OnboardingTask = {
  id: string;
  serviceSlug: string;
  serviceTitle: string;
  title: string;
  completed: boolean;
  completedAt: string | null;
  completedByName: string;
  publicComment: string;
  internalNote: string;
  issueDescription: string;
  resolution: string;
  attachmentUrl: string;
};

export type OnboardingServiceGroup = {
  slug: string;
  title: string;
  section?: string;
  sortOrder?: number;
  iconKey?: string;
  iconClass?: string;
  tasks: OnboardingTask[];
};

export type OnboardingServiceSectionGroup = {
  title: string;
  services: OnboardingServiceGroup[];
};

export type OnboardingActivity = {
  id: string;
  eventType: string;
  title: string;
  description: string;
  isPublic: boolean;
  createdByName: string;
  createdAt: string;
};

export type OnboardingDetail = {
  request: OnboardingListRow & {
    businessName: string;
    website: string;
    notes: string;
    personal: Record<string, string>;
    location: Record<string, string>;
    selectedServices: string[];
    reviewNotes: string;
    approvedAt: string | null;
    trackingToken?: string;
  };
  trackingUrl: string | null;
  services: OnboardingServiceGroup[];
  serviceSections?: OnboardingServiceSectionGroup[];
  activities: OnboardingActivity[];
  progress: { percent: number; totalTasks: number; completedTasks: number };
};

export type PublicTrackingData = {
  request: {
    trackingId: string | null;
    status: OnboardingStatus | "pending";
    locationName: string;
    businessName: string;
    ownerName: string;
    progressPercent: number;
    lastUpdated: string;
    submittedAt: string;
    approvedAt: string | null;
  };
  services: {
    slug: string;
    title: string;
    section?: string;
    sortOrder?: number;
    tasks: {
      id: string;
      title: string;
      completed: boolean;
      completedAt: string | null;
      publicComment: string;
    }[];
  }[];
  serviceSections?: {
    title: string;
    services: PublicTrackingData["services"];
  }[];
  activities: OnboardingActivity[];
  progress: { percent: number; totalTasks: number; completedTasks: number };
};

async function parseAuth<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { message?: string; error?: string };
  if (!res.ok) {
    throw new Error(
      typeof data.message === "string"
        ? data.message
        : typeof data.error === "string"
          ? data.error
          : "Request failed",
    );
  }
  return data;
}

export async function fetchOnboardingRequestsList(
  filters: OnboardingListFilters,
) {
  const params = new URLSearchParams();
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.order) params.set("order", filters.order);
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.service) params.set("service", filters.service);
  const res = await apiFetch(`/api/onboarding/admin/requests?${params}`);
  return parseAuth<{
    requests: OnboardingListRow[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>(res);
}

export async function fetchOnboardingDetail(id: string) {
  const res = await apiFetch(`/api/onboarding/admin/requests/${id}`);
  return parseAuth<OnboardingDetail>(res);
}

export async function approveOnboardingRequest(id: string) {
  const res = await apiFetch(`/api/onboarding/admin/requests/${id}/approve`, {
    method: "POST",
  });
  return parseAuth<OnboardingDetail>(res);
}

export async function rejectOnboardingRequest(
  id: string,
  reviewNotes?: string,
) {
  const res = await apiFetch(`/api/onboarding/admin/requests/${id}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reviewNotes: reviewNotes ?? "" }),
  });
  return parseAuth<{ request: OnboardingListRow }>(res);
}

export async function updateOnboardingTask(
  requestId: string,
  taskId: string,
  patch: Partial<{
    completed: boolean;
    publicComment: string;
    internalNote: string;
    issueDescription: string;
    resolution: string;
    attachmentUrl: string;
  }>,
) {
  const res = await apiFetch(
    `/api/onboarding/admin/requests/${requestId}/tasks/${taskId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    },
  );
  return parseAuth<{
    task: OnboardingTask;
    progress: { percent: number; total: number; completed: number; status?: string };
  }>(res);
}

export async function syncOnboardingTemplates() {
  const res = await apiFetch("/api/onboarding/admin/templates/sync", {
    method: "POST",
  });
  return parseAuth<{ synced: number }>(res);
}

export async function fetchPublicTracking(token: string) {
  const res = await fetch(
    resolveApiUrl(`/api/onboarding/requests/track/${encodeURIComponent(token)}`),
    { cache: "no-store" },
  );
  if (!res.ok) {
    const data = (await res.json()) as { message?: string };
    throw new Error(data.message ?? "Tracking not found");
  }
  return res.json() as Promise<PublicTrackingData>;
}

export function onboardingListQueryKey(filters: OnboardingListFilters) {
  return ["onboardings", "list", filters] as const;
}

export function onboardingDetailQueryKey(id: string) {
  return ["onboardings", "detail", id] as const;
}

export function publicTrackingQueryKey(token: string) {
  return ["onboardings", "public", token] as const;
}

export const ONBOARDING_STATUS_LABELS: Record<OnboardingStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  rejected: "Rejected",
};

export const ONBOARDING_STATUS_STYLES: Record<OnboardingStatus, string> = {
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  in_progress: "bg-blue-50 text-blue-800 ring-blue-200",
  completed: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  rejected: "bg-red-50 text-red-800 ring-red-200",
};
