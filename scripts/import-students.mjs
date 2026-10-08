import "dotenv/config";
import { readFileSync } from "node:fs";
import mongoose from "mongoose";
import { connectDB } from "../backend/src/config/db.js";
import { User } from "../backend/src/models/index.js";
import { student } from "../backend/src/services/validation.js";
const file = process.argv.find((v, i) => i > 1 && !v.startsWith("--"));
if (!file)
  throw new Error("Usage: npm run import:students -- students.json [--apply]");
const rows = JSON.parse(readFileSync(file, "utf8"));
if (!Array.isArray(rows)) throw new Error("Input must be a JSON array.");
const parsed = rows.map((r) => student.parse(r));
const rolls = new Set(),
  phones = new Set();
for (const row of parsed) {
  if (rolls.has(row.rollNo) || phones.has(row.phoneNo))
    throw new Error("Duplicate roll or phone in input. Import refused.");
  rolls.add(row.rollNo);
  phones.add(row.phoneNo);
}
if (!process.argv.includes("--apply")) {
  console.log(
    `${parsed.length} valid student records. Dry run; no database writes. Add --apply to import.`,
  );
  process.exit(0);
}
await connectDB();
await mongoose.connection.transaction(async (session) => {
  for (const row of parsed) {
    const existing = await User.findOne({
      $or: [{ rollNo: row.rollNo }, { phoneNo: row.phoneNo }],
    }).session(session);
    if (existing) {
      if (existing.rollNo !== row.rollNo || existing.phoneNo !== row.phoneNo)
        throw new Error(
          "Existing student conflict. Entire import rolled back.",
        );
      continue;
    }
    await User.create([row], { session });
  }
});
console.log(
  "Student import committed. Existing matching accounts were retained.",
);
await mongoose.disconnect();
