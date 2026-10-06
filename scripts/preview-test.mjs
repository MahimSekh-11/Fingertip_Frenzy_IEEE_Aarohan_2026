import { resolve } from "node:path";
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { MongoMemoryReplSet } from "mongodb-memory-server-core";
import mongoose from "mongoose";
import { connectDB } from "../backend/src/config/db.js";
import * as models from "../backend/src/models/index.js";
import { hashPassword } from "../backend/src/services/auth.js";
import { defaults } from "../backend/src/game-services/config.js";
import { cropPuzzle } from "../backend/src/services/images.js";
import { contentSchema } from "../backend/src/services/content.js";
// Explicitly isolated UI verification fixture. Never uses MONGODB_URI from the user's env.
process.env.NODE_ENV = "test";
process.env.APP_ORIGIN = process.env.FF_TEST_ORIGIN || "http://127.0.0.1:5190";
const mongo = await MongoMemoryReplSet.create({
  binary: { downloadDir: resolve(".cache/mongodb") },
  replSet: { count: 1, storageEngine: "wiredTiger" },
});
process.env.MONGODB_URI = mongo.getUri("aarohan_ui_test");
const runtimeFile = resolve(".cache/preview-runtime.json");
if (process.env.FF_TEST_EXPORT_ENV === "1")
  writeFileSync(
    runtimeFile,
    JSON.stringify({
      MONGODB_URI: process.env.MONGODB_URI,
      APP_ORIGIN: process.env.APP_ORIGIN,
      NODE_ENV: "test",
    }),
  );
await connectDB();
for (const m of Object.values(models)) {
  await m.createCollection();
  await m.createIndexes();
}
await models.User.create({
  name: "Preview Administrator",
  email: "preview-admin@example.test",
  role: "ADMIN",
  passwordHash: hashPassword("preview-only-password-123"),
});
const memory = structuredClone(defaults.memory);
for (const stage of Object.values(memory.stages)) {
  stage.numbersCount = 2;
  stage.displayIntervalSeconds = 0.5;
  stage.responseIntervalSeconds = 2;
}
await models.GameSetting.create({ gameId: "memory", config: memory });
await mongoose.connection.transaction(async (tx) => {
  const bytes = readFileSync("vortex-main/client/public/panther.jpeg");
  const images = await cropPuzzle(
    "data:image/jpeg;base64," + bytes.toString("base64"),
    2,
    2,
    tx,
  );
  await models.Content.create(
    [
      {
        gameId: "puzzle",
        title: "Original Vortex asset Â· UI test",
        published: true,
        order: 0,
        data: {
          ...images,
          description:
            "Isolated test challenge using the original Vortex asset",
          hint: "Reconstruct the original image.",
          gridRows: 2,
          gridCols: 2,
          points: 100,
          timeLimitSeconds: 300,
        },
      },
    ],
    { session: tx },
  );
});
const source = readFileSync(
  "vortex-main/server/src/services/detectiveService.js",
  "utf8",
);
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
const { app } = await import("../backend/src/app.js");
const server = app.listen(Number(process.env.FF_TEST_PORT || 5090), () =>
  console.log(
    "Isolated UI test API ready. Test fixtures remain in a temporary database.",
  ),
);
async function close() {
  server.close();
  await mongoose.disconnect();
  await mongo.stop();
  if (process.env.FF_TEST_EXPORT_ENV === "1" && existsSync(runtimeFile))
    unlinkSync(runtimeFile);
  process.exit(0);
}
process.on("SIGINT", close);
process.on("SIGTERM", close);
