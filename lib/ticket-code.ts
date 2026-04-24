import { connectDb } from "@/lib/db";
import Counter from "@/models/Counter";

const COUNTER_ID = "ticket";

export async function getNextTicketCode(): Promise<string> {
  await connectDb();
  const doc = await Counter.findOneAndUpdate(
    { _id: COUNTER_ID },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  const n = doc?.seq ?? 1;
  return `MK-${String(n).padStart(4, "0")}`;
}
