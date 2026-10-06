import { Router } from "express";
import { requireAuth } from "../middleware/security.js";
import { asyncRoute } from "../services/errors.js";
import { teamDetails } from "../services/teams.js";
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
