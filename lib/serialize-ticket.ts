import type { TicketPriority, TicketStatus } from "@/lib/ticket-types";

/** Shape used by ticket tables after mapping from API JSON. */
export type SerializedTicket = {
  id: string;
  ticketCode: string | null;
  title: string;
  description: string;
  category: string;
  status: TicketStatus;
  priority: TicketPriority;
  progress: number;
  deadline: string | null;
  isOverdue: boolean;
  locationId: string;
  locationName: string | null;
  createdBy: string;
  createdByName?: string;
  assignedTo: string | null;
  assignedToName?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  isNew: boolean;
};
