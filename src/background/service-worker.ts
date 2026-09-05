import { AccountingEngine, type Increment } from "../shared/accounting.js";
import { isPlaybackReport, type ExtensionMessage } from "../shared/model.js";
import { StateStore } from "../shared/storage.js";
import { ParentController } from "./controller.js";

const engine = new AccountingEngine(); const store = new StateStore(chrome.storage.local); const controller = new ParentController(store);
let pending: Increment = { regularSeconds: 0, shortsSeconds: 0 }; let operation = Promise.resolve();
const monotonicNow = (): number => performance.timeOrigin + performance.now();
function add(increment: Increment): void { pending.regularSeconds += increment.regularSeconds; pending.shortsSeconds += increment.shortsSeconds; }
async function checkpoint(now = monotonicNow()): Promise<void> {
  add(engine.advance(now)); if (pending.regularSeconds === 0 && pending.shortsSeconds === 0) return;
  const increment = pending; pending = { regularSeconds: 0, shortsSeconds: 0 };
  try { await store.update((state) => { state.usage.regularSeconds += increment.regularSeconds; state.usage.shortsSeconds += increment.shortsSeconds; }); }
  catch (error) { add(increment); console.warn("[parental-controls] Usage checkpoint failed", error); }
}
function enqueue(task: () => Promise<void>): void { operation = operation.then(task, task); }

chrome.runtime.onMessage.addListener((raw, sender, sendResponse) => {
  if (isPlaybackReport(raw)) {
    const tabId = sender.tab?.id; if (tabId === undefined) return false; const identity = `${tabId}:${sender.frameId ?? 0}:${raw.sourceId}`;
    enqueue(async () => { add(engine.report(identity, raw, monotonicNow())); if (!raw.progressing) await checkpoint(); }); return false;
  }
  if (typeof raw !== "object" || raw === null || !("type" in raw)) return false;
  const message = raw as ExtensionMessage;
  const respond = async (): Promise<void> => {
    await checkpoint();
    if (message.type === "get-status") sendResponse(await controller.status(message.bucket ?? "regular"));
    else if (message.type === "authenticate") sendResponse(await controller.authenticate(message.pin));
    else if (message.type === "setup") sendResponse(await controller.setup(message));
    else if (message.type === "parent-mutation") sendResponse(await controller.mutate(message.mutation));
  };
  void respond().catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : "Request failed." })); return true;
});
chrome.tabs.onRemoved.addListener((tabId) => enqueue(async () => { add(engine.removeWhere((identity) => identity.startsWith(`${tabId}:`), monotonicNow())); await checkpoint(); }));
const initialize = (): void => { engine.resetClock(); void store.read(); };
chrome.runtime.onStartup.addListener(initialize); chrome.runtime.onInstalled.addListener(initialize); initialize();
setInterval(() => enqueue(() => checkpoint()), 6_000);
