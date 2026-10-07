import { Setting, GameSetting } from "../models/index.js";
import { defaults } from "../game-services/config.js";
export async function platformSettings(session) {
  return (
    (await Setting.findOne({ key: "platform" }).session(session || null))
      ?.value || { maxTeamSize: 3 }
  );
}
export async function gameSettings(gameId, session) {
  const saved = (await GameSetting.findOne({ gameId }).session(session || null))?.config;
  return mergeSettings(defaults[gameId], saved);
}
export function mergeSettings(base, saved) {
  if (!base || typeof base !== "object" || Array.isArray(base)) return saved === undefined ? structuredClone(base) : saved;
  return Object.fromEntries(Object.entries(base).map(([key, value]) => [key, mergeSettings(value, saved?.[key])]));
}
