import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/security.js";
import { asyncRoute, fail } from "../services/errors.js";
import { name } from "../services/validation.js";
import { teamDetails } from "../services/teams.js";
import { Team, GameSession } from "../models/index.js";
const router = Router();
router.use(requireAuth);
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
  res
    .status(410)
    .json({
      message:
        "Enter your invitation code and identity on the login page to join.",
    }),
);
router.patch(
  "/me",
  asyncRoute(async (req, res) => {
    const b = z.object({ name }).strict().parse(req.body);
    const team = await Team.findOne({
      _id: req.user.teamId,
      leaderId: req.user._id,
      status: "ACTIVE",
    });
    if (!team) fail(403, "Only the team leader can rename the team.");
    if (await GameSession.exists({ teamId: team._id, status: "IN_PROGRESS" }))
      fail(409, "Finish the active game before changing the team.");
    team.name = b.name;
    await team.save();
    res.json({ team });
  }),
);
export default router;
