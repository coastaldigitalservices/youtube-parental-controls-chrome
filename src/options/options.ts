import type { Schedule, ShortsMode, StoredState } from "../shared/model.js";
import { formatDuration } from "../shared/format.js";

interface Response { ok: boolean; error?: string; state?: StoredState }
const element = <T extends HTMLElement>(id: string): T => document.querySelector<T>(`#${id}`) as T;
const value = (id: string): string => element<HTMLInputElement>(id).value;
const minutes = (id: string): number | null => value(id).trim() === "" ? null : Number(value(id)) * 60;
const clockMinute = (id: string): number => { const [hour = "0", minute = "0"] = value(id).split(":"); return Number(hour) * 60 + Number(minute); };
const timeValue = (minute: number): string => `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
const schedule = (): Schedule => ({ enabled: element<HTMLInputElement>("schedule-enabled").checked, startMinute: clockMinute("schedule-start"), endMinute: clockMinute("schedule-end") });
function message(text: string, error = false): void { const node = element("message"); node.textContent = text; node.style.color = error ? "#a52626" : "#18733c"; }
async function send(payload: unknown): Promise<Response> { const response = await chrome.runtime.sendMessage(payload) as Response; message(response.ok ? "Saved." : response.error ?? "Request failed.", !response.ok); if (response.state) render(response.state, true); return response; }
function render(state: StoredState, unlocked = false): void {
  element("welcome").classList.toggle("hidden", state.settings.setupComplete); element("unlock").classList.toggle("hidden", !state.settings.setupComplete || unlocked); element("controls").classList.toggle("hidden", !unlocked);
  if (!state.settings.setupComplete || !unlocked) return;
  element("today").textContent = `${formatDuration(state.usage.regularSeconds)} regular and ${formatDuration(state.usage.shortsSeconds)} Shorts used today.`;
  element<HTMLInputElement>("daily-limit").value = state.settings.dailyLimitSeconds === null ? "" : String(state.settings.dailyLimitSeconds / 60);
  element<HTMLSelectElement>("shorts-mode").value = state.settings.shortsMode; element<HTMLInputElement>("shorts-limit").value = state.settings.shortsLimitSeconds === null ? "" : String(state.settings.shortsLimitSeconds / 60);
  element<HTMLInputElement>("schedule-enabled").checked = state.settings.schedule.enabled; element<HTMLInputElement>("schedule-start").value = timeValue(state.settings.schedule.startMinute); element<HTMLInputElement>("schedule-end").value = timeValue(state.settings.schedule.endMinute);
}
void chrome.runtime.sendMessage({ type: "get-status", bucket: "regular" }).then((raw) => { const response = raw as Response; if (response.state) render(response.state); });
element("complete-setup").addEventListener("click", () => void send({ type: "setup", pin: value("setup-pin"), dailyLimitSeconds: minutes("setup-limit"), shortsMode: "allow", shortsLimitSeconds: 900, schedule: { enabled: false, startMinute: 480, endMinute: 1200 } }));
element("unlock-button").addEventListener("click", async () => { const response = await send({ type: "authenticate", pin: value("unlock-pin") }); if (response.ok) { const status = await chrome.runtime.sendMessage({ type: "get-status" }) as Response; if (status.state) render(status.state, true); } });
element("save").addEventListener("click", () => void send({ type: "parent-mutation", mutation: { action: "save-settings", dailyLimitSeconds: minutes("daily-limit"), shortsMode: element<HTMLSelectElement>("shorts-mode").value as ShortsMode, shortsLimitSeconds: minutes("shorts-limit"), schedule: schedule() } }));
document.querySelectorAll<HTMLButtonElement>("[data-bonus]").forEach((button) =>
  button.addEventListener("click", () => void send({ type: "parent-mutation", mutation: { action: "add-bonus", bucket: "regular", seconds: Number(button.dataset.bonus) } })));
element("unlimited").addEventListener("click", () => void send({ type: "parent-mutation", mutation: { action: "unlimited-today" } }));
element("reset-usage").addEventListener("click", () => { if (confirm("Reset all of today’s recorded usage?")) void send({ type: "parent-mutation", mutation: { action: "reset-usage" } }); });
element("change-pin").addEventListener("click", () => void send({ type: "parent-mutation", mutation: { action: "change-pin", pin: value("new-pin") } }));
element("reset-all").addEventListener("click", () => { if (value("reset-confirmation") === "RESET" && confirm("Erase all controls and usage? This cannot be undone.")) void send({ type: "parent-mutation", mutation: { action: "reset-all", confirmation: "RESET" } }); else message("Reset cancelled. Type RESET and confirm.", true); });
