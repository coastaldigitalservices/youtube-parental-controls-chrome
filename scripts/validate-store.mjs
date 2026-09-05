import { access, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import pkg from "../package.json" with { type: "json" };

const root = process.argv[2] ?? "dist";
const fail = (message) => { throw new Error(`Store package validation failed: ${message}`); };
let manifest;
try { manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8")); } catch (error) { fail(`manifest.json is absent or invalid JSON (${error.message})`); }
if (manifest.manifest_version !== 3) fail("manifest_version must be 3");
for (const field of ["name", "description", "version"]) if (typeof manifest[field] !== "string" || !manifest[field].trim()) fail(`${field} is required`);
if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) fail("version must be X.Y.Z");
if (manifest.version !== pkg.version) fail(`manifest ${manifest.version} does not match package.json ${pkg.version}`);
if (JSON.stringify(manifest.permissions ?? []) !== JSON.stringify(["storage"])) fail("only the storage permission is allowed");
if (JSON.stringify(manifest.host_permissions ?? []) !== JSON.stringify(["https://www.youtube.com/*"])) fail("host access must be limited to www.youtube.com");
if (manifest.content_security_policy?.extension_pages?.includes("http")) fail("remote extension-page code is forbidden");
const referenced = new Set([manifest.background?.service_worker, manifest.action?.default_popup, manifest.options_page]);
for (const values of [manifest.icons, manifest.action?.default_icon]) for (const value of Object.values(values ?? {})) referenced.add(value);
for (const script of manifest.content_scripts ?? []) for (const value of [...(script.js ?? []), ...(script.css ?? [])]) referenced.add(value);
for (const group of manifest.web_accessible_resources ?? []) for (const value of group.resources ?? []) {
  if (value.includes("*")) {
    const directory = path.dirname(value); const suffix = path.extname(value).slice(1);
    const matches = (await readdir(path.join(root, directory))).filter((entry) => !suffix || entry.endsWith(`.${suffix}`));
    if (!matches.length) fail(`web-accessible pattern ${value} matches nothing`);
  } else referenced.add(value);
}
for (const value of referenced) if (value) try { await access(path.join(root, value)); } catch { fail(`manifest-referenced asset is missing: ${value}`); }
if (!manifest.icons?.["128"]) fail("a 128x128 extension icon is required");
const png = await readFile(path.join(root, manifest.icons["128"]));
if (png.readUInt32BE(16) !== 128 || png.readUInt32BE(20) !== 128) fail("manifest 128 icon is not 128x128");
const files = [];
async function walk(directory) { for (const entry of await readdir(directory, { withFileTypes: true })) { const target = path.join(directory, entry.name); entry.isDirectory() ? await walk(target) : files.push(path.relative(root, target)); } }
await walk(root);
const forbidden = files.filter((file) => file.endsWith(".map") || /(^|\/)(tests?|fixtures?|node_modules|src|store)(\/|$)/.test(file) || /(^|\/)(package(?:-lock)?\.json|tsconfig.*|\.env.*)$/.test(file));
if (forbidden.length) fail(`development/store-only files found: ${forbidden.join(", ")}`);
const secretPattern = /(-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|CWS_(?:CLIENT_SECRET|REFRESH_TOKEN)\s*[=:]|AIza[0-9A-Za-z_-]{30,})/;
for (const file of files) { const info = await stat(path.join(root, file)); if (info.size <= 2_000_000 && secretPattern.test(await readFile(path.join(root, file)))) fail(`possible credential in ${file}`); }
console.log(`Validated ${files.length} production files: MV3, required assets, narrow permissions, no source maps/development files, and no recognizable secrets.`);
