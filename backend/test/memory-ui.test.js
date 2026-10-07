import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
const source = readFileSync(
  new URL(
    "../../frontend/public/game-assets/memory/js/game.js",
    import.meta.url,
  ),
  "utf8",
);
function fixture(cameraReady) {
  const calls = [],
    nodes = new Map(),
    listeners = new Map();
  const node = (key) => {
    if (!nodes.has(key))
      nodes.set(key, {
        style: {},
        classList: { add() {}, remove() {}, toggle() {} },
        textContent: "",
        disabled: false,
      });
    return nodes.get(key);
  };
  const document = {
    getElementById: node,
    querySelector: node,
    querySelectorAll: () => [],
    addEventListener: (event, fn) => listeners.set(event, fn),
  };
  const window = {
    soundEngine: { init() {}, playCountdownTick() {} },
    app: { showToast: (message) => calls.push(message) },
    visionEngine: {
      init: async () => true,
      startCamera: async () => {
        calls.push("camera");
        return cameraReady;
      },
    },
    platformApi: async (path) => {
      calls.push(path);
      return {
        sequence: [2, 4],
        config: {
          numbersCount: 2,
          displayIntervalSeconds: 1,
          responseIntervalSeconds: 3,
        },
      };
    },
  };
  runInNewContext(source, {
    window,
    document,
    localStorage: { getItem: () => null },
    setInterval: () => 1,
    clearInterval() {},
    setTimeout: () => 1,
    console,
  });
  const engine = window.gameEngine;
  engine.renderMemorizeSlotsStrip = () => {};
  engine.renderStageSequenceGrid = () => {};
  const startAnswer = engine.startAnswerStep.bind(engine);
  engine.startAnswerStep = () => {};
  return { engine, calls, listeners, startAnswer, node };
}
test("Memory briefing does not consume a stage; camera refusal cannot start the server clock", async () => {
  const { engine, calls } = fixture(false);
  await engine.startStage(1);
  assert.deepEqual(calls, []);
  await engine.beginCountdown();
  assert.equal(calls.filter((c) => c.startsWith("/games/")).length, 0);
  assert.match(calls.at(-1), /Hand gestures are required/);
  assert.equal(engine._countdownPending, false);
});
test("Memory starts its stage after camera readiness and answering binds no keyboard input", async () => {
  const { engine, calls, listeners } = fixture(true);
  await engine.startStage(1);
  await engine.beginCountdown();
  assert.deepEqual(calls, [
    "camera",
    "/games/memory/stage/start",
    "/games/memory/stage/countdown",
  ]);
  assert.deepEqual(Array.from(engine.activeSequence), [2, 4]);
  await engine.openOpenCVOutputBox();
  assert.equal(listeners.has("keydown"), false);
});

test("Memory admin practice never starts an answer timeout and still has no keyboard input", () => {
  const { engine, startAnswer, node, listeners } = fixture(true);
  engine.testMode = true;
  engine.activeSequence = [2, 4];
  startAnswer(0);
  assert.equal(engine.inputTimer, null);
  assert.match(node("central-status-text").innerHTML, /Unlimited practice/);
  assert.equal(node("central-countdown-text").textContent, "\u221e");
  assert.equal(listeners.has("keydown"), false);
});
