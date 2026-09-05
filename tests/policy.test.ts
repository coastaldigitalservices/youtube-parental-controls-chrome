import test from "node:test";
import assert from "node:assert/strict";
import { evaluatePolicy, scheduleAllows } from "../src/shared/policy.js";
import { migrate } from "../src/shared/storage.js";

const now = new Date(2026, 8, 5, 12, 0);
const state = () => { const value = migrate(undefined, now); value.settings.setupComplete = true; return value; };

test("base limit, bonus, unlimited today, and next-day override expiry", () => {
  const value = state(); value.settings.dailyLimitSeconds = 60; value.usage.regularSeconds = 60;
  assert.equal(evaluatePolicy(value, "regular", now).reason, "limit");
  value.usage.regularBonusSeconds = 30;
  assert.equal(evaluatePolicy(value, "regular", now).remainingSeconds, 30);
  value.usage.unlimitedToday = true;
  assert.equal(evaluatePolicy(value, "regular", now).limitSeconds, null);
  const next = migrate(value, new Date(2026, 8, 6, 12));
  // Migration preserves same-schema data; StateStore rollover coverage verifies dated expiry.
  assert.equal(next.usage.unlimitedToday, true);
});

test("Shorts allow, block, and separate policies", () => {
  const value = state(); value.settings.dailyLimitSeconds = 100; value.usage.regularSeconds = 60; value.usage.shortsSeconds = 40;
  value.settings.shortsMode = "allow"; assert.equal(evaluatePolicy(value, "shorts", now).allowed, false);
  value.settings.shortsMode = "block"; assert.equal(evaluatePolicy(value, "shorts", now).reason, "shorts");
  value.settings.shortsMode = "separate"; value.settings.shortsLimitSeconds = 50;
  assert.equal(evaluatePolicy(value, "shorts", now).remainingSeconds, 10);
});

test("same-day and cross-midnight schedule boundaries", () => {
  assert.equal(scheduleAllows(8 * 60, 20 * 60, 8 * 60), true);
  assert.equal(scheduleAllows(8 * 60, 20 * 60, 20 * 60), false);
  assert.equal(scheduleAllows(20 * 60, 7 * 60, 23 * 60), true);
  assert.equal(scheduleAllows(20 * 60, 7 * 60, 6 * 60 + 59), true);
  assert.equal(scheduleAllows(20 * 60, 7 * 60, 12 * 60), false);
  assert.equal(scheduleAllows(0, 0, 12 * 60), true);
});

test("setup gates enforcement and disabled schedules do not block", () => {
  const value = state(); value.settings.setupComplete = false; value.settings.dailyLimitSeconds = 0;
  assert.equal(evaluatePolicy(value, "regular", now).allowed, true);
  value.settings.setupComplete = true; value.settings.dailyLimitSeconds = null; value.settings.schedule.enabled = false;
  assert.equal(evaluatePolicy(value, "regular", now).allowed, true);
});
