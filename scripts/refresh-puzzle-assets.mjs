import mongoose from "mongoose";
import { connectDB, transaction } from "../backend/src/config/db.js";
import { Content, GameSession, Audit } from "../backend/src/models/index.js";
import {
  hasSequentialTileAssets,
  refreshPuzzleAssets,
} from "../backend/src/services/images.js";

// Read-only unless --apply is explicitly supplied. Never changes an attempt snapshot.
const apply = process.argv.includes("--apply");
try {
  await connectDB();
  const contents = await Content.find({ gameId: "puzzle" }).lean();
  const candidates = contents.filter((c) => hasSequentialTileAssets(c.data));
  const active = await GameSession.countDocuments({
    gameId: "puzzle",
    status: "IN_PROGRESS",
    testMode: { $ne: true },
  });
  if (apply && active) {
    console.error(
      "Finish or reset active competition puzzle attempts before refreshing assets.",
    );
    process.exitCode = 1;
  } else {
    let refreshed = 0;
    if (apply)
      for (const candidate of candidates) {
        const changed = await transaction(async (tx) => {
          const content = await Content.findById(candidate._id).session(tx);
          if (!content || !hasSequentialTileAssets(content.data)) return;
          const old = content.data;
          content.data = await refreshPuzzleAssets(old, tx);
          await content.save({ session: tx });
          await Audit.create(
            [
              {
                action: "SYSTEM_REFRESH_PUZZLE_ASSETS",
                entityType: "Content",
                entityId: String(content._id),
                oldValue: old,
                newValue: content.data,
              },
            ],
            { session: tx },
          );
          return true;
        });
        if (changed) refreshed++;
      }
    console.log(
      JSON.stringify({
        mode: apply ? "apply" : "audit",
        legacyPuzzles: candidates.length,
        activeCompetitionAttempts: active,
        refreshed,
      }),
    );
  }
} catch (error) {
  console.error(
    JSON.stringify({ code: error.publicCode || "PUZZLE_ASSET_REFRESH_FAILED" }),
  );
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
