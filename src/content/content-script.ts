import type { Bucket, PlaybackReport } from "../shared/model.js";
import { YouTubeVideoAdapter } from "./youtube-video-adapter.js";

const VERIFY_MS = 2_000;
const HEARTBEAT_MS = 5_000;
const MIN_PROGRESS_SECONDS = 0.05;
const sourceId = crypto.randomUUID();
let priorMediaTime: number | null = null;
let lastProgressAt = 0;
let lastSentProgressing: boolean | null = null;
let lastSentAt = 0;

const adapter = new YouTubeVideoAdapter({ onPotentialChange: () => verify(true) });

function bucket(): Bucket {
  return location.pathname.startsWith("/shorts/") ? "shorts" : "regular";
}

function verify(force = false): void {
  const now = Date.now();
  const video = adapter.current();
  let advancing = false;
  if (video && !video.paused && !video.ended && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    if (priorMediaTime !== null && video.currentTime - priorMediaTime >= MIN_PROGRESS_SECONDS) {
      lastProgressAt = now;
    }
    // A recent time advance bridges the short interval between verification ticks.
    advancing = lastProgressAt > 0 && now - lastProgressAt <= VERIFY_MS * 1.5;
    priorMediaTime = video.currentTime;
  } else {
    priorMediaTime = video?.currentTime ?? null;
    lastProgressAt = 0;
  }
  if (force || advancing !== lastSentProgressing || now - lastSentAt >= HEARTBEAT_MS) {
    const report: PlaybackReport = { type: "playback-state", sourceId, bucket: bucket(), progressing: advancing, observedAt: now };
    void chrome.runtime.sendMessage(report).catch(() => undefined);
    lastSentProgressing = advancing;
    lastSentAt = now;
  }
}

adapter.start();
setInterval(() => verify(), VERIFY_MS);
window.addEventListener("pagehide", () => {
  const report: PlaybackReport = { type: "playback-state", sourceId, bucket: bucket(), progressing: false, observedAt: Date.now() };
  void chrome.runtime.sendMessage(report).catch(() => undefined);
});
