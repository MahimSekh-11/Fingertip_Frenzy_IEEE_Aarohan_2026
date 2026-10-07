import { User, Team, GameSession } from "../models/index.js";
import { transaction } from "../config/db.js";
import { teamCode } from "./teams.js";
import { platformSettings } from "./settings.js";
import { fail } from "./errors.js";

export async function registerLeader({ teamName, ...identity }) {
  let team;
  await transaction(async (tx) => {
    if (
      await User.exists({
        $or: [{ rollNo: identity.rollNo }, { phoneNo: identity.phoneNo }],
      }).session(tx)
    )
      fail(
        409,
        "This roll number or phone number is already registered. Use your existing team code to log in.",
      );
    const [leader] = await User.create([{ ...identity, role: "TEAM_LEADER" }], {
      session: tx,
    });
    [team] = await Team.create(
      [
        {
          name: teamName,
          code: teamCode(),
          leaderId: leader._id,
          memberIds: [leader._id],
        },
      ],
      { session: tx },
    );
    leader.teamId = team._id;
    await leader.save({ session: tx });
  });
  return { name: team.name, code: team.code };
}
export async function loginParticipant({ teamCode: code, ...identity }) {
  let user;
  await transaction(async (tx) => {
    const team = await Team.findOne({ code, status: "ACTIVE" }).session(tx);
    if (!team) fail(401, "Team code or participant details do not match.");
    user = await User.findOne({
      $or: [{ rollNo: identity.rollNo }, { phoneNo: identity.phoneNo }],
    }).session(tx);
    if (user) {
      if (
        user.role === "ADMIN" ||
        user.status !== "ACTIVE" ||
        user.rollNo !== identity.rollNo ||
        user.phoneNo !== identity.phoneNo ||
        user.email?.toLowerCase() !== identity.email ||
        user.name.trim().toLowerCase() !== identity.name.toLowerCase() ||
        String(user.teamId) !== String(team._id) ||
        !team.memberIds.some((id) => String(id) === String(user._id))
      )
        fail(401, "Team code or participant details do not match.");
      return;
    }
    const settings = await platformSettings(tx);
    if (team.memberIds.length >= settings.maxTeamSize)
      fail(409, "This team is full. Ask your team leader to check the roster.");
    if (
      await GameSession.exists({
        teamId: team._id,
        status: "IN_PROGRESS",
      }).session(tx)
    )
      fail(
        409,
        "Teammates must join before a game starts. This roster is currently locked.",
      );
    [user] = await User.create(
      [{ ...identity, teamId: team._id, role: "STUDENT" }],
      { session: tx },
    );
    team.memberIds.push(user._id);
    await team.save({ session: tx });
  });
  return user;
}
