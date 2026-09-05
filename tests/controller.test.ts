import test from "node:test";
import assert from "node:assert/strict";
import { ParentController } from "../src/background/controller.js";
import { StateStore, type StorageArea } from "../src/shared/storage.js";

class MemoryStorage implements StorageArea {
  data: Record<string, unknown> = {};
  async get(): Promise<Record<string, unknown>> { return structuredClone(this.data); }
  async set(items: Record<string, unknown>): Promise<void> { Object.assign(this.data, structuredClone(items)); }
}
const setup = { pin: "2468", dailyLimitSeconds: 1800, shortsMode: "separate" as const, shortsLimitSeconds: 600,
  schedule: { enabled: false, startMinute: 480, endMinute: 1200 } };

test("setup is one-time and mutations require an unexpired session", async () => {
  const area = new MemoryStorage(); let now = new Date(2026, 8, 5, 12); const store = new StateStore(area, () => now);
  const controller = new ParentController(store, () => now, 300_000);
  assert.equal((await controller.setup(setup)).ok, true); assert.equal((await controller.setup(setup)).ok, false);
  now = new Date(now.getTime() + 300_001);
  assert.equal((await controller.mutate({ action: "unlimited-today" })).ok, false);
  assert.equal((await controller.authenticate("0000")).ok, false); assert.equal((await controller.authenticate("2468")).ok, true);
  assert.equal((await controller.mutate({ action: "add-bonus", bucket: "regular", seconds: 900 })).state?.usage.regularBonusSeconds, 900);
});

test("worker restart relocks parent session while preserving usage and overrides", async () => {
  const area = new MemoryStorage(); const now = new Date(2026, 8, 5, 12); const store = new StateStore(area, () => now);
  const first = new ParentController(store, () => now); await first.setup(setup);
  await store.update((state) => { state.usage.regularSeconds = 50; }); await first.mutate({ action: "unlimited-today" });
  const restarted = new ParentController(new StateStore(area, () => now), () => now);
  assert.equal((await restarted.mutate({ action: "reset-usage" })).ok, false);
  const restored = await store.read(); assert.equal(restored.usage.regularSeconds, 50); assert.equal(restored.usage.unlimitedToday, true);
});

test("dated overrides expire on restart after local midnight", async () => {
  const area = new MemoryStorage(); let now = new Date(2026, 8, 5, 23, 59); const store = new StateStore(area, () => now);
  const controller = new ParentController(store, () => now); await controller.setup(setup); await controller.mutate({ action: "unlimited-today" });
  now = new Date(2026, 8, 6, 0, 1); const restored = await new StateStore(area, () => now).read();
  assert.equal(restored.usage.unlimitedToday, false); assert.equal(restored.usage.regularBonusSeconds, 0);
});
