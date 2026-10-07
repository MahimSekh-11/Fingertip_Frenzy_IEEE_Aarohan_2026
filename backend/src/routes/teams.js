import { Router } from "express";
import { requireAuth } from "../middleware/security.js";
import { asyncRoute, fail } from "../services/errors.js";
import { teamDetails } from "../services/teams.js";
import { Team } from "../models/index.js";
import { leaderboard } from "../services/leaderboard.js";
const router = Router();
router.use(requireAuth);
router.get(
  "/me/score",
  asyncRoute(async (req, res) => {
    const team = await Team.findOne({
      _id: req.user.teamId,
      status: "ACTIVE",
      memberIds: req.user._id,
    });
    if (!team) fail(404, "Your active team was not found.");
    const result = await leaderboard({ teamId: team._id, limit: 1 });
    const row = result.rows[0];
    res.json({
      score: row
        ? {
            teamId: row._id,
            name: row.name,
            scores: row.scores,
            total: row.total,
            completed: row.completed,
          }
        : null,
    });
  }),
);
router.get(
  "/me",
  asyncRoute(async (req, res) =>
    res.json({ team: await teamDetails(req.user) }),
  ),
);
router.post("/", (req, res) =>
  res
    .status(410)
    .json({ message: "Only leaders create teams through registration." }),
);
router.post("/join", (req, res) =>
  res.status(410).json({
    message:
      "Enter your invitation code and identity on the login page to join.",
  }),
);
router.patch("/me", (_req, res) =>
  res
    .status(403)
    .json({
      message:
        "Team names are fixed after registration. Contact the administrator for roster changes.",
    }),
);
export default router;
