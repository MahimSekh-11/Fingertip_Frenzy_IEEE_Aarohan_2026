import "dotenv/config";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "../backend/src/config/db.js";
import { User, Audit } from "../backend/src/models/index.js";
import { hashPassword } from "../backend/src/services/auth.js";
const email = z.string().email().parse(process.env.ADMIN_EMAIL).toLowerCase();
const password = z.string().min(16).max(128).parse(process.env.ADMIN_PASSWORD);
await connectDB();
if (await User.exists({ role: "ADMIN" }))
  throw new Error("An administrator already exists. Bootstrap refused.");
await mongoose.connection.transaction(async (session) => {
  const [admin] = await User.create(
    [
      {
        name: "Event Administrator",
        email,
        role: "ADMIN",
        passwordHash: hashPassword(password),
      },
    ],
    { session },
  );
  await Audit.create(
    [
      {
        adminId: admin._id,
        action: "BOOTSTRAP_ADMIN",
        entityType: "User",
        entityId: String(admin._id),
        newValue: { role: "ADMIN" },
      },
    ],
    { session },
  );
});
console.log(
  "First administrator created. Remove ADMIN_PASSWORD from the environment.",
);
await mongoose.disconnect();
