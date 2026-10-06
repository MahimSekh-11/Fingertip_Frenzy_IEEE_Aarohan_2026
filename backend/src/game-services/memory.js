import { randomInt } from "node:crypto";
import { fail } from "../services/errors.js";
export function sequence(count) {
  const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = 8; i > 0; i--) {
    const j = randomInt(i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
export const memoryScore = (shown, entered) =>
  shown.reduce((sum, d, i) => sum + (d === entered[i] ? 1 : 0), 0);
export function beginStage(session, stage) {
  if (stage !== session.state.stage + 1 || stage > 3 || session.state.active)
    fail(409, "This stage is already active or out of order.");
  const cfg = session.config.stages[`stage${stage}`];
  const shown = sequence(cfg.numbersCount);
  session.state.active = { stage, shown, answerFrom: null, deadline: null };
  return { sequence: shown, config: cfg };
}
export function beginMemoryCountdown(session, now = Date.now()) {
  const active = session.state.active;
  if (!active) fail(409, "Start a stage first.");
  if (active.answerFrom) return active;
  const cfg = session.config.stages[`stage${active.stage}`];
  active.answerFrom =
    now + 3000 + cfg.numbersCount * cfg.displayIntervalSeconds * 1000;
  active.deadline =
    active.answerFrom +
    cfg.numbersCount * (cfg.responseIntervalSeconds * 1000 + 500) +
    15000;
  return active;
}
export function finishStage(session, stage, entered, now = Date.now()) {
  const active = session.state.active;
  if (!active || active.stage !== stage)
    fail(409, "This stage has already been submitted or is out of order.");
  if (!active.answerFrom || now < active.answerFrom)
    fail(409, "The answering phase has not started.");
  if (
    !Array.isArray(entered) ||
    entered.length !== active.shown.length ||
    entered.some((d) => !Number.isInteger(d) || d < 0 || d > 9)
  )
    fail(400, "Invalid digit sequence.");
  const points = now > active.deadline ? 0 : memoryScore(active.shown, entered);
  session.state.stages.push({
    stage,
    score: points,
    shown: active.shown,
    entered,
  });
  session.state.stage = stage;
  session.state.active = null;
  session.score += points;
  if (stage === 3) {
    session.status = "COMPLETED";
    session.completedAt = new Date(now);
  }
  return points;
}
