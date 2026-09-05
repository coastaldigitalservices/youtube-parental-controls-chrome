import test from "node:test";
import assert from "node:assert/strict";
import { localDate } from "../src/shared/date.js";
import { SCHEMA_VERSION } from "../src/shared/model.js";
import { StateStore, STORAGE_KEY, type StorageArea } from "../src/shared/storage.js";

class MemoryStorage implements StorageArea {
  data: Record<string, unknown> = {};
  async get(): Promise<Record<string, unknown>> { return structuredClone(this.data); }
  async set(items: Record<string, unknown>): Promise<void> { Object.assign(this.data, structuredClone(items)); }
}

test("creates validated defaults and preserves settings across local-day rollover", async () => {
  const area = new MemoryStorage();
  let now = new Date(2026, 8, 5, 23, 59, 58);
  const store = new StateStore(area, () => now);
  await store.update((state) => { state.settings.dailyLimitSeconds = 3600; state.usage.regularSeconds = 42; });
  now = new Date(2026, 8, 6, 0, 0, 1);
  const next = await store.read();
  assert.equal(next.usage.date, localDate(now));
  assert.equal(next.usage.regularSeconds, 0);
  assert.equal(next.settings.dailyLimitSeconds, 3600);
});

test("timezone-offset and DST-shaped dates use calendar components", () => {
  assert.equal(localDate(new Date(2026, 2, 8, 0, 1)), "2026-03-08");
  assert.equal(localDate(new Date(2026, 10, 1, 23, 59)), "2026-11-01");
});

test("migrates pre-version usage without erasing it", async () => {
  const area = new MemoryStorage();
  area.data[STORAGE_KEY] = { date: "2026-09-05", watchedSeconds: 73 };
  const state = await new StateStore(area, () => new Date(2026, 8, 5, 12)).read();
  assert.equal(state.schemaVersion, SCHEMA_VERSION);
  assert.equal(state.usage.regularSeconds, 73);
});

test("mandatory restart regression reloads and continues persisted usage", async () => {
  const area = new MemoryStorage();
  const clock = () => new Date(2026, 8, 5, 12);
  await new StateStore(area, clock).update((state) => { state.usage.regularSeconds += 8; });
  // Discard every in-memory object, as a service-worker restart does.
  await new StateStore(area, clock).update((state) => { state.usage.regularSeconds += 6; });
  const restored = await new StateStore(area, clock).read();
  assert.equal(restored.usage.regularSeconds, 14);
  assert.ok(restored.usage.revision >= 2);
});
