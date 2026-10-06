import dotenv from "dotenv";
import { resolve } from "node:path";
// Load backend configuration first; retain root configuration as a fallback.
dotenv.config({ path: resolve(import.meta.dirname, "../../.env") });
dotenv.config({ path: resolve(import.meta.dirname, "../../../.env") });
import mongoose from "mongoose";
mongoose.set("bufferCommands", false);
let pending;
export async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  if (!process.env.MONGODB_URI)
    throw Object.assign(new Error("Database is not configured."), {
      status: 503,
    });
  if (!pending)
    pending = mongoose
      .connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 8000,
        maxPoolSize: 10,
      })
      .catch((e) => {
        pending = null;
        throw e;
      });
  await pending;
}
export const transaction = (fn) => mongoose.connection.transaction(fn);
