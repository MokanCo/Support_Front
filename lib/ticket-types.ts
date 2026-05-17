/** Ticket enums and types for the UI (no Mongoose — API lives in backend). */

export const TICKET_STATUSES = [
  "in_queue",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ["p0", "p1", "p2", "p3", "p4"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];
