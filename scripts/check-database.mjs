import mongoose from "mongoose";
import { connectDB, connectionErrorCode } from "../backend/src/config/db.js";

// Read-only diagnostics: no collections, indexes or participant records change.
try {
  await connectDB();
  await mongoose.connection.db.command({ ping: 1 });
  const topology = await mongoose.connection.db.command({ hello: 1 });
  const transactionsSupported = Boolean(
    topology.setName || topology.msg === "isdbgrid",
  );
  console.log(
    JSON.stringify({
      status: "ok",
      database: "connected",
      transactionsSupported,
    }),
  );
  if (!transactionsSupported) process.exitCode = 1;
} catch (error) {
  console.error(
    JSON.stringify({
      status: "unavailable",
      code: error.publicCode || connectionErrorCode(error),
    }),
  );
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
