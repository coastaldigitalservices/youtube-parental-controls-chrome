import { mkdir, rm, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import pkg from "../package.json" with { type: "json" };

const dryRun = process.argv.includes("--dry-run");
const output = `artifacts/youtube-parental-controls-v${pkg.version}.zip`;
await mkdir("artifacts", { recursive: true });
await rm(output, { force: true });
const result = spawnSync("zip", ["-qr", `../${output}`, "."], { cwd: "dist", stdio: "inherit" });
if (result.status !== 0) process.exit(result.status ?? 1);
const listing = spawnSync("unzip", ["-Z1", output], { encoding: "utf8" });
if (listing.status !== 0) process.exit(listing.status ?? 1);
const entries = listing.stdout.trim().split("\n");
const forbidden = entries.filter((entry) => entry.endsWith(".map") || /(^|\/)(tests?|fixtures?|node_modules|src)(\/|$)/.test(entry));
if (forbidden.length > 0) throw new Error(`Package contains development-only files: ${forbidden.join(", ")}`);
const details = await stat(output);
if (details.size === 0) throw new Error("Package artifact is empty");
console.log(`${dryRun ? "Dry-run created" : "Created"} ${output} (${details.size} bytes).`);
if (dryRun) await rm(output);
