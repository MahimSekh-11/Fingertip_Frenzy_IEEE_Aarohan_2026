import { Setting, GameSetting } from "../models/index.js";
import { defaults } from "../game-services/config.js";
export async function platformSettings(session) {
  return (
    (await Setting.findOne({ key: "platform" }).session(session || null))
      ?.value || { maxTeamSize: 3 }
  );
}
export async function gameSettings(gameId, session) {
  return (
    (await GameSetting.findOne({ gameId }).session(session || null))?.config ||
    defaults[gameId]
  );
}
