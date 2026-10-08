import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

// Vercel assigns each service a PORT. Plain Vite otherwise uses 5173,
// leaving the service router waiting on the port it allocated.
const require = createRequire(import.meta.url);
const vite = join(dirname(require.resolve("vite/package.json")), "bin/vite.js");
const child = spawn(
  process.execPath,
  [
    vite,
    "--host",
    "127.0.0.1",
    "--port",
    process.env.PORT || "5173",
    ...process.argv.slice(2),
  ],
  { stdio: "inherit" },
);
child.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
