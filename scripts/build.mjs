import { cp, mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const run = spawnSync("tsc", ["-p", "tsconfig.build.json"], { stdio: "inherit", shell: process.platform === "win32" });
if (run.status !== 0) process.exit(run.status ?? 1);
await mkdir("dist", { recursive: true });
await cp(".build", "dist", { recursive: true });
await cp("static", "dist", { recursive: true });
await cp("manifest.json", "dist/manifest.json");
