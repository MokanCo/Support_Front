import mongoose from "mongoose";
import Message from "@/models/Message";
import TicketMessageRead from "@/models/TicketMessageRead";

export async function getLastReadAt(
  userId: string,
  ticketId: mongoose.Types.ObjectId
): Promise<Date> {
  const row = await TicketMessageRead.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    ticketId,
  })
    .select("lastReadAt")
    .lean();
  return row?.lastReadAt ?? new Date(0);
}

export async function countUnreadMessages(
  viewerUserId: string,
  ticketId: mongoose.Types.ObjectId
): Promise<number> {
  const since = await getLastReadAt(viewerUserId, ticketId);
  const viewerOid = new mongoose.Types.ObjectId(viewerUserId);
  return Message.countDocuments({
    ticketId,
    senderId: { $ne: viewerOid },
    createdAt: { $gt: since },
  });
}

export async function latestUnreadPreview(
  viewerUserId: string,
  ticketId: mongoose.Types.ObjectId
): Promise<string | null> {
  const since = await getLastReadAt(viewerUserId, ticketId);
  const viewerOid = new mongoose.Types.ObjectId(viewerUserId);
  const doc = await Message.findOne({
    ticketId,
    senderId: { $ne: viewerOid },
    createdAt: { $gt: since },
  })
    .sort({ createdAt: -1 })
    .select("text")
    .lean();
  return doc?.text ?? null;
}

export async function markTicketRead(
  userId: string,
  ticketId: mongoose.Types.ObjectId
): Promise<void> {
  const now = new Date();
  await TicketMessageRead.findOneAndUpdate(
    { userId: new mongoose.Types.ObjectId(userId), ticketId },
    { $set: { lastReadAt: now } },
    { upsert: true, new: true }
  );
}
