import { z } from "zod";
import { USER_ROLES } from "@/models/User";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "@/models/Ticket";

export const loginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(200),
});

const optionalEmail = z
  .union([z.string().email().max(320), z.literal("")])
  .optional()
  .transform((v) => (v === "" ? undefined : v));

export const locationCreateSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  email: optionalEmail,
  phone: z.string().max(50).trim().optional(),
  address: z.string().max(500).trim().optional(),
});

export const locationPatchSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  email: optionalEmail,
  phone: z.string().max(50).trim().optional(),
  address: z.string().max(500).trim().optional(),
});

export const userCreateSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  email: z.string().email().max(320),
  password: z.string().min(8).max(200),
  role: z.enum(USER_ROLES),
  locationId: z.string().length(24),
});

export const userPatchSchema = z.object({
  role: z.enum(USER_ROLES).optional(),
  locationId: z.string().length(24).optional(),
});

export const ticketCreateSchema = z.object({
  title: z.string().min(1).max(500).trim(),
  description: z.string().min(1).max(20000).trim(),
  category: z.string().min(1).max(100).trim(),
  locationId: z.string().length(24).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  deadline: z.union([z.coerce.date(), z.null()]).optional(),
});

export const ticketPatchSchema = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
  assignedTo: z.string().length(24).nullable().optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  deadline: z.coerce.date().nullable().optional(),
  progress: z.coerce.number().min(0).max(100).optional(),
});

export const ticketBulkSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("delete"),
    ids: z.array(z.string().min(1)).min(1).max(100),
  }),
  z.object({
    action: z.literal("status"),
    ids: z.array(z.string().min(1)).min(1).max(100),
    status: z.enum(TICKET_STATUSES),
  }),
  z.object({
    action: z.literal("priority"),
    ids: z.array(z.string().min(1)).min(1).max(100),
    priority: z.enum(TICKET_PRIORITIES),
  }),
]);

export const locationBulkSchema = z.object({
  ids: z.array(z.string().length(24)).min(1).max(50),
});

export const reportPeriodSchema = z.enum(["daily", "monthly", "yearly"]);

export const messageCreateSchema = z.object({
  ticketId: z.string().min(1).max(64),
  text: z.string().min(1).max(10000).trim(),
});

export const messageMarkReadSchema = z.object({
  ticketId: z.string().min(1).max(64),
});
