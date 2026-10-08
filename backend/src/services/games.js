import {
  GameSession,
  Result,
  Content,
  User,
  CalculatorPresence,
} from "../models/index.js";
import { transaction } from "../config/db.js";
import { teamFor } from "./teams.js";
import { gameSettings } from "./settings.js";
import {
  initializeCalculator,
  advanceCalculator,
  calculatorView,
  CALCULATOR_PRESENCE_MS,
} from "../game-services/calculator.js";
import { fail } from "./errors.js";
import { puzzleData, detectiveData } from "./content.js";
export function assertAvailable(config, now = Date.now()) {
  const reason = availabilityReason(config, now);
  if (reason) fail(403, reason);
}
export function availabilityReason(config, now = Date.now()) {
  if (!config.enabled)
    return "The organizer has paused this game. Please contact the event desk.";
  if (
    [config.startAt, config.endAt].some(
      (value) => value && !Number.isFinite(+new Date(value)),
    )
  )
    return "The game schedule needs an organizer correction.";
  if (config.startAt && now < +new Date(config.startAt))
    return `This game opens at ${new Date(config.startAt).toISOString()}.`;
  if (config.endAt && now > +new Date(config.endAt))
    return "This game's entry window has closed. Please contact the event desk.";
  return null;
}
export const scopeFor = (game, user) =>
  user.role === "ADMIN"
    ? `admin:${user._id}`
    : game === "memory"
      ? String(user._id)
      : String(user.teamId);
