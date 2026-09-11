import { localDate } from "./date.js";
import { emptyAccountingMetadata, IntervalAccounting } from "./accounting.js";
import { isStoredState, SCHEMA_VERSION, type DailyUsage, type Settings, type StoredState, type WatchInterval } from "./model.js";

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
    if ((old.schemaVersion === 1 || old.schemaVersion === 2 || old.schemaVersion === 3) && typeof old.settings === "object" && old.settings && typeof old.usage === "object" && old.usage) {
      const settings = { ...defaultSettings(), ...(old.settings as Partial<Settings>),
        experience: { ...defaultSettings().experience, ...((old.settings as Partial<Settings>).experience ?? {}) } };
      const prior = old.usage as Partial<DailyUsage>;
      const usage = { ...newUsage(typeof prior.date === "string" ? prior.date : localDate(now), now), ...prior,
        unlimitedToday: old.schemaVersion === 1 ? false : prior.unlimitedToday ?? false,
        warningsShown: old.schemaVersion === 1 ? [] : prior.warningsShown ?? [] };
      return { schemaVersion: SCHEMA_VERSION, settings, usage, accounting: emptyAccountingMetadata() };
    }
    if (typeof old.date === "string" && typeof old.watchedSeconds === "number" && old.watchedSeconds >= 0) {
      const usage = newUsage(old.date, now); usage.regularSeconds = old.watchedSeconds;
      return { schemaVersion: SCHEMA_VERSION, settings: defaultSettings(), usage, accounting: emptyAccountingMetadata() };
    }
  }
  return { schemaVersion: SCHEMA_VERSION, settings: defaultSettings(), usage: newUsage(localDate(now), now), accounting: emptyAccountingMetadata() };
}

export class StateStore {
  private queue: Promise<unknown> = Promise.resolve();
  private readonly intervals = new IntervalAccounting();
  constructor(private readonly area: StorageArea, private readonly clock: () => Date = () => new Date()) {}
  async read(): Promise<StoredState> { return this.serial(async () => this.readCurrent()); }
  async update(mutator: (state: StoredState) => void): Promise<StoredState> {
    return this.serial(async () => { const state = await this.readCurrent(); mutator(state); state.usage.revision += 1;
      state.usage.updatedAt = this.clock().toISOString(); await this.area.set({ [STORAGE_KEY]: state }); return structuredClone(state); });
  }
  async reset(): Promise<StoredState> {
    return this.serial(async () => { const state = migrate(undefined, this.clock()); await this.area.set({ [STORAGE_KEY]: state }); return structuredClone(state); });
  }
  async recordWatchInterval(report: WatchInterval): Promise<StoredState> {
    return this.serial(async () => {
      // Do not roll the day before splitting: a report delivered just after midnight must first
      // attribute its pre-midnight portion to the day that was still authoritative in storage.
      const now = this.clock(); const raw = (await this.area.get(STORAGE_KEY))[STORAGE_KEY];
      const state = migrate(raw, now); const increments = this.intervals.apply(state.accounting, report);
      for (const increment of increments) {
        if (increment.date > state.usage.date) state.usage = newUsage(increment.date, new Date(report.endMs));
        if (increment.date !== state.usage.date) continue; // Never resurrect an already finalized day.
        state.usage.regularSeconds += increment.regularSeconds; state.usage.shortsSeconds += increment.shortsSeconds;
      }
      // If this was a delayed old report, normal current-day rollover still wins.
      const today = localDate(now); if (state.usage.date < today) state.usage = newUsage(today, now);
      state.usage.revision += 1; state.usage.updatedAt = now.toISOString();
      await this.area.set({ [STORAGE_KEY]: state }); return structuredClone(state);
    });
  }
  private async readCurrent(): Promise<StoredState> {
    const now = this.clock(); const raw = (await this.area.get(STORAGE_KEY))[STORAGE_KEY]; const state = migrate(raw, now);
    let dirty = !isStoredState(raw); const today = localDate(now);
    if (state.usage.date !== today) { state.usage = newUsage(today, now); dirty = true; }
    if (dirty) await this.area.set({ [STORAGE_KEY]: state }); return structuredClone(state);
  }
  private serial<T>(operation: () => Promise<T>): Promise<T> { const next = this.queue.then(operation, operation); this.queue = next.then(() => undefined, () => undefined); return next; }
}
