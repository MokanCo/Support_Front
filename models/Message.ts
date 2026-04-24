import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const messageSchema = new Schema(
  {
    ticketId: {
      type: Schema.Types.ObjectId,
      ref: "Ticket",
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: { type: String, required: true, trim: true, maxlength: 10000 },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

messageSchema.index({ ticketId: 1, createdAt: 1 });

export type MessageDoc = InferSchemaType<typeof messageSchema> & {
  _id: mongoose.Types.ObjectId;
};

export type MessageModel = Model<MessageDoc>;

const Message =
  (mongoose.models.Message as MessageModel | undefined) ??
  mongoose.model<MessageDoc>("Message", messageSchema);

export default Message;
