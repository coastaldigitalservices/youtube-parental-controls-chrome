import { readFile } from "node:fs/promises";
import pkg from "../package.json" with { type: "json" };

const required = ["CWS_CLIENT_ID", "CWS_CLIENT_SECRET", "CWS_REFRESH_TOKEN", "CWS_PUBLISHER_ID", "CWS_EXTENSION_ID"];
for (const name of required) if (!process.env[name]) throw new Error(`Missing required secret/variable: ${name}`);
const artifact = process.argv[2];
if (!artifact) throw new Error("Usage: node scripts/publish-cws-v2.mjs <zip>");
const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: process.env.CWS_CLIENT_ID, client_secret: process.env.CWS_CLIENT_SECRET, refresh_token: process.env.CWS_REFRESH_TOKEN, grant_type: "refresh_token" }) });
if (!tokenResponse.ok) throw new Error(`OAuth token request failed (${tokenResponse.status}); response suppressed to protect credentials`);
const { access_token: token } = await tokenResponse.json();
if (!token) throw new Error("OAuth response did not contain an access token");
const base = `https://chromewebstore.googleapis.com/v2/publishers/${encodeURIComponent(process.env.CWS_PUBLISHER_ID)}/items/${encodeURIComponent(process.env.CWS_EXTENSION_ID)}`;
const uploadUrl = `https://chromewebstore.googleapis.com/upload/v2/publishers/${encodeURIComponent(process.env.CWS_PUBLISHER_ID)}/items/${encodeURIComponent(process.env.CWS_EXTENSION_ID)}`;
async function api(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { authorization: `Bearer ${token}`, ...(options.headers ?? {}) } });
  const body = await response.text(); let data; try { data = body ? JSON.parse(body) : {}; } catch { data = { message: body.slice(0, 500) }; }
  if (!response.ok || data.error) throw new Error(`Chrome Web Store API v2 failed (${response.status}): ${JSON.stringify(data.error ?? data)}`);
  return data;
}
const upload = await api(uploadUrl, { method: "POST", headers: { "content-type": "application/zip" }, body: await readFile(artifact) });
const uploadState = String(upload.uploadState ?? upload.upload_state ?? upload.status ?? "").toUpperCase();
if (uploadState && !["SUCCEEDED", "SUCCESS", "UPLOAD_STATE_SUCCEEDED"].includes(uploadState)) throw new Error(`Chrome Web Store rejected upload: ${JSON.stringify(upload)}`);
console.log(`Chrome Web Store API v2 accepted version ${pkg.version}.`);
const status = await api(`${base}:fetchStatus`, { method: "GET" });
const itemVersion = status.itemVersion ?? status.item_version ?? status.version;
if (itemVersion && itemVersion !== pkg.version) throw new Error(`Uploaded item reports version ${itemVersion}, expected ${pkg.version}`);
const publish = await api(`${base}:publish`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) });
const publishState = String(publish.status ?? publish.state ?? "").toUpperCase();
if (publishState.includes("FAIL") || publishState.includes("ERROR")) throw new Error(`Publication submission failed: ${JSON.stringify(publish)}`);
console.log(`Submitted ${process.env.CWS_EXTENSION_ID} for review/publication; existing dashboard visibility is unchanged.`);
