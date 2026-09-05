import type { Bucket, PlaybackReport } from "../shared/model.js";
import type { PolicyStatus } from "../shared/policy.js";
import { formatDuration } from "../shared/format.js";
import { YouTubeVideoAdapter } from "./youtube-video-adapter.js";

const VERIFY_MS = 2_000; const HEARTBEAT_MS = 5_000; const MIN_PROGRESS_SECONDS = 0.05; const sourceId = crypto.randomUUID();
let priorMediaTime: number | null = null; let lastProgressAt = 0; let lastSentProgressing: boolean | null = null; let lastSentAt = 0;
let blocked = false; let lastBucket: Bucket = bucket();
const adapter = new YouTubeVideoAdapter({ onPotentialChange: () => { verify(true); void refreshPolicy(); }, shouldBlockPlayback: () => blocked });
function bucket(): Bucket { return location.pathname.startsWith("/shorts/") ? "shorts" : "regular"; }

function verify(force = false): void {
  const now = Date.now(); const video = adapter.current(); let advancing = false;
  if (video && !video.paused && !video.ended && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && !blocked) {
    if (priorMediaTime !== null && video.currentTime - priorMediaTime >= MIN_PROGRESS_SECONDS) lastProgressAt = now;
    advancing = lastProgressAt > 0 && now - lastProgressAt <= VERIFY_MS * 1.5; priorMediaTime = video.currentTime;
  } else { priorMediaTime = video?.currentTime ?? null; lastProgressAt = 0; }
  if (force || advancing !== lastSentProgressing || now - lastSentAt >= HEARTBEAT_MS) {
    const report: PlaybackReport = { type: "playback-state", sourceId, bucket: bucket(), progressing: advancing, observedAt: now };
    void chrome.runtime.sendMessage(report).catch(() => undefined); lastSentProgressing = advancing; lastSentAt = now;
  }
}

async function refreshPolicy(): Promise<void> {
  const currentBucket = bucket();
  try {
    const response = await chrome.runtime.sendMessage({ type: "get-status", bucket: currentBucket }) as { status?: PolicyStatus; warning?: number; state?: { settings?: { experience?: import("../shared/model.js").ExperienceControls } } };
    if (!response.status) { renderReliabilityError(); return; } blocked = !response.status.allowed;
    if (response.state?.settings?.experience) adapter.applyExperienceControls(response.state.settings.experience);
    if (blocked) { adapter.pause(); renderOverlay(response.status); } else removeOverlay();
    if (response.warning) showToast(`${formatDuration(response.warning)} of YouTube time remaining`);
    if (currentBucket !== lastBucket) { lastBucket = currentBucket; verify(true); }
  } catch { renderReliabilityError(); /* The next heartbeat retries after a worker restart. */ }
}

function renderReliabilityError(): void {
  adapter.pause(); blocked = true;
  renderOverlay({ allowed: false, reason: "storage", usedSeconds: 0, limitSeconds: null,
    remainingSeconds: null, nextReset: new Date(Date.now() + 60_000).toISOString(), nextAvailable: null, bucket: bucket() });
}

function renderOverlay(status: PolicyStatus): void {
  let overlay = document.querySelector<HTMLElement>("#yt-parental-controls-overlay");
  if (!overlay) {
    overlay = document.createElement("section"); overlay.id = "yt-parental-controls-overlay"; overlay.setAttribute("role", "dialog"); overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML = `<div><h2></h2><p class="detail"></p><p class="next"></p><button type="button">Parent settings</button></div>`;
    const style = document.createElement("style"); style.id = "yt-parental-controls-style";
    style.textContent = `#yt-parental-controls-overlay{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;background:rgba(10,15,25,.88);font:16px system-ui;color:#172033}#yt-parental-controls-overlay>div{max-width:440px;margin:24px;padding:32px;border-radius:20px;background:#fff;box-shadow:0 18px 60px #0008;text-align:center}#yt-parental-controls-overlay h2{font-size:27px;margin:0 0 12px}#yt-parental-controls-overlay button{border:0;border-radius:999px;padding:12px 20px;background:#2855d9;color:white;font-weight:700;cursor:pointer}`;
    document.documentElement.append(style, overlay); overlay.querySelector("button")?.addEventListener("click", () => void chrome.runtime.openOptionsPage());
  }
  const title = status.reason === "shorts" ? "Shorts are turned off" : status.reason === "schedule" ? "YouTube is not available right now" : status.reason === "storage" ? "Playback paused for safety" : "Daily YouTube time is finished";
  const detail = status.reason === "storage" ? "The extension cannot verify the saved allowance. Reload this page or ask a parent for help." : status.limitSeconds === null ? "Playback is paused by the family schedule." : `${formatDuration(status.usedSeconds)} used of ${formatDuration(status.limitSeconds)}.`;
  const when = status.nextAvailable ?? status.nextReset; const date = new Date(when);
  const heading = overlay.querySelector("h2"); const detailNode = overlay.querySelector(".detail"); const next = overlay.querySelector(".next");
  if (heading) heading.textContent = title; if (detailNode) detailNode.textContent = detail; if (next) next.textContent = `Available ${date.toLocaleString()}.`;
}
function removeOverlay(): void { document.querySelector("#yt-parental-controls-overlay")?.remove(); }
function showToast(message: string): void {
  const toast = document.createElement("div"); toast.textContent = message; toast.setAttribute("role", "status");
  toast.style.cssText = "position:fixed;right:24px;bottom:24px;z-index:2147483646;background:#172033;color:white;padding:14px 20px;border-radius:10px;font:600 15px system-ui;box-shadow:0 8px 30px #0006";
  document.documentElement.append(toast); setTimeout(() => toast.remove(), 5_000);
}

adapter.start(); setInterval(() => { verify(); void refreshPolicy(); }, VERIFY_MS); void refreshPolicy();
window.addEventListener("pagehide", () => { const report: PlaybackReport = { type: "playback-state", sourceId, bucket: bucket(), progressing: false, observedAt: Date.now() }; void chrome.runtime.sendMessage(report).catch(() => undefined); });
