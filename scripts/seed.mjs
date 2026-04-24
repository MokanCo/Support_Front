/**
 * Seed demo data. Requires MONGODB_URI and JWT_SECRET in environment.
 * Run: npm run seed
 * Loads .env.local if present (no dotenv dependency).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env.local");

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(envPath);

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI. Set it in .env.local or the environment.");
  process.exit(1);
}

const locationSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);
const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true, lowercase: true, trim: true },
    password: { type: String, select: false },
    role: { type: String, enum: ["admin", "support", "partner"] },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
    },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);
const Location =
  mongoose.models.Location ||
  mongoose.model("Location", locationSchema, "organizations");
const User =
  mongoose.models.User || mongoose.model("User", userSchema);

async function main() {
  await mongoose.connect(MONGODB_URI);

  await Location.deleteMany({ name: "Demo Franchise" });
  await User.deleteMany({
    email: {
      $in: ["admin@mokanco.com", "support@mokanco.com", "partner@mokanco.com"],
    },
  });

  const loc = await Location.create({
    name: "Demo Franchise",
    email: "hq@mokanco.com",
    phone: "+1 (555) 010-0000",
    address: "100 Market St, San Francisco, CA",
  });
  const hash = await bcrypt.hash("password123", 12);

  await User.create([
    {
      name: "Demo Admin",
      email: "admin@mokanco.com",
      password: hash,
      role: "admin",
      organizationId: loc._id,
    },
    {
      name: "Demo Support",
      email: "support@mokanco.com",
      password: hash,
      role: "support",
      organizationId: loc._id,
    },
    {
      name: "Demo Partner",
      email: "partner@mokanco.com",
      password: hash,
      role: "partner",
      organizationId: loc._id,
    },
  ]);

  console.log("Seed complete.");
  console.log("Location: Demo Franchise");
  console.log("Users (password: password123):");
  console.log("  admin@mokanco.com (admin)");
  console.log("  support@mokanco.com (support)");
  console.log("  partner@mokanco.com (partner)");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
