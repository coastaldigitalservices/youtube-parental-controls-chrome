import { rm } from "node:fs/promises";

const targets = process.argv.slice(2);
for (const target of targets.length ? targets : ["dist", ".build"]) {
  await rm(target, { recursive: true, force: true });
}
