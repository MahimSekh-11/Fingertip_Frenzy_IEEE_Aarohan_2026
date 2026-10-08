import { resolve } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { runInNewContext } from "node:vm";
import { MongoMemoryReplSet } from "mongodb-memory-server-core";
import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables if available
dotenv.config({ path: resolve("backend/.env") });
dotenv.config({ path: resolve(".env") });

process.env.NODE_ENV = process.env.NODE_ENV || "development";
process.env.APP_ORIGIN = process.env.APP_ORIGIN || "http://127.0.0.1:5173";
const BACKEND_PORT = Number(process.env.PORT || 5000);
const FRONTEND_PORT = 5173;

let mongo = null;

if (!process.env.MONGODB_URI) {
  console.log("⚡ Starting local in-memory MongoDB replica set...");
  mongo = await MongoMemoryReplSet.create({
    binary: { downloadDir: resolve(".cache/mongodb") },
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  process.env.MONGODB_URI = mongo.getUri("aarohan_dev");
  console.log("✅ Local MongoDB replica set active.");
} else {
  console.log("🔗 Using configured MONGODB_URI...");
}

const { connectDB } = await import("../backend/src/config/db.js");
const models = await import("../backend/src/models/index.js");
const { hashPassword } = await import("../backend/src/services/auth.js");
const { defaults } = await import("../backend/src/game-services/config.js");
const { cropPuzzle } = await import("../backend/src/services/images.js");
const { contentSchema } = await import("../backend/src/services/content.js");

await connectDB();

for (const m of Object.values(models)) {
  if (m.createCollection) {
    await m.createCollection().catch(() => {});
    await m.createIndexes().catch(() => {});
  }
}

// Seed Admin user if none exists
if (!(await models.User.exists({ role: "ADMIN" }))) {
  await models.User.create({
    name: "Event Administrator",
    email: "admin@aarohan.test",
    role: "ADMIN",
    passwordHash: hashPassword("admin1234567890!"),
  });
  console.log("👤 Default Administrator created: admin@aarohan.test / admin1234567890!");
}

// Seed a Demo Team if none exists
if (!(await models.Team.exists({}))) {
  const students = await models.User.create([
    {
      name: "Alex Leader",
      rollNo: "LEADER001",
      phoneNo: "9876543210",
      email: "leader@aarohan.test",
      role: "TEAM_LEADER",
    },
    {
      name: "Sam Member",
      rollNo: "MEMBER002",
      phoneNo: "9876543211",
      email: "sam@aarohan.test",
      role: "STUDENT",
    },
    {
      name: "Robin Member",
      rollNo: "MEMBER003",
      phoneNo: "9876543212",
      email: "robin@aarohan.test",
      role: "STUDENT",
    },
  ]);

  const team = await models.Team.create({
    name: "Aarohan Champions",
    code: "FF-CHAMP2026",
    leaderId: students[0]._id,
    memberIds: students.map((s) => s._id),
  });

  await models.User.updateMany(
    { _id: { $in: students.map((s) => s._id) } },
    { $set: { teamId: team._id } },
  );
  console.log("🏆 Demo Team created: 'Aarohan Champions' (Code: FF-CHAMP2026)");
}

// Seed Memory Game Settings
if (!(await models.GameSetting.exists({ gameId: "memory" }))) {
  const memory = structuredClone(defaults.memory);
  await models.GameSetting.create({ gameId: "memory", config: memory });
}

// Seed Puzzle Content if none exists
if (!(await models.Content.exists({ gameId: "puzzle" }))) {
  const pantherPath = resolve("vortex-main/client/public/panther.jpeg");
  if (existsSync(pantherPath)) {
    await mongoose.connection.transaction(async (tx) => {
      const bytes = readFileSync(pantherPath);
      const images = await cropPuzzle(
        "data:image/jpeg;base64," + bytes.toString("base64"),
        3,
        3,
        tx,
      );
      await models.Content.create(
        [
          {
            gameId: "puzzle",
            title: "Black Panther Formation",
            published: true,
            order: 0,
            data: {
              ...images,
              description: "Reconstruct the classic Black Panther image within the time limit.",
              hint: "Start with corner and edge pieces.",
              gridRows: 3,
              gridCols: 3,
              points: 100,
              timeLimitSeconds: 300,
            },
          },
        ],
        { session: tx },
      );
    });
    console.log("🧩 Puzzle round content seeded.");
  }
}

// Seed Detective Case if none exists
if (!(await models.Content.exists({ gameId: "detective" }))) {
  const detectivePath = resolve("vortex-main/server/src/services/detectiveService.js");
  if (existsSync(detectivePath)) {
    const source = readFileSync(detectivePath, "utf8");
    const constants = source.slice(
      source.indexOf("const DEFAULT_SEED_CASE"),
      source.indexOf("/**"),
    );
    const original = runInNewContext(
      constants +
        ";({c:DEFAULT_SEED_CASE,clues:DEFAULT_SEED_CLUES,questions:DEFAULT_SEED_QUESTIONS,hints:DEFAULT_SEED_HINTS})",
      {},
      { timeout: 1000 },
    );
    const pick = (row, keys) =>
      Object.fromEntries(
        keys.map((k) => [k, row[k]]).filter(([, v]) => v !== undefined),
      );
    const body = contentSchema("detective").parse({
      title: original.c.title,
      published: true,
      order: 0,
      data: {
        description: original.c.description,
        difficulty: original.c.difficulty,
        suspects: [],
        clues: original.clues.map((c) => ({
          id: c._id,
          ...pick(c, ["title", "description", "evidence", "evidenceType"]),
        })),
        questions: original.questions.map((q) => ({
          id: q._id,
          ...pick(q, ["question", "options", "correctAnswerIndex", "points"]),
          clueId: q.clueId,
        })),
        hints: original.hints.map((h) => ({
          id: h._id,
          ...pick(h, ["questionId", "hintText", "penalty", "enabled"]),
        })),
      },
    });
    await models.Content.create({ gameId: "detective", ...body });
    console.log("🔍 Detective round case seeded.");
  }
}

// Start backend Express server
const { app } = await import("../backend/src/app.js");
const server = app.listen(BACKEND_PORT, () => {
  console.log(`🚀 Backend API listening at: http://127.0.0.1:${BACKEND_PORT}`);
});

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const viteBin = resolve(require.resolve("vite/package.json"), "../bin/vite.js");

// Start Vite frontend
console.log("🎨 Starting Frontend Vite Server...");
const viteProcess = spawn(
  process.execPath,
  [viteBin, "--host", "127.0.0.1", "--port", String(FRONTEND_PORT)],
  {
    cwd: resolve("frontend"),
    stdio: "inherit",
    env: { ...process.env, FF_API_PROXY: `http://127.0.0.1:${BACKEND_PORT}` },
  },
);

console.log("\n=======================================================");
console.log("🎉 FINGERTIP FRENZY IS RUNNING SUCCESSFULLY!");
console.log("=======================================================");
console.log(`🌐 Frontend App:     http://127.0.0.1:${FRONTEND_PORT}`);
console.log(`🔌 Backend API:      http://127.0.0.1:${BACKEND_PORT}`);
console.log(`🩺 Health Live:      http://127.0.0.1:${BACKEND_PORT}/api/health/live`);
console.log(`🩺 Health Ready:     http://127.0.0.1:${BACKEND_PORT}/api/health`);
console.log("-------------------------------------------------------");
console.log("🔑 PRE-CONFIGURED CREDENTIALS:");
console.log("  • Admin Portal:    http://127.0.0.1:5173/admin/login");
console.log("    Email:           admin@aarohan.test");
console.log("    Password:        admin1234567890!");
console.log("  • Participant Login: http://127.0.0.1:5173/login");
console.log("    Team Code:       FF-CHAMP2026");
console.log("    Leader Email:    leader@aarohan.test (Roll: LEADER001, Phone: 9876543210)");
console.log("    Member 1:        sam@aarohan.test    (Roll: MEMBER002, Phone: 9876543211)");
console.log("    Member 2:        robin@aarohan.test  (Roll: MEMBER003, Phone: 9876543212)");
console.log("=======================================================\n");

async function cleanup() {
  console.log("\nShutting down Fingertip Frenzy servers...");
  viteProcess.kill();
  server.close();
  await mongoose.disconnect().catch(() => {});
  if (mongo) {
    await mongo.stop().catch(() => {});
  }
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
