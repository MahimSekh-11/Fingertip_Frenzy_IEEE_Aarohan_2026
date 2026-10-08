import { Router } from "express";
import { z } from "zod";
import { requireAuth, rateLimit } from "../middleware/security.js";
import { asyncRoute, fail } from "../services/errors.js";
import { gameId } from "../services/validation.js";
import { names } from "../game-services/config.js";
import { gameSettings } from "../services/settings.js";
import {
  startGame,
  mutateGame,
  getCurrent,
  puzzleView,
  detectiveView,
  calculatorState,
  calculatorReadState,
  sessionFilter,
  roundLock,
  availabilityReason,
} from "../services/games.js";
import {
  beginStage,
  beginMemoryCountdown,
  finishStage,
} from "../game-services/memory.js";
import { GameSession, Content } from "../models/index.js";
const router = Router();
router.use(requireAuth);
router.get(
  "/",
  asyncRoute(async (req, res) => {
    const games = await Promise.all(
      ["puzzle", "detective", "calculator", "memory"].map(async (id) => {
        const config = await gameSettings(id);
        const doc =
          req.user.teamId &&
          (await GameSession.findOne(sessionFilter(id, req.user))
            .sort({ attempt: -1 })
            .select("status score"));
        const missingContent =
          ["puzzle", "detective"].includes(id) &&
          (!doc || doc.status === "ABANDONED") &&
          !(await Content.exists({ gameId: id, published: true }));
        const unavailableReason =
          availabilityReason(config) ||
          (missingContent
            ? `The organizer has not published ${id === "puzzle" ? "a puzzle" : "a Detective case"} yet.`
            : null);
        return {
          id,
          name: names[id],
          enabled: config.enabled,
          available: !unavailableReason,
          unavailableReason,
          weight: config.weight,
          locked: Boolean(await roundLock(id, req.user)),
          status: doc?.status || "NOT_STARTED",
          score: doc?.score || 0,
        };
      }),
    );
    res.json({ games });
  }),
);
router.post(
  "/:gameId/start",
  rateLimit("start", 30),
  asyncRoute(async (req, res) => {
    const game = gameId.parse(req.params.gameId);
    const doc = await startGame(game, req.user);
    res.json({ sessionId: doc._id, status: doc.status });
  }),
);
router.get(
  "/calculator/state",
  rateLimit("calculator-state", 180),
  asyncRoute(async (req, res) => res.json(await calculatorReadState(req.user))),
);
router.post(
  "/calculator/sync",
  rateLimit("calculator-state", 180),
  asyncRoute(async (req, res) => res.json(await calculatorState(req.user))),
);
router.post(
  "/calculator/event",
  rateLimit("calculator-event", 240),
  asyncRoute(async (req, res) => {
    const b = z
      .discriminatedUnion("type", [
        z.object({
          type: z.literal("digit"),
          digit: z.number().int().min(0).max(9).nullable(),
          conf: z.number().min(0).max(1),
          questionId: z.string().optional(),
        }),
        z.object({ type: z.literal("start") }),
        z.object({ type: z.literal("role"), role: z.enum(["X", "Y", "Z"]) }),
      ])
      .and(z.object({ sessionId: z.string().optional() }))
      .parse(req.body);
    res.json(await calculatorState(req.user, b));
  }),
);
router.get(
  "/memory/config",
  asyncRoute(async (req, res) => {
    const { doc } = await getCurrent("memory", req.user);
    res.json({
      testMode: req.user.role === "ADMIN",
      stages: (doc?.config || (await gameSettings("memory"))).stages,
    });
  }),
);
router.get(
  "/memory/state",
  asyncRoute(async (req, res) => {
    const { doc } = await getCurrent("memory", req.user);
    res.json({
      stage: doc?.state.stage || 0,
      active: doc?.state.active
        ? {
            stage: doc.state.active.stage,
            started: Boolean(doc.state.active.answerFrom),
          }
        : null,
      stages:
        doc?.state.stages.map(({ stage, score }) => ({ stage, score })) || [],
      status: doc?.status || "NOT_STARTED",
      score: doc?.score || 0,
    });
  }),
);
router.post(
  "/memory/stage/start",
  rateLimit("memory-start", 30),
  asyncRoute(async (req, res) => {
    const b = z
      .object({ stage: z.number().int().min(1).max(3) })
      .strict()
      .parse(req.body);
    res.json(
      await mutateGame("memory", req.user, (doc) => beginStage(doc, b.stage)),
    );
  }),
);
router.post(
  "/memory/stage/countdown",
  rateLimit("memory-countdown", 30),
  asyncRoute(async (req, res) => {
    await mutateGame("memory", req.user, (doc) => beginMemoryCountdown(doc));
    res.json({ success: true });
  }),
);
router.post(
  "/memory/submit",
  rateLimit("memory-submit", 30),
  asyncRoute(async (req, res) => {
    const b = z
      .object({
        stage: z.number().int().min(1).max(3),
        digits: z.array(z.number().int().min(0).max(9)).max(9),
      })
      .strict()
      .parse(req.body);
    res.json(
      await mutateGame("memory", req.user, (doc) => ({
        success: true,
        score: finishStage(doc, b.stage, b.digits),
        total: doc.score,
      })),
    );
  }),
);
export const vortex = Router();
vortex.use(requireAuth);
vortex.get(
  "/game/r1/state",
  asyncRoute(async (req, res) => {
    const { doc, team } = await getCurrent("puzzle", req.user);
    res.json(puzzleView(doc, team, req.user));
  }),
);
vortex.post(
  "/game/r1/sync",
  rateLimit("puzzle-state", 90),
  asyncRoute(async (req, res) => {
    const { doc, team } = await getCurrent("puzzle", req.user, {
      finalize: true,
    });
    res.json(puzzleView(doc, team, req.user));
  }),
);
vortex.post(
  "/game/r1/start",
  rateLimit("puzzle-start", 30),
  asyncRoute(async (req, res) => {
    await startGame("puzzle", req.user);
    const { doc, team } = await getCurrent("puzzle", req.user);
    res.json(puzzleView(doc, team, req.user));
  }),
);
vortex.post(
  "/game/r1/submit",
  rateLimit("puzzle-submit", 90),
  asyncRoute(async (req, res) => {
    const b = z
      .object({
        pieceOrder: z.array(z.string().max(100)).min(4).max(64),
        puzzleId: z.string(),
      })
      .strict()
      .parse(req.body);
    const data = await mutateGame("puzzle", req.user, (doc, team) => {
      if (String(team.leaderId) !== String(req.user._id))
        fail(403, "Only the team leader can submit.");
      const s = doc.state,
        p = s.puzzles[s.index];
      if (b.puzzleId !== p.id)
        fail(409, "This puzzle has already been submitted.");
      if (
        b.pieceOrder.length !== p.correctOrder.length ||
        new Set(b.pieceOrder).size !== b.pieceOrder.length ||
        b.pieceOrder.some((id) => !p.correctOrder.includes(id))
      )
        fail(400, "Include every puzzle piece exactly once.");
      const isCorrect = b.pieceOrder.every((id, i) => id === p.correctOrder[i]);
      const pointsAwarded = isCorrect ? p.points : 0;
      s.attempts.push({
        puzzleTitle: p.title,
        isCorrect,
        pointsAwarded,
        submittedAt: new Date(),
      });
      if (isCorrect) {
        doc.score += pointsAwarded;
        s.index++;
      }
      if (s.index === s.puzzles.length) {
        doc.status = "COMPLETED";
        doc.completedAt = new Date();
      }
      return {
        success: true,
        isCorrect,
        pointsAwarded,
        isRoundCompleted: doc.status === "COMPLETED",
        nextPuzzleUnlocked: isCorrect,
        currentPuzzleIndex: s.index,
        totalPuzzles: s.puzzles.length,
        message: isCorrect
          ? "Correct! Your score has been saved."
          : "Incorrect arrangement. Try again.",
      };
    });
    res.json(data);
  }),
);
vortex.get(
  "/detective/case",
  asyncRoute(async (req, res) => {
    const { doc, team } = await getCurrent("detective", req.user);
    res.json(
      doc
        ? detectiveView(doc)
        : {
            success: true,
            hasStarted: false,
            isLeader: String(team.leaderId) === String(req.user._id),
          },
    );
  }),
);
vortex.post(
  "/detective/start",
  rateLimit("detective-start", 30),
  asyncRoute(async (req, res) => {
    let { doc } = await getCurrent("detective", req.user, { finalize: true });
    if (!doc) {
      await startGame("detective", req.user);
      ({ doc } = await getCurrent("detective", req.user));
    }
    res.json(detectiveView(doc));
  }),
);
vortex.post(
  "/detective/sync",
  rateLimit("detective-state", 90),
  asyncRoute(async (req, res) => {
    const { doc } = await getCurrent("detective", req.user, { finalize: true });
    if (!doc) fail(409, "The attempt was reset. Reopen the arena to continue.");
    res.json(detectiveView(doc));
  }),
);
vortex.post(
  "/detective/submit-answer",
  rateLimit("detective-answer", 60),
  asyncRoute(async (req, res) => {
    const b = z
      .object({
        questionId: z.string().max(100),
        selectedOptionIndex: z.number().int().min(0).max(9),
      })
      .strict()
      .parse(req.body);
    res.json(
      await mutateGame("detective", req.user, (doc) => {
        const s = doc.state,
          q = s.case.questions[s.index];
        if (q.id !== b.questionId)
          fail(
            409,
            "This question has already been submitted or is out of order.",
          );
        if (b.selectedOptionIndex >= q.options.length)
          fail(400, "Invalid answer option.");
        const isCorrect = b.selectedOptionIndex === q.correctAnswerIndex,
          pointsAwarded = isCorrect ? q.points : 0;
        s.answers.push({
          questionId: q.id,
          selectedOptionIndex: b.selectedOptionIndex,
          isCorrect,
          pointsAwarded,
        });
        doc.score = detectiveScore(s);
        s.index++;
        if (s.index === s.case.questions.length) {
          doc.status = "COMPLETED";
          doc.completedAt = new Date();
        }
        return {
          success: true,
          isCorrect,
          pointsAwarded,
          newScore: doc.score,
          currentQuestionIndex: s.index,
          isCaseCompleted: doc.status === "COMPLETED",
          status: doc.status,
        };
      }),
    );
  }),
);
vortex.post(
  "/detective/use-hint",
  rateLimit("hint", 60),
  asyncRoute(async (req, res) => {
    const b = z
      .object({ hintId: z.string().max(100) })
      .strict()
      .parse(req.body);
    res.json(
      await mutateGame("detective", req.user, (doc) => {
        const s = doc.state,
          h = s.case.hints.find((h) => h.id === b.hintId);
        if (!h || h.enabled === false) fail(404, "Hint is unavailable.");
        const used = s.hintsUsed.includes(h.id);
        if (!used) {
          s.hintsUsed.push(h.id);
          doc.score = detectiveScore(s);
        }
        return {
          success: true,
          hintText: h.hintText,
          currentScore: doc.score,
          penaltyDeducted: used ? 0 : h.penalty,
        };
      }),
    );
  }),
);
export default router;

function detectiveScore(state) {
  const earned = state.answers.reduce(
    (total, answer) => total + answer.pointsAwarded,
    0,
  );
  const penalties = state.case.hints.reduce(
    (total, hint) =>
      total + (state.hintsUsed.includes(hint.id) ? hint.penalty : 0),
    0,
  );
  return Math.max(0, earned - penalties);
}
