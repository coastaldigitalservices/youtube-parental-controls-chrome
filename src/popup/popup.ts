import { formatDuration } from "../shared/format.js";
import type { PolicyStatus } from "../shared/policy.js";
import type { StoredState } from "../shared/model.js";

interface Response { status?: PolicyStatus; state?: StoredState }
const set = (selector: string, value: string): void => { const element = document.querySelector(selector); if (element) element.textContent = value; };
void chrome.runtime.sendMessage({ type: "get-status", bucket: "regular" }).then((raw) => {
  const { status, state } = raw as Response; if (!status || !state) return;
  set("#availability", status.allowed ? "Available now" : "Playback paused");
  set("#usage", `${formatDuration(status.usedSeconds)} used`);
  set("#remaining", status.remainingSeconds === null ? "No daily limit" : `${formatDuration(status.remainingSeconds)} remaining of ${formatDuration(status.limitSeconds ?? 0)}`);
  set("#shorts", `Shorts: ${state.settings.shortsMode === "separate" ? "separate timer" : state.settings.shortsMode === "block" ? "blocked" : "allowed"}`);
  set("#reset", `Resets ${new Date(status.nextReset).toLocaleString()}`);
  const progress = document.querySelector<HTMLProgressElement>("#progress");
  if (progress) { progress.max = status.limitSeconds ?? Math.max(1, status.usedSeconds); progress.value = status.usedSeconds; progress.hidden = status.limitSeconds === null; }
}).catch(() => { set("#availability", "Status unavailable"); set("#remaining", "Playback will pause until saved time can be verified."); });
document.querySelector("#settings")?.addEventListener("click", () => void chrome.runtime.openOptionsPage());
