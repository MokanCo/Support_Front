import mongoose from "mongoose";
import type { TicketPriority, TicketStatus } from "@/models/Ticket";

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

function locationFromPopulated(
  organizationId: unknown
): { id: string; name: string | null } {
  if (
    organizationId &&
    typeof organizationId === "object" &&
    "_id" in organizationId
  ) {
    const o = organizationId as { _id: mongoose.Types.ObjectId; name?: string };
    return { id: o._id.toString(), name: o.name ?? null };
  }
  return {
    id: String(organizationId),
    name: null,
  };
}

function isOverdueTicket(
  deadline: Date | string | null | undefined,
  status: TicketStatus
): boolean {
  if (!deadline) return false;
  if (status === "completed" || status === "cancelled") return false;
  return new Date(deadline).getTime() < Date.now();
}

export function serializeTicketLean(
  t: Record<string, unknown> & {
    _id: mongoose.Types.ObjectId;
    organizationId: unknown;
    createdBy: mongoose.Types.ObjectId;
    assignedTo?: mongoose.Types.ObjectId | null;
    title: string;
    description: string;
    category: string;
    status: TicketStatus;
    priority?: TicketPriority;
    progress?: number;
    deadline?: Date | null;
    ticketCode?: string | null;
    createdAt: Date;
    updatedAt: Date;
  },
  extras?: { createdByName?: string; assignedToName?: string | null }
): SerializedTicket {
  const loc = locationFromPopulated(t.organizationId);
  const created = new Date(t.createdAt).getTime();
  const isNew = Date.now() - created < 24 * 60 * 60 * 1000;
  const deadline = t.deadline ? new Date(t.deadline).toISOString() : null;

  return {
    id: t._id.toString(),
    ticketCode: t.ticketCode ?? null,
    title: t.title,
    description: t.description,
    category: t.category,
    status: t.status,
    priority: (t.priority as TicketPriority | undefined) ?? "medium",
    progress: typeof t.progress === "number" ? t.progress : 0,
    deadline,
    isOverdue: isOverdueTicket(t.deadline ?? null, t.status),
    locationId: loc.id,
    locationName: loc.name,
    createdBy: t.createdBy.toString(),
    assignedTo: t.assignedTo ? t.assignedTo.toString() : null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    isNew,
    ...extras,
  };
}
