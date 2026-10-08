import { Router } from "express";
import { z } from "zod";
import { User, AuthSession } from "../models/index.js";
import { login, registration } from "../services/validation.js";
import { registerLeader, loginParticipant } from "../services/registration.js";
import { asyncRoute, fail } from "../services/errors.js";
import {
  issueSession,
  publicUser,
  verifyPassword,
  digest,
  cookieOptions,
} from "../services/auth.js";
import { requireAuth, rateLimit } from "../middleware/security.js";
const router = Router();
router.post(
  "/register",
  rateLimit("register", 10, 300),
  asyncRoute(async (req, res) => {
    const team = await registerLeader(registration.parse(req.body));
    res.status(201).json({ team });
  }),
);
router.post(
  "/login",
  rateLimit("login", 15, 300),
  asyncRoute(async (req, res) => {
    const body = login.parse(req.body);
    const user = await loginParticipant(body);
    await issueSession(user, res);
    res.json({ user: publicUser(user) });
  }),
);
router.post(
  "/admin/login",
  rateLimit("admin-login", 10, 300),
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        email: z
          .string()
          .email()
          .transform((s) => s.toLowerCase()),
        password: z.string().min(1).max(128),
      })
      .strict()
      .parse(req.body);
    const user = await User.findOne({
      email: body.email,
      role: "ADMIN",
      status: "ACTIVE",
    }).select("+passwordHash");
    if (!user || !verifyPassword(body.password, user.passwordHash))
      fail(401, "Invalid admin credentials.");
    await issueSession(user, res);
    res.json({ user: publicUser(user) });
  }),
);
router.get("/me", requireAuth, (req, res) =>
  res.json({ user: publicUser(req.user) }),
);
router.post(
  "/logout",
  asyncRoute(async (req, res) => {
    if (req.cookies.aarohan_session)
      await AuthSession.deleteOne({
        tokenHash: digest(req.cookies.aarohan_session),
      });
    res.clearCookie("aarohan_session", cookieOptions());
    res.json({ success: true });
  }),
);
export default router;
