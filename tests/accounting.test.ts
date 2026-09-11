import test from "node:test";
import assert from "node:assert/strict";
import { emptyAccountingMetadata, IntervalAccounting } from "../src/shared/accounting.js";
import type { Bucket, WatchInterval } from "../src/shared/model.js";
import { StateStore, type StorageArea } from "../src/shared/storage.js";

const interval = (sourceId: string, sequence: number, startMs: number, endMs: number, bucket: Bucket = "regular"): WatchInterval =>
  ({ type: "watch-interval", sourceId, sequence, bucket, startMs, endMs });
const seconds = (items: ReturnType<IntervalAccounting["apply"]>, bucket: Bucket = "regular"): number =>
  items.reduce((total, item) => total + (bucket === "regular" ? item.regularSeconds : item.shortsSeconds), 0);

test("deduplicates retrying the same source sequence", () => {
  const engine = new IntervalAccounting(); const metadata = emptyAccountingMetadata(); const report = interval("a", 42, 0, 5_000);
  assert.equal(seconds(engine.apply(metadata, report)), 5);
  assert.equal(seconds(engine.apply(metadata, report)), 0);
});

test("merges overlapping multi-tab intervals instead of summing playback", () => {
  const engine = new IntervalAccounting(); const metadata = emptyAccountingMetadata();
  assert.equal(seconds(engine.apply(metadata, interval("a", 1, 0, 10_000))), 10);
  assert.equal(seconds(engine.apply(metadata, interval("b", 1, 2_000, 8_000))), 0);
});

test("counts adjacent and disjoint intervals exactly once", () => {
  const engine = new IntervalAccounting(); const metadata = emptyAccountingMetadata();
  const reports = [interval("a", 1, 0, 5_000), interval("a", 2, 5_000, 10_000), interval("a", 3, 15_000, 20_000)];
  assert.equal(reports.reduce((total, report) => total + seconds(engine.apply(metadata, report)), 0), 15);
});

test("attributes unique elapsed time to regular and Shorts buckets", () => {
  const engine = new IntervalAccounting(); const metadata = emptyAccountingMetadata();
  assert.equal(seconds(engine.apply(metadata, interval("regular", 1, 0, 4_000))), 4);
  assert.equal(seconds(engine.apply(metadata, interval("shorts", 1, 4_000, 7_000, "shorts")), "shorts"), 3);
});

test("splits an interval at local midnight", () => {
  const engine = new IntervalAccounting(); const metadata = emptyAccountingMetadata();
  const start = new Date(2026, 8, 5, 23, 59, 58).getTime();
  assert.deepEqual(engine.apply(metadata, interval("a", 1, start, start + 5_000)), [
    { date: "2026-09-05", regularSeconds: 2, shortsSeconds: 0 },
    { date: "2026-09-06", regularSeconds: 3, shortsSeconds: 0 },
  ]);
});

class MemoryStorage implements StorageArea {
  data: Record<string, unknown> = {};
  async get(): Promise<Record<string, unknown>> { return structuredClone(this.data); }
  async set(items: Record<string, unknown>): Promise<void> { Object.assign(this.data, structuredClone(items)); }
}

test("worker restart during 60 seconds of playback loses no committed interval", async () => {
  const area = new MemoryStorage(); const now = new Date(2026, 8, 5, 12); const base = now.getTime();
  for (let index = 0; index < 12; index++) {
    const store = index === 2 ? new StateStore(area, () => now) : new StateStore(area, () => now);
    await store.recordWatchInterval(interval("video", index, base + index * 5_000, base + (index + 1) * 5_000));
  }
  assert.equal((await new StateStore(area, () => now).read()).usage.regularSeconds, 60);
});

test("repeated worker death and delivery retry remain exactly-once-ish", async () => {
  const area = new MemoryStorage(); const now = new Date(2026, 8, 5, 12); const base = now.getTime();
  for (let index = 0; index < 20; index++) {
    const report = interval("video", index, base + index * 3_000, base + (index + 1) * 3_000);
    await new StateStore(area, () => now).recordWatchInterval(report);
    await new StateStore(area, () => now).recordWatchInterval(report);
  }
  assert.equal((await new StateStore(area, () => now).read()).usage.regularSeconds, 60);
});

test("cross-midnight persistence rolls forward with only the new-day portion", async () => {
  const area = new MemoryStorage(); let now = new Date(2026, 8, 5, 23, 59, 59); const store = new StateStore(area, () => now);
  await store.read(); const start = new Date(2026, 8, 5, 23, 59, 58).getTime(); now = new Date(start + 5_000);
  const state = await store.recordWatchInterval(interval("midnight", 1, start, start + 5_000));
  assert.equal(state.usage.date, "2026-09-06"); assert.equal(state.usage.regularSeconds, 3);
});

test("paused, stalled, and playback-speed behavior is represented by verified wall intervals", () => {
  const engine = new IntervalAccounting(); const metadata = emptyAccountingMetadata();
  // No report is emitted while paused/stalled. At 2x, a five-real-second verified interval is still five seconds.
  assert.equal(seconds(engine.apply(metadata, interval("2x-video", 1, 100_000, 105_000))), 5);
});
