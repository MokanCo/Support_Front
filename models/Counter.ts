import mongoose, { Schema, type Model } from "mongoose";

const counterSchema = new Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false }
);

export type CounterDoc = { _id: string; seq: number };

const Counter =
  (mongoose.models.Counter as Model<CounterDoc> | undefined) ??
  mongoose.model<CounterDoc>("Counter", counterSchema);

export default Counter;
