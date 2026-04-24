import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const TICKET_STATUSES = [
  "in_queue",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

const ticketSchema = new Schema(
  {
    ticketCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      maxlength: 32,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 500 },
    description: { type: String, required: true, trim: true, maxlength: 20000 },
    category: { type: String, required: true, trim: true, maxlength: 100 },
    status: {
      type: String,
      enum: TICKET_STATUSES,
      default: "in_queue",
      index: true,
    },
    priority: {
      type: String,
      enum: TICKET_PRIORITIES,
      default: "medium",
      index: true,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      index: true,
    },
    deadline: { type: Date, default: null },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Location",
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

ticketSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export type TicketDoc = InferSchemaType<typeof ticketSchema> & {
  _id: mongoose.Types.ObjectId;
};

export type TicketModel = Model<TicketDoc>;

const Ticket =
  (mongoose.models.Ticket as TicketModel | undefined) ??
  mongoose.model<TicketDoc>("Ticket", ticketSchema);

export default Ticket;
