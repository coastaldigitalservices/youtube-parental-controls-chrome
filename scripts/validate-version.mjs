import { readFile } from "node:fs/promises";

const pkg = JSON.parse(await readFile("package.json", "utf8"));
const manifest = JSON.parse(await readFile("manifest.json", "utf8"));
const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
if (!semver.test(pkg.version)) throw new Error("package.json version is not SemVer");
if (pkg.version !== manifest.version) throw new Error("Package and manifest versions differ");
console.log(`Version ${pkg.version} is consistent.`);
