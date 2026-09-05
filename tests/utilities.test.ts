import test from "node:test";
import assert from "node:assert/strict";
import { formatDuration } from "../src/shared/format.js";
import { isPlaybackReport } from "../src/shared/model.js";
import { isSemVer } from "../src/shared/version.js";

test("formats durations", () => {
  assert.equal(formatDuration(59), "0 min");
  assert.equal(formatDuration(5400), "1 hr 30 min");
});

test("validates SemVer", () => {
  assert.equal(isSemVer("1.2.3"), true);
  assert.equal(isSemVer("01.2.3"), false);
  assert.equal(isSemVer("1.2"), false);
});

test("rejects malformed playback messages", () => {
  assert.equal(isPlaybackReport({ type: "playback-state", sourceId: "x", bucket: "regular", progressing: true, observedAt: 1 }), true);
  assert.equal(isPlaybackReport({ type: "playback-state", sourceId: "x", bucket: "ads", progressing: true, observedAt: 1 }), false);
});
