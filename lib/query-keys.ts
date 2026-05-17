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

export const queryKeys = {
  session: {
    me: () => ["session", "me"] as const,
  },
  tickets: {
    all: ["tickets"] as const,
    lists: () => [...queryKeys.tickets.all, "list"] as const,
    list: (filters: TicketListFilters) => [...queryKeys.tickets.lists(), filters] as const,
    insights: () => [...queryKeys.tickets.all, "insights"] as const,
    details: () => [...queryKeys.tickets.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.tickets.details(), id] as const,
    notes: (ticketId: string) => [...queryKeys.tickets.detail(ticketId), "notes"] as const,
    activities: (ticketId: string) => [...queryKeys.tickets.detail(ticketId), "activities"] as const,
    assignableUsers: (locationId: string) =>
      ["tickets", "assignable-users", locationId] as const,
    related: (ticketId: string, locationId: string, category: string) =>
      ["tickets", "related", ticketId, locationId, category] as const,
  },
  locations: {
    all: ["locations"] as const,
    lists: () => [...queryKeys.locations.all, "list"] as const,
    list: (filters: LocationListFilters) => [...queryKeys.locations.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.locations.all, "detail", id] as const,
    allForDashboard: () => [...queryKeys.locations.all, "dashboard-all"] as const,
    options: () => [...queryKeys.locations.all, "options"] as const,
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
    members: (boardId: string) => [...queryKeys.boards.all, "members", boardId] as const,
    staffUsers: () => [...queryKeys.boards.all, "staff-users"] as const,
  },
  conversations: {
    inbox: () => ["conversations", "inbox"] as const,
    messages: (ticketId: string) => ["conversations", "messages", ticketId] as const,
    summary: (ticketId: string) => ["conversations", "summary", ticketId] as const,
  },
  tasks: {
    detail: (taskId: string) => ["tasks", "detail", taskId] as const,
    comments: (taskId: string) => ["tasks", "comments", taskId] as const,
    attachments: (taskId: string) => ["tasks", "attachments", taskId] as const,
  },
  notifications: {
    status: () => ["notifications", "status"] as const,
  },
  sidebar: {
    counts: (role: string) => ["sidebar", "counts", role] as const,
  },
} as const;

/** Default tickets table query — prefetched on app load. */
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

export const LOCATIONS_OPTIONS_FILTERS: LocationListFilters = {
  page: 1,
  pageSize: 200,
  sort: "name",
  order: "asc",
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
  sort: "createdAt",
  order: "desc",
};
