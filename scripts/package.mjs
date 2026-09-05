import { mkdir, rm, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import pkg from "../package.json" with { type: "json" };

const dryRun = process.argv.includes("--dry-run");
const output = `artifacts/youtube-parental-controls-${pkg.version}.zip`;
await mkdir("artifacts", { recursive: true });
await rm(output, { force: true });
const result = spawnSync("zip", ["-qr", `../${output}`, "."], { cwd: "dist", stdio: "inherit" });
if (result.status !== 0) process.exit(result.status ?? 1);
const details = await stat(output);
if (details.size === 0) throw new Error("Package artifact is empty");
console.log(`${dryRun ? "Dry-run created" : "Created"} ${output} (${details.size} bytes).`);
if (dryRun) await rm(output);
