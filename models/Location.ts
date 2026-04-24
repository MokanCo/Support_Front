import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/** Persists to the existing `organizations` collection for compatibility. */
const locationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    email: { type: String, trim: true, maxlength: 320, default: "" },
    phone: { type: String, trim: true, maxlength: 50, default: "" },
    address: { type: String, trim: true, maxlength: 500, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export type LocationDoc = InferSchemaType<typeof locationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export type LocationModel = Model<LocationDoc>;

const Location =
  (mongoose.models.Location as LocationModel | undefined) ??
  mongoose.model<LocationDoc>("Location", locationSchema, "organizations");

export default Location;
