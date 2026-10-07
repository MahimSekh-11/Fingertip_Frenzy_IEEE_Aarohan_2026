import React, { useState } from "react";
import { Button, Notice } from "./ui";
const labels = {
  enabled: "Game enabled",
  weight: "Global score weight (%)",
  maxAttempts: "Maximum attempts",
  startAt: "Opens at (local time)",
  endAt: "Closes at (local time)",
  sequence: "Difficulty sequence (1 easy, 2 medium, 3 hard)",
  time: "Seconds per difficulty",
  base: "Base points per difficulty",
  speed: "Bonus points per second remaining",
  countdown: "Countdown (seconds)",
  minConf: "Minimum gesture confidence",
  lockSeconds: "Stable gesture hold (seconds)",
  stages: "Stage parameters",
  numbersCount: "Digits to memorize",
  displayIntervalSeconds: "Display interval (seconds)",
  responseIntervalSeconds: "Answer window (seconds)",
  durationSeconds: "Game duration (seconds)",
  stage1: "Stage 1",
  stage2: "Stage 2",
  stage3: "Stage 3",
  1: "Easy",
  2: "Medium",
  3: "Hard",
};
function localDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export function GameSettingsEditor({ value, busy, onSave }) {
  const [config, setConfig] = useState(structuredClone(value || {})),
    [error, setError] = useState("");
  const update = (path, value) => {
    setConfig((old) => {
      const next = structuredClone(old);
      let parent = next;
      for (const key of path.slice(0, -1)) parent = parent[key];
      parent[path.at(-1)] = value;
      return next;
    });
  };
  function render(object, path = []) {
    return Object.entries(object || {}).map(([key, v]) => {
      const p = [...path, key],
        label = labels[key] || key;
      if (v && typeof v === "object" && !Array.isArray(v))
        return (
          <fieldset key={p.join(".")}>
            <legend>{label}</legend>
            <div className="settings-fields">{render(v, p)}</div>
          </fieldset>
        );
      if (typeof v === "boolean")
        return (
          <label className="check" key={key}>
            <input
              type="checkbox"
              checked={v}
              onChange={(e) => update(p, e.target.checked)}
            />
            {label}
          </label>
        );
      return (
        <label className="field" key={p.join(".")}>
          <span>
            {label}
            {!["startAt", "endAt"].includes(key) && (
              <span className="required-mark" aria-hidden="true">
                {" "}
                *
              </span>
            )}
          </span>
          {Array.isArray(v) ? (
            <input
              value={v.join(", ")}
              onChange={(e) =>
                update(
                  p,
                  e.target.value.split(",").map((x) => Number(x.trim())),
                )
              }
              required
            />
          ) : ["startAt", "endAt"].includes(key) ? (
            <input
              type="datetime-local"
              value={localDate(v)}
              onChange={(e) =>
                update(
                  p,
                  e.target.value
                    ? new Date(e.target.value).toISOString()
                    : null,
                )
              }
            />
          ) : (
            <input
              type="number"
              step={
                [
                  "minConf",
                  "lockSeconds",
                  "speed",
                  "weight",
                  "displayIntervalSeconds",
                  "responseIntervalSeconds",
                ].includes(key)
                  ? ".1"
                  : "1"
              }
              value={v}
              onChange={(e) => update(p, Number(e.target.value))}
              required
            />
          )}
        </label>
      );
    });
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (config.startAt && config.endAt && config.startAt >= config.endAt) {
          setError("Closing time must follow opening time.");
          return;
        }
        setError("");
        onSave(config);
      }}
    >
      <p className="form-required-note">
        <span className="required-mark">*</span> Required. Opening and closing
        times are optional.
      </p>
      {render(config)}
      <Notice error>{error}</Notice>
      <Button busy={busy}>Save game settings</Button>
    </form>
  );
}
