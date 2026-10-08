import { readdirSync } from "node:fs";
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
    }
  }
}
for (const p of ["backend/src", "scripts"]) check(resolve(root, p));
