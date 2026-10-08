import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../backend/src/config/db.js";
import * as models from "../backend/src/models/index.js";
await connectDB();
for (const model of Object.values(models)) await model.createIndexes();
console.log(
  "Platform indexes created/verified. No indexes or records removed.",
);
await mongoose.disconnect();
