import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import mongoose from "mongoose";
import { connectDB } from "../backend/src/config/db.js";
import { User, Team, Audit } from "../backend/src/models/index.js";
import { student } from "../backend/src/services/validation.js";
import { teamCode } from "../backend/src/services/teams.js";
// Migration reads the original JSON; it never edits/deletes source data or promotes legacy scores.
const file =
  process.argv.find((v, i) => i > 1 && !v.startsWith("--")) ||
  resolve("Number-Memory-Game-main/data/database.json");
const input = JSON.parse(readFileSync(file, "utf8"));
const rows = (input.participants || []).map((p) => ({
  source: p,
  data: student.safeParse({
    name: p.name,
    rollNo: p.rollNumber,
    phoneNo: String(p.phone || "").replace(/^\+91/, ""),
    ...(p.email ? { email: p.email } : {}),
  }),
}));
const valid = rows.filter((p) => p.data.success),
  invalid = rows.length - valid.length;
console.log(
  JSON.stringify({
    sourceTeams: input.teams?.length || 0,
    validStudents: valid.length,
    recordsNeedingCorrection: invalid,
    legacyScores:
      "Retained in source; require manual review before official results.",
  }),
);
if (!process.argv.includes("--apply")) {
  console.log(
    "Dry run only. Back up the target database and correct invalid students before --apply.",
  );
  process.exit(0);
}
if (invalid)
  throw new Error("Migration refused: correct invalid student records first.");
await connectDB();
await mongoose.connection.transaction(async (session) => {
  const map = new Map();
  for (const row of valid) {
    const p = row.data.data;
    let user = await User.findOne({ rollNo: p.rollNo }).session(session);
    if (user && (user.phoneNo !== p.phoneNo || user.teamId))
      throw new Error(
        "Existing identity or team conflict. Migration rolled back.",
      );
    if (!user) [user] = await User.create([p], { session });
    map.set(row.source.id, user);
  }
  for (const sourceTeam of input.teams || []) {
    const members = valid
      .filter((p) => p.source.teamCode === sourceTeam.code)
      .map((p) => map.get(p.source.id));
    if (!members.length) continue;
    if (members.length > 3)
      throw new Error("Legacy team exceeds default team size.");
    const leader =
      members.find(
        (u) => u.rollNo === String(sourceTeam.leaderRoll).toUpperCase(),
      ) || members[0];
    const [team] = await Team.create(
      [
        {
          name: sourceTeam.name,
          code: teamCode(),
          leaderId: leader._id,
          memberIds: members.map((u) => u._id),
        },
      ],
      { session },
    );
    for (const user of members) {
      user.teamId = team._id;
      user.role =
        String(user._id) === String(leader._id) ? "TEAM_LEADER" : "STUDENT";
      await user.save({ session });
    }
    await Audit.create(
      [
        {
          action: "MIGRATE_MEMORY_TEAM",
          entityType: "Team",
          entityId: String(team._id),
          oldValue: { code: sourceTeam.code },
          newValue: { code: team.code, legacyScoresRequireReview: true },
        },
      ],
      { session },
    );
  }
});
console.log(
  "Migration committed. Original data and legacy scores remain in the source JSON.",
);
await mongoose.disconnect();
