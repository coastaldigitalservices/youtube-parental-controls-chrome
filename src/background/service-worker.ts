import { isWatchInterval, type ExtensionMessage } from "../shared/model.js";
import { StateStore } from "../shared/storage.js";
import { ParentController } from "./controller.js";

// Deliberately no live playback state: every message contains elapsed time and is committed atomically.
const store = new StateStore(chrome.storage.local); const controller = new ParentController(store);
const workerStartedAt = Date.now();

chrome.runtime.onMessage.addListener((raw, sender, sendResponse) => {
  if (isWatchInterval(raw)) {
    if (sender.tab?.id === undefined) return false;
    void store.recordWatchInterval(raw).then((state) => {
      if (raw.debug) console.debug("[parental-controls] worker diagnostics", { workerStartedAt,
        sourceId: raw.sourceId, lastProcessedSequence: state.accounting.sources[raw.sourceId]?.sequence,
        regularSeconds: state.usage.regularSeconds, shortsSeconds: state.usage.shortsSeconds });
      sendResponse({ ok: true, state });
    })
      .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : "Usage persistence failed." }));
    return true;
  }
  if (typeof raw !== "object" || raw === null || !("type" in raw)) return false;
  const message = raw as ExtensionMessage;
  const respond = async (): Promise<void> => {
    if (message.type === "get-status") sendResponse(await controller.status(message.bucket ?? "regular"));
    else if (message.type === "authenticate") sendResponse(await controller.authenticate(message.pin));
    else if (message.type === "setup") sendResponse(await controller.setup(message));
    else if (message.type === "parent-mutation") sendResponse(await controller.mutate(message.mutation));
  };
  void respond().catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : "Request failed." })); return true;
});

const initialize = (): void => { void store.read(); };
chrome.runtime.onStartup.addListener(initialize); chrome.runtime.onInstalled.addListener(initialize); initialize();