export const gameOrder = ["puzzle", "detective", "calculator", "memory"];
export async function roundLock(game, user, tx) {
  if (user.role === "ADMIN") return null;
  const previous = gameOrder[gameOrder.indexOf(game) - 1];
  if (!previous) return null;
  const completed = await Result.exists({
    teamId: user.teamId,
    gameId: previous,
    valid: true,
  }).session(tx || null);
  return completed ? null : previous;
}
export async function finishResult(doc, session) {
  if (doc.status !== "COMPLETED" || doc.testMode) return;
  await Result.updateOne(
    { sessionId: doc._id },
    {
      $setOnInsert: {
        sessionId: doc._id,
        valid: true,
        teamId: doc.teamId,
        userId: doc.userId,
        gameId: doc.gameId,
        score: doc.score,
        maximum: doc.maximum,
        attempt: doc.attempt,
        completionTime: Math.max(0, (+doc.completedAt - +doc.startedAt) / 1000),
        completedAt: doc.completedAt,
      },
    },
    { upsert: true, session },
  );
}
export async function startGame(game, user) {
  let result;
  await transaction(async (tx) => {
    const team = await teamFor(user, tx),
      cfg = await gameSettings(game, tx);
    if (user.role !== "ADMIN") assertAvailable(cfg);
    const locked = await roundLock(game, user, tx);
    if (locked)
      fail(403, "Complete the previous round before starting this game.");
    if (game === "calculator" && team.memberIds.length !== 3)
      fail(
        409,
        "AI Calculator requires exactly three team members for X, Y and Z.",
      );
    const scope = scopeFor(game, user);
    let previous = await GameSession.findOne({ scope, gameId: game })
      .sort({ attempt: -1 })
      .session(tx);
    if (previous?.status === "IN_PROGRESS") {
      result = previous;
      return;
    }
    if (
      previous &&
      user.role !== "ADMIN" &&
      previous.attempt >= cfg.maxAttempts &&
      !previous.retryGranted
    )
      fail(409, "All permitted attempts have been used.");
    if (
      ["puzzle", "detective"].includes(game) &&
      String(team.leaderId) !== String(user._id)
    )
      fail(403, "Only the team leader can start this game.");
    const startedAt = new Date(),
      state = {};
    let maximum;
    if (game === "memory") {
      Object.assign(state, { stage: 0, stages: [], active: null });
      maximum = Object.values(cfg.stages).reduce(
        (a, b) => a + b.numbersCount,
        0,
      );
    }
    if (game === "calculator") {
      Object.assign(state, initializeCalculator(team.memberIds, cfg));
      maximum = cfg.sequence.reduce(
        (a, l) => a + cfg.base[l] + cfg.time[l] * cfg.speed,
        0,
      );
    }
    if (game === "puzzle") {
      const contents = await Content.find({ gameId: game, published: true })
        .sort({ order: 1, _id: 1 })
        .session(tx)
        .lean();
      if (!contents.length)
        fail(409, "No puzzles have been published by the event organizer.");
      if (contents.some((c) => !puzzleData.safeParse(c.data).success))
        fail(
          409,
          "A published puzzle is incomplete. Ask the organizer to correct and save its image and tiles.",
        );
      state.puzzles = contents.map((c) => ({
        ...c.data,
        id: String(c._id),
        title: c.title,
      }));
      state.index = 0;
      state.attempts = [];
      state.expiresAt =
        user.role === "ADMIN" ? null : +startedAt + cfg.durationSeconds * 1000;
      maximum = state.puzzles.reduce((a, p) => a + p.points, 0);
    }
    if (game === "detective") {
      const content = await Content.findOne({ gameId: game, published: true })
        .sort({ order: 1 })
        .session(tx)
        .lean();
      if (!content?.data?.questions?.length)
        fail(
          409,
          "No detective case has been published by the event organizer.",
        );
      if (!detectiveData.safeParse(content.data).success)
        fail(
          409,
          "The published Detective case is incomplete. Ask the organizer to correct and save its questions and clues.",
        );
      state.case = {
        ...content.data,
        id: String(content._id),
        title: content.title,
      };
      state.index = 0;
      state.answers = [];
      state.hintsUsed = [];
      state.expiresAt =
        user.role === "ADMIN" ? null : +startedAt + cfg.durationSeconds * 1000;
      maximum = state.case.questions.reduce((a, q) => a + q.points, 0);
    }
    [result] = await GameSession.create(
      [
        {
          scope,
          gameId: game,
          userId: user._id,
          teamId: team._id,
          testMode: user.role === "ADMIN",
          attempt: (previous?.attempt || 0) + 1,
          startedAt,
          maximum,
          state,
          config: cfg,
        },
      ],
      { session: tx },
    );
    // Touch the team in the same transaction so game start and membership edits cannot race.
    if (!team.testMode) {
      team.updatedAt = new Date();
      await team.save({ session: tx });
    }
  });
  return result;
}
export async function mutateGame(game, user, fn) {
  let payload;
  await transaction(async (tx) => {
    const team = await teamFor(user, tx);
    if (user.role !== "ADMIN") assertAvailable(await gameSettings(game, tx));
    const doc = await GameSession.findOne({
      scope: scopeFor(game, user),
      gameId: game,
    })
      .sort({ attempt: -1 })
      .session(tx);
    if (!doc) fail(409, "Start the game first.");
    if (doc.status !== "IN_PROGRESS")
      fail(409, "This attempt has already finished.");
    if (
      !doc.testMode &&
      doc.state.expiresAt &&
      Date.now() > doc.state.expiresAt
    ) {
      doc.status = "COMPLETED";
      doc.completedAt = new Date(doc.state.expiresAt);
      payload = { expired: true };
    } else payload = await fn(doc, team, tx);
    doc.revision++;
    doc.markModified("state");
    await doc.save({ session: tx });
    await finishResult(doc, tx);
  });
  return payload;
}
export async function calculatorState(user, event = {}) {
  let view;
  const scope = scopeFor("calculator", user);
  let recent = await GameSession.findOne({ scope, gameId: "calculator" }).sort({
    attempt: -1,
  });
  if (
    event.sessionId &&
    (!recent ||
      recent.status === "ABANDONED" ||
      event.sessionId !== String(recent._id))
  )
    fail(409, "This attempt was reset. Refresh the arena before continuing.");
  if (!recent || recent.status === "ABANDONED") {
    try {
      await startGame("calculator", user);
    } catch (error) {
      // Simultaneous first connections can race on the unique attempt index.
      if (
        error.code !== 11000 ||
        !(await GameSession.exists({ scope, gameId: "calculator" }))
      )
        throw error;
    }
    recent = await GameSession.findOne({ scope, gameId: "calculator" }).sort({
      attempt: -1,
    });
  }
  if (recent.status === "COMPLETED") {
    const team = await teamFor(user),
      members = team.testMode
        ? team.members
        : await User.find({ _id: { $in: team.memberIds } });
    return calculatorView(recent, team, members, user);
  }
  const team = await teamFor(user);
  if (user.role !== "ADMIN") assertAvailable(await gameSettings("calculator"));
  const leaseKey = { sessionId: recent._id, userId: user._id };
  const renew = () =>
    CalculatorPresence.updateOne(
      leaseKey,
      {
        $set: { expiresAt: new Date(Date.now() + CALCULATOR_PRESENCE_MS) },
      },
      { upsert: true },
    );
  try {
    await renew();
  } catch (error) {
    if (error.code !== 11000) throw error;
    await renew();
  }
  const readPresence = async (tx = null) =>
    Object.fromEntries(
      (
        await CalculatorPresence.find({ sessionId: recent._id })
          .session(tx)
          .lean()
      ).map((p) => [String(p.userId), +p.expiresAt]),
    );
  const presence = await readPresence(),
    now = Date.now(),
    s = recent.state;
  const online =
    team.testMode ||
    team.memberIds.every((id) => (presence[String(id)] || 0) > now);
  const live = ["COUNTDOWN", "PLAYING"].includes(s.phase);
  const readyToCheck =
    s.phase === "PLAYING" &&
    "XYZ".split("").every((k) => Number.isInteger(s.values[k])) &&
    now - s.changed >= recent.config.lockSeconds * 1000 &&
    "XYZ"
      .split("")
      .map((k) => s.values[k])
      .join(",") !== s.checked;
  // Normal polls only renew this participant's lease and read the game. Write the
  // shared document for an event, a clock transition, a pause/resume or scoring.
  if (
    !event.type &&
    s.n > 0 &&
    s.hold === null &&
    !(live && (!online || (s.deadline && s.deadline <= now) || readyToCheck))
  ) {
    recent.state.presence = team.testMode
      ? Object.fromEntries(
          team.memberIds.map((id) => [
            String(id),
            now + CALCULATOR_PRESENCE_MS,
          ]),
        )
      : presence;
    const members = team.testMode
      ? team.members
      : await User.find({ _id: { $in: team.memberIds } });
    return calculatorView(recent, team, members, user);
  }
  await mutateGame("calculator", user, async (doc, team, tx) => {
    if (String(doc._id) !== String(recent._id))
      fail(409, "This attempt was reset. Refresh the arena before continuing.");
    if (event.sessionId && event.sessionId !== String(doc._id))
      fail(409, "This attempt was reset. Refresh the arena before continuing.");
    const currentPresence = await readPresence(tx);
    advanceCalculator(doc, team, user, event, Date.now(), currentPresence);
    const members = team.testMode
      ? team.members
      : await User.find({ _id: { $in: team.memberIds } }).session(tx);
    view = calculatorView(doc, team, members, user);
    // mutateGame increments the persisted revision after this callback.
    view.revision = doc.revision + 1;
  });
  return view;
}
export async function getCurrent(game, user) {
  const team = await teamFor(user);
  if (user.role !== "ADMIN") assertAvailable(await gameSettings(game));
  const doc = await GameSession.findOne({
    scope: scopeFor(game, user),
    gameId: game,
  }).sort({ attempt: -1 });
  if (doc?.status === "ABANDONED") return { team, doc: null };
  if (
    doc?.status === "IN_PROGRESS" &&
    !doc.testMode &&
    doc.state.expiresAt &&
    Date.now() > doc.state.expiresAt
  ) {
    await mutateGame(game, user, () => ({}));
    return { team, doc: await GameSession.findById(doc._id) };
  }
  return { team, doc };
}
export function puzzleView(doc, team, user) {
  const done = doc?.status === "COMPLETED",
    p = doc && !done ? doc.state.puzzles[doc.state.index] : null;
  const pieces = p?.pieces
    ?.map(({ pieceId, imageUrl }) => ({ pieceId, imageUrl }))
    .sort(() => Math.random() - 0.5);
  return {
    success: true,
    testMode: Boolean(doc?.testMode),
    hasStarted: !!doc,
    isLeader: String(team.leaderId) === String(user._id),
    teamName: team.name,
    isCompleted: done,
    isExpired: done && doc.state.index < doc.state.puzzles.length,
    session: doc
      ? {
          id: doc._id,
          revision: doc.revision,
          status: doc.status,
          score: doc.score,
          currentPuzzleIndex: doc.state.index,
          totalPuzzles: doc.state.puzzles.length,
          remainingSeconds: doc.testMode
            ? null
            : Math.max(0, Math.ceil((doc.state.expiresAt - Date.now()) / 1000)),
          expiresAt: doc.testMode ? null : new Date(doc.state.expiresAt),
          startTime: doc.startedAt,
          attemptsCount: doc.state.attempts.length,
          attempts: doc.state.attempts,
        }
      : null,
    currentPuzzle: p ? { ...p, correctOrder: undefined, pieces } : null,
    team: { id: team._id, name: team.name, code: team.code },
  };
}
export function detectiveView(doc) {
  const c = doc.state.case;
  return {
    success: true,
    caseAvailable: true,
    case: {
      id: c.id,
      title: c.title,
      description: c.description,
      difficulty: c.difficulty,
      maximumScore: doc.maximum,
      suspects: c.suspects || [],
    },
    clues: c.clues,
    questions: c.questions.map(
      ({ correctAnswerIndex: _correctAnswerIndex, ...q }) => ({
        ...q,
        _id: q.id,
      }),
    ),
    hints: c.hints.map(({ hintText, ...h }) => ({
      ...h,
      _id: h.id,
      isUsed: doc.state.hintsUsed.includes(h.id),
      hintText: doc.state.hintsUsed.includes(h.id) ? hintText : undefined,
    })),
    attempt: {
      id: doc._id,
      testMode: Boolean(doc.testMode),
      score: doc.score,
      currentQuestionIndex: doc.state.index,
      status:
        doc.status === "COMPLETED" && doc.state.index < c.questions.length
          ? "TIME_EXPIRED"
          : doc.status,
      hintsUsed: doc.state.hintsUsed,
      expiresAt: doc.testMode ? null : new Date(doc.state.expiresAt),
      startedAt: doc.startedAt,
      completedAt: doc.completedAt,
    },
  };
}
