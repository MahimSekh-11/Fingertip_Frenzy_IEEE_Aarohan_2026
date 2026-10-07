import dotenv from "dotenv";
import { resolve } from "node:path";
// Load backend configuration first; retain root configuration as a fallback.
dotenv.config({ path: resolve(import.meta.dirname, "../../.env") });
dotenv.config({ path: resolve(import.meta.dirname, "../../../.env") });
import mongoose from "mongoose";
mongoose.set("bufferCommands", false);
let pending;
const databaseError = (code) =>
  Object.assign(
    new Error(
      "The database is unavailable. Please contact the event organizers.",
    ),
    {
      status: 503,
      publicCode: code,
    },
  );

// Inspect driver error codes only. Raw driver messages can contain credentials.
function connectionErrorCode(error) {
  const errors = [error, error?.cause, error?.reason];
  for (const server of error?.reason?.servers?.values?.() || [])
    errors.push(server.error, server.error?.cause);
  if (errors.some((e) => e?.code === 18)) return "DATABASE_AUTH_FAILED";
  if (errors.some((e) => e?.name === "MongoParseError"))
    return "DATABASE_CONFIGURATION_INVALID";
  if (
    errors.some((e) =>
      ["ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED", "ETIMEDOUT"].includes(e?.code),
    )
  )
    return "DATABASE_NETWORK_ERROR";
  return "DATABASE_UNAVAILABLE";
}

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) throw databaseError("DATABASE_CONFIGURATION_MISSING");
  if (!/^mongodb(?:\+srv)?:\/\//.test(uri))
    throw databaseError("DATABASE_CONFIGURATION_INVALID");
  if (!pending)
    pending = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 8000,
        maxPoolSize: 10,
      })
      .catch((e) => {
        throw databaseError(connectionErrorCode(e));
      })
      .finally(() => {
        // Cache only an in-flight connection, not a forever-resolved promise.
        // A warm function must reconnect after a dropped database connection.
        pending = null;
      });
  await pending;
}
export const transaction = (fn) => mongoose.connection.transaction(fn);
