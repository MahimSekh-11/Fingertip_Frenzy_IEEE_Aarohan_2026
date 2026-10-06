import { randomBytes } from "node:crypto";
import { User, Team, GameSession } from "../models/index.js";
import { transaction } from "../config/db.js";
import { platformSettings } from "./settings.js";
import { fail } from "./errors.js";
export const teamCode = () =>
  `FF-${randomBytes(6).toString("hex").toUpperCase()}`;
export async function teamFor(user, session) {
  const team =
    user.teamId &&
    (await Team.findOne({
      _id: user.teamId,
      status: "ACTIVE",
      memberIds: user._id,
    }).session(session || null));
  if (!team) fail(403, "Join or create an active team before playing.");
  return team;
}
export async function createTeam(user, name) {
  let team;
  await transaction(async (session) => {
    const fresh = await User.findById(user._id).session(session);
    if (fresh.teamId) fail(409, "You are already part of another team.");
    [team] = await Team.create(
      [{ name, code: teamCode(), leaderId: user._id, memberIds: [user._id] }],
      { session },
    );
    const update = await User.updateOne(
      { _id: user._id, teamId: null },
      { $set: { teamId: team._id, role: "TEAM_LEADER" } },
      { session },
    );
    if (!update.modifiedCount)
      fail(409, "You are already part of another team.");
  });
  return team;
}
export async function joinTeam(user, code) {
  let team;
  await transaction(async (session) => {
    const fresh = await User.findById(user._id).session(session);
    if (fresh.teamId) fail(409, "You are already part of another team.");
    team = await Team.findOne({ code, status: "ACTIVE" }).session(session);
    if (!team) fail(404, "Team code is invalid.");
    const settings = await platformSettings(session);
    if (team.memberIds.length >= settings.maxTeamSize)
      fail(409, "This team is already full.");
    if (
      await GameSession.exists({
        teamId: team._id,
        status: "IN_PROGRESS",
      }).session(session)
    )
      fail(409, "Team membership is locked while a game is in progress.");
    team.memberIds.push(user._id);
    await team.save({ session });
    fresh.teamId = team._id;
    await fresh.save({ session });
  });
  return team;
}
export async function teamDetails(user) {
  if (!user.teamId) return null;
  const team = await Team.findOne({
    _id: user.teamId,
    memberIds: user._id,
    status: { $ne: "DELETED" },
  }).lean();
  if (!team) return null;
  const members = await User.find({ _id: { $in: team.memberIds } })
    .select("name rollNo role status")
    .lean();
  return { ...team, members };
}
