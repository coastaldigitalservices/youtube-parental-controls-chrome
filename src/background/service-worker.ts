import { AccountingEngine, type Increment } from "../shared/accounting.js";
import { isPlaybackReport } from "../shared/model.js";
import { StateStore } from "../shared/storage.js";

const engine = new AccountingEngine();
const store = new StateStore(chrome.storage.local);
let pending: Increment = { regularSeconds: 0, shortsSeconds: 0 };
let operation = Promise.resolve();
const monotonicNow = (): number => performance.timeOrigin + performance.now();

function add(increment: Increment): void {
  pending.regularSeconds += increment.regularSeconds;
  pending.shortsSeconds += increment.shortsSeconds;
}

async function checkpoint(now = monotonicNow()): Promise<void> {
  add(engine.advance(now));
  if (pending.regularSeconds === 0 && pending.shortsSeconds === 0) return;
  const increment = pending;
  pending = { regularSeconds: 0, shortsSeconds: 0 };
  try {
    await store.update((state) => {
      state.usage.regularSeconds += increment.regularSeconds;
      state.usage.shortsSeconds += increment.shortsSeconds;
    });
  } catch (error) {
    add(increment);
    console.warn("[parental-controls] Usage checkpoint failed", error);
  }
}

function enqueue(task: () => Promise<void>): void {
  operation = operation.then(task, task);
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (!isPlaybackReport(message)) return;
  const tabId = sender.tab?.id;
  if (tabId === undefined) return;
  const identity = `${tabId}:${sender.frameId ?? 0}:${message.sourceId}`;
  enqueue(async () => {
    add(engine.report(identity, message, monotonicNow()));
    if (!message.progressing) await checkpoint();
  });
});

chrome.tabs.onRemoved.addListener((tabId) => enqueue(async () => {
  add(engine.removeWhere((identity) => identity.startsWith(`${tabId}:`), monotonicNow()));
  await checkpoint();
}));

const initialize = (): void => {
  engine.resetClock(); // Never infer playback during service-worker suspension.
  void store.read();
};
chrome.runtime.onStartup.addListener(initialize);
chrome.runtime.onInstalled.addListener(initialize);
initialize();
setInterval(() => enqueue(() => checkpoint()), 6_000);
