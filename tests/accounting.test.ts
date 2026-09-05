import test from "node:test";
import assert from "node:assert/strict";
import { AccountingEngine } from "../src/shared/accounting.js";
import type { Bucket, PlaybackReport } from "../src/shared/model.js";

const report = (bucket: Bucket, observedAt: number, progressing = true): PlaybackReport =>
  ({ type: "playback-state", sourceId: "source", bucket, observedAt, progressing });

test("counts elapsed wall time rather than playback rate or media time", () => {
  const engine = new AccountingEngine();
  engine.report("tab-1", report("regular", 0), 0);
  assert.deepEqual(engine.advance(5_000), { regularSeconds: 5, shortsSeconds: 0 });
});

test("deduplicates concurrent regular tabs", () => {
  const engine = new AccountingEngine();
  engine.report("tab-1", report("regular", 0), 0);
  engine.report("tab-2", report("regular", 1_000), 1_000);
  assert.deepEqual(engine.advance(6_000), { regularSeconds: 5, shortsSeconds: 0 });
});

test("attributes mixed playback to the most recently verified source", () => {
  const engine = new AccountingEngine();
  engine.report("regular", report("regular", 0), 0);
  engine.report("short", report("shorts", 1_000), 1_000);
  assert.deepEqual(engine.advance(4_000), { regularSeconds: 0, shortsSeconds: 3 });
  engine.report("regular", report("regular", 5_000), 5_000);
  assert.deepEqual(engine.advance(7_000), { regularSeconds: 2, shortsSeconds: 0 });
});

test("pause and ended reports stop accounting immediately", () => {
  const engine = new AccountingEngine();
  engine.report("tab", report("regular", 0), 0);
  assert.deepEqual(engine.report("tab", report("regular", 3_000, false), 3_000), { regularSeconds: 3, shortsSeconds: 0 });
  assert.deepEqual(engine.advance(8_000), { regularSeconds: 0, shortsSeconds: 0 });
});

test("buffering or vanished sources expire and unreasonable gaps are not backfilled", () => {
  const engine = new AccountingEngine(15_000, 10_000);
  engine.report("tab", report("regular", 0), 0);
  assert.deepEqual(engine.advance(20_000), { regularSeconds: 0, shortsSeconds: 0 });
});
