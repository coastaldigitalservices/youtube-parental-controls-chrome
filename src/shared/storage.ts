import { localDate } from "./date.js";
import { isStoredState, SCHEMA_VERSION, type DailyUsage, type Settings, type StoredState } from "./model.js";

export const STORAGE_KEY = "parentalControlsState";
export interface StorageArea { get(key: string): Promise<Record<string, unknown>>; set(items: Record<string, unknown>): Promise<void>; clear?(): Promise<void> }

export const defaultSettings = (): Settings => ({ setupComplete: false, dailyLimitSeconds: 3600,
  shortsMode: "allow", shortsLimitSeconds: 900, schedule: { enabled: false, startMinute: 8 * 60, endMinute: 20 * 60 }, pin: null,
  experience: { disableAutoplay: false, hideShorts: false, hideComments: false, hideLiveChat: false,
    hideRecommendations: false, hideHomeFeed: false } });

export function newUsage(date: string, now: Date): DailyUsage {
  return { date, regularSeconds: 0, shortsSeconds: 0, regularBonusSeconds: 0, shortsBonusSeconds: 0,
    unlimitedToday: false, warningsShown: [], revision: 0, updatedAt: now.toISOString() };
}

export function migrate(value: unknown, now: Date): StoredState {
  if (isStoredState(value)) return structuredClone(value);
  if (typeof value === "object" && value !== null) {
    const old = value as Record<string, unknown>;
    if ((old.schemaVersion === 1 || old.schemaVersion === 2) && typeof old.settings === "object" && old.settings && typeof old.usage === "object" && old.usage) {
      const settings = { ...defaultSettings(), ...(old.settings as Partial<Settings>),
        experience: { ...defaultSettings().experience, ...((old.settings as Partial<Settings>).experience ?? {}) } };
      const prior = old.usage as Partial<DailyUsage>;
      const usage = { ...newUsage(typeof prior.date === "string" ? prior.date : localDate(now), now), ...prior,
        unlimitedToday: old.schemaVersion === 1 ? false : prior.unlimitedToday ?? false,
        warningsShown: old.schemaVersion === 1 ? [] : prior.warningsShown ?? [] };
      return { schemaVersion: SCHEMA_VERSION, settings, usage };
    }
    if (typeof old.date === "string" && typeof old.watchedSeconds === "number" && old.watchedSeconds >= 0) {
      const usage = newUsage(old.date, now); usage.regularSeconds = old.watchedSeconds;
      return { schemaVersion: SCHEMA_VERSION, settings: defaultSettings(), usage };
    }
  }
  return { schemaVersion: SCHEMA_VERSION, settings: defaultSettings(), usage: newUsage(localDate(now), now) };
}

export class StateStore {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private readonly area: StorageArea, private readonly clock: () => Date = () => new Date()) {}
  async read(): Promise<StoredState> { return this.serial(async () => this.readCurrent()); }
  async update(mutator: (state: StoredState) => void): Promise<StoredState> {
    return this.serial(async () => { const state = await this.readCurrent(); mutator(state); state.usage.revision += 1;
      state.usage.updatedAt = this.clock().toISOString(); await this.area.set({ [STORAGE_KEY]: state }); return structuredClone(state); });
  }
  async reset(): Promise<StoredState> {
    return this.serial(async () => { const state = migrate(undefined, this.clock()); await this.area.set({ [STORAGE_KEY]: state }); return structuredClone(state); });
  }
  private async readCurrent(): Promise<StoredState> {
    const now = this.clock(); const raw = (await this.area.get(STORAGE_KEY))[STORAGE_KEY]; const state = migrate(raw, now);
    let dirty = !isStoredState(raw); const today = localDate(now);
    if (state.usage.date !== today) { state.usage = newUsage(today, now); dirty = true; }
    if (dirty) await this.area.set({ [STORAGE_KEY]: state }); return structuredClone(state);
  }
  private serial<T>(operation: () => Promise<T>): Promise<T> { const next = this.queue.then(operation, operation); this.queue = next.then(() => undefined, () => undefined); return next; }
}
