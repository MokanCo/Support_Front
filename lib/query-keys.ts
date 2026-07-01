import type { UserRole } from "@/lib/user-roles";

export type TicketListFilters = {
  page: number;
  pageSize: number;
  sort: string;
  order: "asc" | "desc";
  status?: string;
  priority?: string;
  overdue?: boolean;
  locationId?: string;
  search?: string;
  category?: string;
};

export type LocationListFilters = {
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
};

export const DEFAULT_TICKETS_LIST_FILTERS: TicketListFilters = {
  page: 1,
  pageSize: 10,
  sort: "updatedAt",
  order: "desc",
};

export const DEFAULT_LOCATIONS_LIST_FILTERS: LocationListFilters = {
  page: 1,
  pageSize: 10,
  sort: "createdAt",
  order: "desc",
};

export const USERS_PANEL_LOCATIONS_FILTERS: LocationListFilters = {
  page: 1,
  pageSize: 100,
  sort: "name",
  order: "asc",
};

export const ORGANIZATIONS_LOCATIONS_FILTERS: LocationListFilters = {
  page: 1,
  pageSize: 100,
  sort: "name",
  order: "asc",
};

export const LOCATIONS_OPTIONS_FILTERS: LocationListFilters = {
  page: 1,
  pageSize: 200,
  sort: "name",
  order: "asc",
};

export const queryKeys = {
  session: {
    me: () => ["session", "me"] as const,
  },
  notifications: {
    status: () => ["notifications", "status"] as const,
  },
  messages: {
    summary: (ticketId: string) => ["messages", "summary", ticketId] as const,
  },
  tickets: {
    all: ["tickets"] as const,
    lists: () => [...queryKeys.tickets.all, "list"] as const,
    list: (filters: TicketListFilters) =>
      [...queryKeys.tickets.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.tickets.all, "detail", id] as const,
    assignableUsers: (locationId: string) =>
      [...queryKeys.tickets.all, "assignableUsers", locationId] as const,
    activities: (id: string) =>
      [...queryKeys.tickets.all, "activities", id] as const,
    related: (ticketId: string, locationId: string, category: string) =>
      [...queryKeys.tickets.all, "related", ticketId, locationId, category] as const,
    notes: (ticketId: string) =>
      [...queryKeys.tickets.all, "notes", ticketId] as const,
  },
  locations: {
    all: ["locations"] as const,
    lists: () => [...queryKeys.locations.all, "list"] as const,
    list: (filters: LocationListFilters) =>
      [...queryKeys.locations.lists(), filters] as const,
    options: () => [...queryKeys.locations.all, "options"] as const,
    detail: (id: string) => [...queryKeys.locations.all, "detail", id] as const,
  },
  users: {
    all: ["users"] as const,
    list: () => [...queryKeys.users.all, "list"] as const,
  },
  dashboard: {
    admin: () => ["dashboard", "admin"] as const,
    support: () => ["dashboard", "support"] as const,
  },
  boards: {
    all: ["boards"] as const,
    list: () => [...queryKeys.boards.all, "list"] as const,
    detail: (id: string) => [...queryKeys.boards.all, "detail", id] as const,
    members: (id: string) => [...queryKeys.boards.all, "members", id] as const,
    staffUsers: () => [...queryKeys.boards.all, "staffUsers"] as const,
  },
  conversations: {
    inbox: () => ["conversations", "inbox"] as const,
    messages: (ticketId: string) =>
      ["conversations", "messages", ticketId] as const,
  },
  sidebar: {
    counts: (role: UserRole) => ["sidebar", "counts", role] as const,
  },
  tasks: {
    all: ["tasks"] as const,
    detail: (taskId: string) => [...queryKeys.tasks.all, "detail", taskId] as const,
  },
  onboardings: {
    all: ["onboardings"] as const,
    lists: () => [...queryKeys.onboardings.all, "list"] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.onboardings.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.onboardings.all, "detail", id] as const,
    public: (token: string) =>
      [...queryKeys.onboardings.all, "public", token] as const,
  },
} as const;
