import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

test("Memory camera setup cannot consume the timed answer window or duplicate a start", async () => {
  let releaseCamera;
  const camera = new Promise((resolve) => { releaseCamera = resolve; });
  let countdownRequests = 0;
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) elements.set(id, { value: "camera", style: {}, classList: { add() {}, remove() {} } });
    return elements.get(id);
  };
  const window = {
    visionEngine: { init: async () => true, startCamera: () => camera },
    platformApi: async () => { countdownRequests++; },
    soundEngine: { playCountdownTick() {} },
    app: { showToast() {} },
  };
  runInNewContext(readFileSync("frontend/public/games/memory/js/game.js", "utf8"), {
    window, document: { getElementById: element, querySelector: () => element("start") },
    setInterval: () => 1, clearInterval() {},
  });
  window.gameEngine.renderMemorizeSlotsStrip = () => {};
  const starting = window.gameEngine.beginCountdown();
  await Promise.resolve();
  await window.gameEngine.beginCountdown();
  assert.equal(countdownRequests, 0, "permission/model preparation happens before the server clock starts");
  assert.equal(element("start").disabled, true);
  releaseCamera(true);
  await starting;
  assert.equal(countdownRequests, 1, "repeated clicks create only one countdown");
});

test("Memory manual input starts without opening a camera", async () => {
  let cameraRequests = 0, countdownRequests = 0;
  const window = {
    visionEngine: { init: async () => { cameraRequests++; } },
    platformApi: async () => { countdownRequests++; },
    soundEngine: { playCountdownTick() {} }, app: { showToast() {} },
  };
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) elements.set(id, { value: "manual", style: {}, classList: { add() {}, remove() {} } });
    return elements.get(id);
  };
  runInNewContext(readFileSync("frontend/public/games/memory/js/game.js", "utf8"), {
    window, document: { getElementById: element, querySelector: () => element("start") },
    setInterval: () => 1, clearInterval() {},
  });
  window.gameEngine.renderMemorizeSlotsStrip = () => {};
  await window.gameEngine.beginCountdown();
  assert.equal(cameraRequests, 0);
  assert.equal(countdownRequests, 1);
});
