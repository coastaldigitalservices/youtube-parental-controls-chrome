import { readFile } from "node:fs/promises";

const path = process.argv[2] ?? "dist/manifest.json";
const manifest = JSON.parse(await readFile(path, "utf8"));
const allowed = new Set(["storage"]);
if (manifest.manifest_version !== 3) throw new Error("manifest_version must be 3");
if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) throw new Error("Manifest version must be SemVer-compatible");
if (!manifest.permissions.every((permission) => allowed.has(permission))) throw new Error("Manifest has an unexpected permission");
if (JSON.stringify(manifest.host_permissions) !== JSON.stringify(["https://www.youtube.com/*"])) throw new Error("Host access must remain limited to YouTube");
console.log(`${path} is a valid, narrowly-permissioned MV3 manifest.`);
