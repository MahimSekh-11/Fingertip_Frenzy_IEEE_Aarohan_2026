import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
const root = resolve(import.meta.dirname, "..");
function check(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = resolve(dir, entry.name);
    if (entry.isDirectory()) check(p);
    else if (/\.(js|mjs)$/.test(p)) {
      const r = spawnSync(process.execPath, ["--check", p], {
        stdio: "inherit",
      });
      if (r.status) process.exit(r.status);
    } else if (entry.name.endsWith(".html")) {
      // Vite copies embedded arenas without compiling their scripts.
      for (const match of readFileSync(p, "utf8").matchAll(
        /<script\b[^>]*>([\s\S]*?)<\/script>/gi,
      )) {
        if (!match[1].trim()) continue;
        const r = spawnSync(
          process.execPath,
          ["--input-type=module", "--check"],
          {
            input: match[1],
            stdio: ["pipe", "inherit", "inherit"],
          },
        );
        if (r.status) {
          console.error(`Invalid arena script: ${p}`);
          process.exit(r.status);
        }
      }
    }
  }
}
for (const p of ["backend/src", "scripts", "frontend/public/game-assets"])
  check(resolve(root, p));
