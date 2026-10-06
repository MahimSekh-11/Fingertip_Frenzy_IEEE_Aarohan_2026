import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { randomUUID } from "node:crypto";
import { connectDB } from "./config/db.js";
import { asyncRoute } from "./services/errors.js";
import { checkOrigin } from "./middleware/security.js";
import auth from "./routes/auth.js";
import teams from "./routes/teams.js";
import games, { vortex } from "./routes/games.js";
import admin from "./routes/admin.js";
import { leaderboard } from "./services/leaderboard.js";
import { pagination, search, gameId, objectId } from "./services/validation.js";
import { ImageAsset } from "./models/index.js";
export const app = express();
app.set("trust proxy", 1);
app.use(
  helmet({ contentSecurityPolicy: false }),
  express.json({ limit: "2mb" }),
  cookieParser(),
);
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  res.set("X-Request-ID", randomUUID());
  next();
});
app.use(
  "/api",
  asyncRoute(async (req, res, next) => {
    await connectDB();
    next();
  }),
  checkOrigin,
);
app.get(
  "/api/assets/:id",
  asyncRoute(async (req, res) => {
    const asset = await ImageAsset.findById(
      objectId.parse(req.params.id),
    ).select("+data");
    if (!asset) return res.status(404).end();
    res
      .type(asset.mime)
      .set("Cache-Control", "public, max-age=31536000, immutable")
      .send(asset.data);
  }),
);
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", auth);
app.use("/api/teams", teams);
app.use("/api/games", games);
app.use("/api/admin", admin);
app.use("/api/v1", vortex);
app.get(
  "/api/leaderboard",
  asyncRoute(async (req, res) =>
    res.json(
      await leaderboard({
        ...pagination(req.query),
        search: search(req.query.search),
        game: req.query.gameId ? gameId.parse(req.query.gameId) : null,
        completedOnly: req.query.completed === "true",
      }),
    ),
  ),
);
app.use("/api", (_req, res) =>
  res.status(404).json({ message: "API endpoint not found." }),
);
app.use((err, req, res, _next) => {
  const status =
    err.name === "ZodError" || err.name === "ValidationError"
      ? 400
      : err.code === 11000
        ? 409
        : err.status || 503;
  res.status(status).json({
    message:
      status === 400
        ? "Please check your input."
        : err.code === 11000
          ? "This roll number, phone number or code is already registered."
          : status < 500
            ? err.message
            : "The service is temporarily unavailable. Please try again.",
    requestId: res.get("X-Request-ID"),
  });
});
export default app;
