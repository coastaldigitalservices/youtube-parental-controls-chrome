import { localDate } from "./date.js";
import { isStoredState, SCHEMA_VERSION, type DailyUsage, type Settings, type StoredState } from "./model.js";

export const STORAGE_KEY = "parentalControlsState";

export interface StorageArea {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

export const defaultSettings = (): Settings => ({
  setupComplete: false,
  dailyLimitSeconds: null,
  shortsLimitSeconds: null,
  pin: null
});

export function newUsage(date: string, now: Date): DailyUsage {
  return { date, regularSeconds: 0, shortsSeconds: 0, regularBonusSeconds: 0,
    shortsBonusSeconds: 0, revision: 0, updatedAt: now.toISOString() };
}

export function migrate(value: unknown, now: Date): StoredState {
  if (isStoredState(value)) return structuredClone(value);
  // Pre-versioned prototypes used watchedSeconds. Preserve that ordinary usage.
  if (typeof value === "object" && value !== null) {
    const old = value as Record<string, unknown>;
    if (typeof old.date === "string" && typeof old.watchedSeconds === "number" && old.watchedSeconds >= 0) {
      const usage = newUsage(old.date, now);
      usage.regularSeconds = old.watchedSeconds;
      return { schemaVersion: SCHEMA_VERSION, settings: defaultSettings(), usage };
    }
  }
  return { schemaVersion: SCHEMA_VERSION, settings: defaultSettings(), usage: newUsage(localDate(now), now) };
}

export class StateStore {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private readonly area: StorageArea, private readonly clock: () => Date = () => new Date()) {}

  async read(): Promise<StoredState> {
    return this.serial(async () => this.readCurrent());
  }

  async update(mutator: (state: StoredState) => void): Promise<StoredState> {
    return this.serial(async () => {
      const state = await this.readCurrent();
      mutator(state);
      state.usage.revision += 1;
      state.usage.updatedAt = this.clock().toISOString();
      await this.area.set({ [STORAGE_KEY]: state });
      return structuredClone(state);
    });
  }

  private async readCurrent(): Promise<StoredState> {
    const now = this.clock();
    const raw = (await this.area.get(STORAGE_KEY))[STORAGE_KEY];
    const state = migrate(raw, now);
    let dirty = !isStoredState(raw);
    const today = localDate(now);
    if (state.usage.date !== today) {
      state.usage = newUsage(today, now);
      dirty = true;
    }
    if (dirty) await this.area.set({ [STORAGE_KEY]: state });
    return structuredClone(state);
  }

  private serial<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.queue.then(operation, operation);
    this.queue = next.then(() => undefined, () => undefined);
    return next;
  }
}
