import mongoose from "mongoose";
import Ticket from "@/models/Ticket";
import type { JwtPayload } from "@/lib/types";

function getOrgIdFromTicket(ticket: { organizationId: unknown }): string {
  const oid = ticket.organizationId;
  if (oid && typeof oid === "object" && "_id" in oid) {
    return (oid as { _id: mongoose.Types.ObjectId })._id.toString();
  }
  if (oid instanceof mongoose.Types.ObjectId) return oid.toString();
  return String(oid);
}

function getAssignedToString(ticket: { assignedTo?: unknown }): string | null {
  const a = ticket.assignedTo;
  if (a == null) return null;
  if (a instanceof mongoose.Types.ObjectId) return a.toString();
  if (typeof a === "object" && "_id" in (a as object)) {
    return String((a as { _id: mongoose.Types.ObjectId })._id);
  }
  return String(a);
}

export async function getTicketByIdForUser(
  ticketId: string,
  session: JwtPayload
) {
  let ticket = null;
  if (mongoose.Types.ObjectId.isValid(ticketId) && ticketId.length === 24) {
    ticket = await Ticket.findById(ticketId)
      .populate("organizationId", "name")
      .lean();
  }
  if (!ticket) {
    ticket = await Ticket.findOne({ ticketCode: ticketId })
      .populate("organizationId", "name")
      .lean();
  }
  if (!ticket) return null;

  if (session.role === "admin") {
    return ticket;
  }

  if (session.role === "support") {
    const assigned = getAssignedToString(ticket);
    if (!assigned || assigned !== session.sub) return null;
    return ticket;
  }

  if (getOrgIdFromTicket(ticket) !== session.organizationId) {
    return null;
  }

  return ticket;
}

export function canPartnerMutateTicket(
  session: JwtPayload,
  ticketOrgId: string
): boolean {
  return (
    session.role === "partner" &&
    ticketOrgId === session.organizationId
  );
}
