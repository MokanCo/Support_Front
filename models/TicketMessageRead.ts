import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ticketMessageReadSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    ticketId: {
      type: Schema.Types.ObjectId,
      ref: "Ticket",
      required: true,
      index: true,
    },
    lastReadAt: { type: Date, required: true },
  },
  { versionKey: false }
);

ticketMessageReadSchema.index({ userId: 1, ticketId: 1 }, { unique: true });

export type TicketMessageReadDoc = InferSchemaType<typeof ticketMessageReadSchema> & {
  _id: mongoose.Types.ObjectId;
};

export type TicketMessageReadModel = Model<TicketMessageReadDoc>;

const TicketMessageRead =
  (mongoose.models.TicketMessageRead as TicketMessageReadModel | undefined) ??
  mongoose.model<TicketMessageReadDoc>("TicketMessageRead", ticketMessageReadSchema);

export default TicketMessageRead;
