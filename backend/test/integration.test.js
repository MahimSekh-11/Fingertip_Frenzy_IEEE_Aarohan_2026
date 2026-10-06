import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server-core";
import supertest from "supertest";
import sharp from "sharp";
import { app } from "../src/app.js";
import * as models from "../src/models/index.js";
import { connectDB } from "../src/config/db.js";
import { hashPassword } from "../src/services/auth.js";
import { satisfies } from "../src/game-services/calculator.js";
let mongo, admin, players, team;
const origin = "http://localhost:5173";
const call = (agent, method, path, body) =>
  agent[method]("/api" + path)
    .set("Origin", origin)
    .send(body);
before(
  async () => {
    process.env.APP_ORIGIN = origin;
    process.env.NODE_ENV = "test";
    process.env.MONGOMS_DOWNLOAD_DIR = resolve(".cache/mongodb");
    mongo = await MongoMemoryReplSet.create({
      binary: { downloadDir: resolve(".cache/mongodb") },
      replSet: { count: 1, storageEngine: "wiredTiger" },
    });
    process.env.MONGODB_URI = mongo.getUri("aarohan_test");
    await connectDB();
    for (const m of Object.values(models)) {
      await m.createCollection();
      await m.createIndexes();
    }
    admin = supertest.agent(app);
    await models.User.create({
      name: "Test Administrator",
      email: "test-admin@example.test",
      role: "ADMIN",
      passwordHash: hashPassword("test-only-password-123"),
    });
    players = Array.from({ length: 4 }, () => supertest.agent(app));
    const r = await call(admin, "post", "/auth/admin/login", {
      email: "test-admin@example.test",
      password: "test-only-password-123",
    });
    assert.equal(r.status, 200);
  },
  { timeout: 1200000 },
);
after(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

const identity = (i) => ({
  name: "Test Student " + i,
  rollNo: "24CS10" + i,
  phoneNo: "987654320" + i,
  email: "student" + i + "@example.test",
});
let otherCode;
test("Leader registration creates unique team atomically; five-field login, logout and expiry", async () => {
  const registered = await call(players[0], "post", "/auth/register", {
    ...identity(0),
    teamName: "Integration Team",
  });
  assert.equal(registered.status, 201);
  assert.match(registered.body.team.code, /^FF-[A-F0-9]{12}$/);
  team = registered.body.team;
  assert.equal(
    (
      await call(players[0], "post", "/auth/register", {
        ...identity(0),
        teamName: "Duplicate",
      })
    ).status,
    409,
  );
  assert.equal(await models.Team.countDocuments({ name: "Duplicate" }), 0);
  assert.equal(
    (
      await call(players[0], "post", "/auth/login", {
        ...identity(0),
        teamCode: team.code,
        email: "wrong@example.test",
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await call(players[0], "post", "/auth/login", {
        rollNo: identity(0).rollNo,
        phoneNo: identity(0).phoneNo,
      })
    ).status,
    400,
  );
  const login = await call(players[0], "post", "/auth/login", {
    ...identity(0),
    teamCode: team.code,
  });
  assert.equal(login.status, 200);
  assert.equal(login.body.user.role, "TEAM_LEADER");
  assert.match(login.headers["set-cookie"][0], /HttpOnly/);
  assert.ok(!login.body.token);
  team = (await players[0].get("/api/teams/me")).body.team;
  assert.equal(
    (
      await supertest(app)
        .post("/api/auth/register")
        .send({ ...identity(4), teamName: "Origin blocked" })
    ).status,
    403,
  );
  assert.equal((await players[0].get("/api/admin/teams")).status, 403);
  const other = await call(players[3], "post", "/auth/register", {
    ...identity(3),
    teamName: "Other Team",
  });
  assert.equal(other.status, 201);
  otherCode = other.body.team.code;
  await call(players[3], "post", "/auth/login", {
    ...identity(3),
    teamCode: otherCode,
  });
  await call(players[3], "post", "/auth/logout", {});
  assert.equal((await players[3].get("/api/auth/me")).status, 401);
  await call(players[3], "post", "/auth/login", {
    ...identity(3),
    teamCode: otherCode,
  });
  const u = await models.User.findOne({ rollNo: identity(3).rollNo });
  await models.AuthSession.updateMany(
    { userId: u._id },
    { $set: { expiresAt: new Date(0) } },
  );
  assert.equal((await players[3].get("/api/auth/me")).status, 401);
  await call(players[3], "post", "/auth/login", {
    ...identity(3),
    teamCode: otherCode,
  });
});
test("Teammates join only through full login; membership, capacity and roster locks hold", async () => {
  assert.equal(
    (await call(players[0], "post", "/teams", { name: "Bypass" })).status,
    410,
  );
  assert.equal(
    (
      await call(players[1], "post", "/auth/login", {
        ...identity(1),
        teamCode: "FF-000000000000",
      })
    ).status,
    401,
  );
  assert.equal(
    await models.User.countDocuments({ rollNo: identity(1).rollNo }),
    0,
  );
  for (let i = 1; i <= 2; i++)
    assert.equal(
      (
        await call(players[i], "post", "/auth/login", {
          ...identity(i),
          teamCode: team.code,
        })
      ).status,
      200,
    );
  assert.equal(
    (
      await call(supertest.agent(app), "post", "/auth/login", {
        ...identity(4),
        teamCode: team.code,
      })
    ).status,
    409,
  );
  assert.equal(
    await models.User.countDocuments({ rollNo: identity(4).rollNo }),
    0,
  );
  assert.equal(
    (
      await call(players[3], "post", "/auth/login", {
        ...identity(3),
        teamCode: team.code,
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await call(players[1], "patch", "/teams/me", {
        name: "Unauthorized rename",
      })
    ).status,
    403,
  );
  assert.equal(
    (await players[0].get("/api/teams/me")).body.team.members.length,
    3,
  );
  const rounds = (await players[0].get("/api/games")).body.games;
  assert.equal(
    (await call(players[0], "patch", "/teams/me", { name: "Leader rename" }))
      .status,
    403,
  );
  assert.deepEqual(
    rounds.map((round) => round.id),
    ["puzzle", "detective", "calculator", "memory"],
  );
  assert.deepEqual(
    rounds.map((round) => round.locked),
    [false, true, true, true],
  );
  assert.equal(
    (await call(players[0], "post", "/games/memory/start", {})).status,
    403,
  );
});
test("Original Puzzle mechanics, server-side answer check, single completion and replay guard", async () => {
  const pieces = [0, 1, 2, 3].map((i) => ({
    pieceId: `piece${i}`,
    imageUrl: `https://example.test/${i}.png`,
  }));
  const r = await call(admin, "post", "/admin/games/puzzle/content", {
    title: "Test-only puzzle fixture",
    published: true,
    order: 0,
    data: {
      description: "Test fixture",
      imageUrl: "https://example.test/source.png",
      gridRows: 2,
      gridCols: 2,
      points: 100,
      timeLimitSeconds: 300,
      hint: "",
      pieces,
      correctOrder: pieces.map((p) => p.pieceId),
    },
  });
  assert.equal(r.status, 201);
  assert.equal(
    (await call(players[1], "post", "/v1/game/r1/start", {})).status,
    403,
  );
  assert.equal(
    (await call(players[0], "post", "/v1/game/r1/start", {})).status,
    200,
  );
  const state = await players[0].get("/api/v1/game/r1/state");
  assert.equal(state.status, 200);
  assert.equal(state.body.currentPuzzle.correctOrder, undefined);
  const body = {
    puzzleId: r.body._id,
    pieceOrder: pieces.map((p) => p.pieceId),
  };
  assert.equal(
    (
      await call(players[0], "post", "/v1/game/r1/submit", {
        ...body,
        pieceOrder: ["piece0", "piece0", "piece2", "piece3"],
      })
    ).status,
    400,
  );
  assert.equal(
    (await call(players[0], "post", "/v1/game/r1/submit", body)).body
      .isRoundCompleted,
    true,
  );
  assert.equal(
    (await call(players[0], "post", "/v1/game/r1/submit", body)).status,
    409,
  );
  assert.equal((await models.Result.findOne({ gameId: "puzzle" })).score, 100);
});
test("Detective hides answers/hints and rejects question replay and out-of-order answers", async () => {
  const r = await call(admin, "post", "/admin/games/detective/content", {
    title: "Test-only case fixture",
    published: true,
    order: 0,
    data: {
      description: "Test fixture",
      difficulty: "Medium",
      suspects: [],
      clues: [],
      questions: [
        {
          id: "q1",
          question: "Test question?",
          options: ["A", "B"],
          correctAnswerIndex: 1,
          points: 100,
        },
        {
          id: "q2",
          question: "Second?",
          options: ["A", "B"],
          correctAnswerIndex: 0,
          points: 100,
        },
      ],
      hints: [{ id: "h1", hintText: "Test hint", penalty: 20, enabled: true }],
    },
  });
  assert.equal(r.status, 201);
  const state = await players[0].get("/api/v1/detective/case");
  assert.equal(state.status, 200);
  assert.equal(state.body.questions[0].correctAnswerIndex, undefined);
  assert.equal(state.body.hints[0].hintText, undefined);
  assert.equal(
    (
      await call(players[0], "post", "/v1/detective/submit-answer", {
        questionId: "q2",
        selectedOptionIndex: 0,
      })
    ).status,
    409,
  );
  await call(players[0], "post", "/v1/detective/submit-answer", {
    questionId: "q1",
    selectedOptionIndex: 1,
  });
  const hint = await call(players[0], "post", "/v1/detective/use-hint", {
    hintId: "h1",
  });
  assert.equal(hint.body.currentScore, 80);
  assert.equal(
    (await call(players[0], "post", "/v1/detective/use-hint", { hintId: "h1" }))
      .body.currentScore,
    80,
  );
  assert.equal(
    (
      await call(players[0], "post", "/v1/detective/submit-answer", {
        questionId: "q1",
        selectedOptionIndex: 1,
      })
    ).status,
    409,
  );
  await call(players[0], "post", "/v1/detective/submit-answer", {
    questionId: "q2",
    selectedOptionIndex: 0,
  });
  assert.equal(
    (await models.Result.findOne({ gameId: "detective" })).score,
    180,
  );
});
test("Calculator shared team state and equation scoring are authoritative in MongoDB", async () => {
  let users = await models.User.find({ teamId: team._id }).sort({ rollNo: 1 });
  await call(players[0], "post", "/games/calculator/start", {});
  for (const player of players.slice(0, 3))
    assert.equal((await player.get("/api/games/calculator/state")).status, 200);
  assert.equal(
    (
      await call(players[0], "post", "/games/calculator/event", {
        type: "start",
      })
    ).status,
    200,
  );
  let doc = await models.GameSession.findOne({ gameId: "calculator" });
  doc.config.sequence = [1];
  doc.markModified("config");
  doc.state.phase = "PLAYING";
  doc.state.deadline = Date.now() + 40000;
  const q = doc.state.question;
  let answer;
  for (let x = 0; x < 10 && !answer; x++)
    for (let y = 0; y < 10 && !answer; y++)
      for (let z = 0; z < 10 && !answer; z++)
        if (satisfies(q, x, y, z)) answer = [x, y, z];
  assert.ok(answer);
  doc.state.values = Object.fromEntries(
    "XYZ".split("").map((k, i) => [k, answer[i]]),
  );
  doc.state.changed = Date.now() - 2000;
  doc.state.presence = Object.fromEntries(
    users.map((u) => [String(u._id), Date.now() + 10000]),
  );
  doc.markModified("state");
  await doc.save();
  const state = await players[0].get("/api/games/calculator/state");
  assert.equal(state.status, 200);
  assert.equal(state.body.phase, "FINISHED");
  assert.ok(
    (await models.Result.findOne({ gameId: "calculator" })).score >= 100,
  );
});
test("Memory uses server-owned sequences, validates time/order and records actual result", async () => {
  assert.equal(
    (await call(players[0], "post", "/games/memory/start", {})).status,
    200,
  );
  for (let stage = 1; stage <= 3; stage++) {
    const r = await call(players[0], "post", "/games/memory/stage/start", {
      stage,
    });
    assert.equal(r.status, 200);
    assert.equal(
      (
        await call(players[0], "post", "/games/memory/submit", {
          stage,
          digits: r.body.sequence,
          score: 9999,
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await call(players[0], "post", "/games/memory/submit", {
          stage,
          digits: r.body.sequence,
        })
      ).status,
      409,
    );
    assert.equal(
      (await call(players[0], "post", "/games/memory/stage/countdown", {}))
        .status,
      200,
    );
    const doc = await models.GameSession.findOne({ gameId: "memory" });
    doc.state.active.answerFrom = Date.now() - 100;
    doc.state.active.deadline = Date.now() + 10000;
    doc.markModified("state");
    await doc.save();
    assert.equal(
      (
        await call(players[0], "post", "/games/memory/submit", {
          stage,
          digits: r.body.sequence,
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await call(players[0], "post", "/games/memory/submit", {
          stage,
          digits: r.body.sequence,
        })
      ).status,
      409,
    );
  }
  const result = await models.Result.findOne({ gameId: "memory" });
  assert.equal(result.score, 22);
});
test("Global leaderboard aggregates all four games and manual edits are audited", async () => {
  const r = await players[0].get("/api/leaderboard");
  assert.equal(r.status, 200);
  assert.equal(r.body.rows.length, 2);
  assert.equal(Object.keys(r.body.rows[0].scores).length, 4);
  const result = await models.Result.findOne({ gameId: "puzzle" });
  assert.equal(
    (
      await call(players[0], "patch", `/admin/results/${result._id}`, {
        score: 50,
        reason: "Unauthorized attempt",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call(admin, "patch", `/admin/results/${result._id}`, {
        score: 9999,
        reason: "Invalid correction",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call(admin, "patch", `/admin/results/${result._id}`, {
        score: 50,
        reason: "Verified correction",
      })
    ).status,
    200,
  );
  const updated = await players[0].get("/api/leaderboard");
  assert.equal(updated.body.rows[0].scores.puzzle, 50);
  assert.ok(
    await models.Audit.exists({
      action: "CORRECT_RESULT",
      entityId: String(result._id),
    }),
  );
  assert.equal(
    (
      await call(admin, "patch", `/admin/teams/${team._id}`, {
        name: "Renamed Team",
      })
    ).status,
    400,
  );
  assert.equal(
    (await players[0].get("/api/leaderboard")).body.rows[0].name,
    "Integration Team",
  );
  assert.ok((await admin.get("/api/admin/dashboard")).body.submissions >= 4);
  for (const game of ["calculator", "memory", "puzzle", "detective"])
    assert.equal((await admin.get("/api/admin/games/" + game)).status, 200);
  const memoryAdmin = await admin.get("/api/admin/games/memory");
  assert.equal(memoryAdmin.body.sessions.rows[0].teamName, "Integration Team");
  assert.match(memoryAdmin.body.sessions.rows[0].userName, /Test Student/);
});

test("Simultaneous first logins cannot overfill a team", async () => {
  const leaderIdentity = {
    name: "Race Leader",
    rollNo: "RACE0",
    phoneNo: "9876500000",
    email: "race0@example.test",
  };
  const registered = await call(
    supertest.agent(app),
    "post",
    "/auth/register",
    { ...leaderIdentity, teamName: "Concurrency Team" },
  );
  assert.equal(registered.status, 201);
  const occupied = await models.Team.findOne({
    code: registered.body.team.code,
  });
  const filler = await models.User.create({
    name: "Race Filler",
    rollNo: "RACEF",
    phoneNo: "9876500009",
    email: "filler@example.test",
    teamId: occupied._id,
  });
  occupied.memberIds.push(filler._id);
  await occupied.save();
  const results = await Promise.all(
    [1, 2].map((i) =>
      call(supertest.agent(app), "post", "/auth/login", {
        teamCode: occupied.code,
        name: "Race Student " + i,
        rollNo: "RACE" + i,
        phoneNo: "987650000" + i,
        email: "race" + i + "@example.test",
      }),
    ),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  assert.equal((await models.Team.findById(occupied._id)).memberIds.length, 3);
});
test("Rank pagination and snapshot-specific Memory normalization remain stable", async () => {
  const members = await models.User.find({ teamId: team._id }).sort({
    rollNo: 1,
  });
  await models.Result.create({
    sessionId: new mongoose.Types.ObjectId(),
    teamId: team._id,
    userId: members[1]._id,
    gameId: "memory",
    score: 3,
    maximum: 6,
    completionTime: 10,
    attempt: 1,
    completedAt: new Date(),
  });
  const r = await players[0].get("/api/leaderboard?limit=1&page=1");
  assert.equal(r.status, 200);
  assert.equal(r.body.total, 3);
  assert.equal(r.body.rows[0].rank, 1);
  const existing = await models.Result.find({ teamId: team._id, valid: true });
  const expected =
    existing
      .filter((x) => x.gameId !== "memory")
      .reduce((n, x) => n + (x.score / x.maximum) * 250, 0) +
    ((1 + 0.5) / 3) * 250;
  assert.ok(Math.abs(r.body.rows[0].total - expected) < 0.02);
  const second = await players[0].get("/api/leaderboard?limit=1&page=2");
  assert.equal(second.body.rows[0].rank, 2);
  const search = await players[0].get("/api/leaderboard?search=Concurrency");
  assert.ok(search.body.rows[0].rank >= 2);
});

test("Puzzle image upload persists cropped assets and validates malformed data", async () => {
  const image = await sharp({
    create: { width: 96, height: 64, channels: 3, background: "#24689a" },
  })
    .png()
    .toBuffer();
  const body = {
    image: "data:image/png;base64," + image.toString("base64"),
    title: "Organizer upload test",
    gridRows: 2,
    gridCols: 3,
    points: 120,
  };
  assert.equal(
    (await call(players[0], "post", "/admin/games/puzzle/upload", body)).status,
    403,
  );
  assert.equal(
    (
      await call(admin, "post", "/admin/games/puzzle/upload", {
        ...body,
        image: "data:image/png;base64,bm90YW5pbWFnZQ==",
      })
    ).status,
    400,
  );
  const r = await call(admin, "post", "/admin/games/puzzle/upload", body);
  assert.equal(r.status, 201);
  const draft = await models.Content.findOne({ title: body.title });
  assert.ok(draft);
  assert.equal(draft.published, false);
  assert.equal(draft.data.pieces.length, 6);
  assert.equal(new Set(draft.data.correctOrder).size, 6);
  const asset = await supertest(app).get(draft.data.pieces[0].imageUrl);
  assert.equal(asset.status, 200);
  assert.match(asset.headers["content-type"], /image\/jpeg/);
  const metadata = await sharp(asset.body).metadata();
  assert.equal(metadata.width, 32);
  assert.equal(metadata.height, 32);
  assert.ok(await models.Audit.exists({ action: "UPLOAD_PUZZLE" }));
});

test("Admin reset invalidates an attempt and grants a retry only to its scope", async () => {
  const session = await models.GameSession.findOne({
    teamId: team._id,
    gameId: "memory",
  });
  const path = "/admin/games/memory/sessions/" + session._id + "/reset";
  assert.equal((await call(admin, "post", path, { reason: "x" })).status, 400);
  assert.equal(
    (
      await call(admin, "post", path, {
        reason: "Verified device interruption",
      })
    ).status,
    200,
  );
  assert.equal(
    (await models.Result.findOne({ sessionId: session._id })).valid,
    false,
  );
  const next = await call(players[0], "post", "/games/memory/start", {});
  assert.equal(next.status, 200);
  assert.equal(
    (await models.GameSession.findById(next.body.sessionId)).attempt,
    2,
  );
  assert.equal(
    (await models.GameSetting.findOne({ gameId: "memory" }))?.config
      .maxAttempts || 1,
    1,
  );
  assert.ok(
    await models.Audit.exists({
      action: "RESET_ATTEMPT",
      entityId: String(session._id),
    }),
  );
});

test("Admin manages identities and rosters, while team names remain immutable and deleted users lose access", async () => {
  const leader = supertest.agent(app),
    member = supertest.agent(app);
  leader.set("X-Forwarded-For", "192.0.2.105");
  member.set("X-Forwarded-For", "192.0.2.106");
  const registered = await call(leader, "post", "/auth/register", {
    ...identity(5),
    teamName: "Management Team",
  });
  assert.equal(registered.status, 201);
  const code = registered.body.team.code;
  assert.equal(
    (
      await call(leader, "post", "/auth/login", {
        ...identity(5),
        teamCode: code,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await call(member, "post", "/auth/login", {
        ...identity(6),
        teamCode: code,
      })
    ).status,
    200,
  );
  const managed = await models.Team.findOne({ code });
  const participant = await models.User.findOne({ rollNo: identity(6).rollNo });
  assert.equal(
    (
      await call(member, "delete", `/admin/teams/${managed._id}`, {
        confirm: true,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call(admin, "patch", `/admin/teams/${managed._id}`, {
        name: "Forbidden rename",
      })
    ).status,
    400,
  );
  managed.name = "Model bypass";
  await managed.save();
  assert.equal(
    (await models.Team.findById(managed._id)).name,
    "Management Team",
  );
  const updated = {
    name: "Corrected Member",
    rollNo: "CORRECTED6",
    phoneNo: identity(6).phoneNo,
    email: "corrected6@example.test",
  };
  assert.equal(
    (
      await call(admin, "patch", `/admin/students/${participant._id}`, {
        ...updated,
        email: " CORRECTED6@EXAMPLE.TEST ",
      })
    ).status,
    200,
  );
  assert.equal((await member.get("/api/auth/me")).status, 401);
  assert.equal(
    (
      await call(member, "post", "/auth/login", {
        ...identity(6),
        teamCode: code,
      })
    ).status,
    401,
  );
  assert.equal(
    (await call(member, "post", "/auth/login", { ...updated, teamCode: code }))
      .status,
    200,
  );
  const details = await admin.get(`/api/admin/teams/${managed._id}`);
  assert.equal(
    (
      await call(admin, "patch", `/admin/students/${participant._id}`, {
        phoneNo: "9876555006",
      })
    ).status,
    200,
  );
  assert.equal(
    (await call(member, "post", "/auth/login", { ...updated, teamCode: code }))
      .status,
    401,
  );
  updated.phoneNo = "9876555006";
  assert.equal(
    (await call(member, "post", "/auth/login", { ...updated, teamCode: code }))
      .status,
    200,
  );
  assert.equal(
    details.body.members.find((u) => u.rollNo === updated.rollNo).email,
    updated.email,
  );
  assert.equal(
    (
      await call(admin, "patch", `/admin/teams/${managed._id}`, {
        leaderId: String(participant._id),
      })
    ).status,
    200,
  );
  assert.equal(
    (await models.User.findById(participant._id)).role,
    "TEAM_LEADER",
  );
  assert.equal(
    (
      await call(admin, "delete", `/admin/students/${participant._id}`, {
        confirm: true,
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await call(admin, "patch", `/admin/teams/${managed._id}`, {
        leaderId: String(managed.leaderId),
      })
    ).status,
    200,
  );
  const attempt = await call(leader, "post", "/games/puzzle/start", {});
  assert.equal(attempt.status, 200);
  assert.equal(
    (
      await call(admin, "delete", `/admin/students/${participant._id}`, {
        confirm: true,
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await call(
        admin,
        "post",
        `/admin/games/puzzle/sessions/${attempt.body.sessionId}/reset`,
        { reason: "Roster correction test" },
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await call(admin, "delete", `/admin/students/${participant._id}`, {
        confirm: true,
      })
    ).status,
    200,
  );
  assert.equal((await models.Team.findById(managed._id)).memberIds.length, 1);
  assert.equal((await models.User.findById(participant._id)).status, "DELETED");
  assert.equal((await member.get("/api/auth/me")).status, 401);
  const retry = await call(leader, "post", "/games/puzzle/start", {});
  assert.equal(retry.status, 200);
  assert.equal(
    (
      await call(admin, "delete", `/admin/teams/${managed._id}`, {
        confirm: true,
      })
    ).status,
    200,
  );
  assert.equal((await models.Team.findById(managed._id)).status, "DELETED");
  assert.equal(
    (await models.GameSession.findById(retry.body.sessionId)).status,
    "ABANDONED",
  );
  assert.equal((await models.User.findById(managed.leaderId)).teamId, null);
  assert.equal((await leader.get("/api/auth/me")).status, 401);
  assert.equal(
    (
      await call(leader, "post", "/auth/login", {
        ...identity(5),
        teamCode: code,
      })
    ).status,
    401,
  );
  assert.ok(
    await models.Audit.exists({
      action: "DELETE_TEAM",
      entityId: String(managed._id),
    }),
  );
  assert.ok(
    await models.Audit.exists({
      action: "DELETE_STUDENT",
      entityId: String(participant._id),
    }),
  );
});
