/**
 * Seed script — run once to create the admin account.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/seed.ts
 *
 * Reads credentials from .env (ADMIN_LOGIN, ADMIN_PASSWORD).
 * Safe to re-run — skips if an admin already exists.
 */

import * as bcrypt from "bcrypt";
import * as dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI ?? "mongodb://localhost:27017/grade_manager";
const ADMIN_LOGIN = process.env.ADMIN_LOGIN ?? "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Admin1234!";
const SALT_ROUNDS = 12;

const UserSchema = new mongoose.Schema(
  {
    login: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true },
    profileId: { type: mongoose.Schema.Types.ObjectId, default: null },
    isApproved: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "users" },
);

async function seed() {
  console.log("Connecting to MongoDB…");
  await mongoose.connect(MONGODB_URI);

  const User = mongoose.model("User", UserSchema);

  const existing = await User.findOne({ role: "admin" }).lean();
  if (existing) {
    console.log("Admin already exists — skipping.");
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);

  await User.create({
    login: ADMIN_LOGIN,
    passwordHash,
    role: "admin",
    profileId: null,
    isApproved: true,
  });

  console.log(`Admin created — login: "${ADMIN_LOGIN}"`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
