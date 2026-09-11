export const SCHEMA_VERSION = 4;

export type Bucket = "regular" | "shorts";
export type ShortsMode = "allow" | "block" | "separate";

export interface PinDerivation {
  algorithm: "PBKDF2-SHA-256";
  version: 1;
  saltBase64: string;
  iterations: number;
  hashBase64: string;
}

export interface Schedule {
  enabled: boolean;
  startMinute: number;
  endMinute: number;
}

export interface Settings {
  setupComplete: boolean;
  dailyLimitSeconds: number | null;
  shortsMode: ShortsMode;
  shortsLimitSeconds: number | null;
  schedule: Schedule;
  pin: PinDerivation | null;
  experience: ExperienceControls;
}

export interface ExperienceControls {
  disableAutoplay: boolean;
  hideShorts: boolean;
  hideComments: boolean;
  hideLiveChat: boolean;
  hideRecommendations: boolean;
  hideHomeFeed: boolean;
}

export interface DailyUsage {
  date: string;
  regularSeconds: number;
  shortsSeconds: number;
  regularBonusSeconds: number;
  shortsBonusSeconds: number;
  unlimitedToday: boolean;
  warningsShown: string[];
  revision: number;
  updatedAt: string;
}

export interface CoveredInterval { startMs: number; endMs: number }
export interface SourceSequence { sequence: number; updatedAt: number }
export interface AccountingMetadata { sources: Record<string, SourceSequence>; coverage: CoveredInterval[] }

export interface StoredState { schemaVersion: typeof SCHEMA_VERSION; settings: Settings; usage: DailyUsage; accounting: AccountingMetadata }

export interface WatchInterval {
  type: "watch-interval";
  sourceId: string;
  sequence: number;
  bucket: Bucket;
  startMs: number;
  endMs: number;
  debug?: true;
}

export type ParentMutation =
  | { action: "save-settings"; dailyLimitSeconds: number | null; shortsMode: ShortsMode; shortsLimitSeconds: number | null; schedule: Schedule; experience: ExperienceControls }
  | { action: "add-bonus"; bucket: Bucket; seconds: 300 | 900 | 1800 }
  | { action: "unlimited-today" }
  | { action: "reset-usage" }
  | { action: "change-pin"; pin: string }
  | { action: "reset-all"; confirmation: "RESET" };

export type ExtensionMessage = WatchInterval | { type: "get-status"; bucket?: Bucket } |
  { type: "setup"; pin: string; dailyLimitSeconds: number | null; shortsMode: ShortsMode; shortsLimitSeconds: number | null; schedule: Schedule } |
  { type: "authenticate"; pin: string } | { type: "parent-mutation"; mutation: ParentMutation };

const finiteNonnegative = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;
const validLimit = (value: unknown): value is number | null =>
  value === null || (finiteNonnegative(value) && value <= 480 * 60);

export function isWatchInterval(value: unknown, receivedAt = Date.now()): value is WatchInterval {
  if (typeof value !== "object" || value === null) return false;
  const report = value as Partial<WatchInterval>;
  return report.type === "watch-interval" && typeof report.sourceId === "string" && report.sourceId.length > 0 && report.sourceId.length <= 128 &&
    Number.isSafeInteger(report.sequence) && (report.sequence ?? -1) >= 0 && (report.bucket === "regular" || report.bucket === "shorts") &&
    finiteNonnegative(report.startMs) && finiteNonnegative(report.endMs) && (report.endMs ?? 0) > (report.startMs ?? 0) &&
    (report.endMs ?? 0) - (report.startMs ?? 0) <= 10_000 && (report.endMs ?? Infinity) <= receivedAt + 60_000;
}

export function isSchedule(value: unknown): value is Schedule {
  if (typeof value !== "object" || value === null) return false;
  const schedule = value as Partial<Schedule>;
  return typeof schedule.enabled === "boolean" && Number.isInteger(schedule.startMinute) &&
    Number.isInteger(schedule.endMinute) && (schedule.startMinute ?? -1) >= 0 &&
    (schedule.startMinute ?? 1440) < 1440 && (schedule.endMinute ?? -1) >= 0 &&
    (schedule.endMinute ?? 1440) < 1440;
}

export function isStoredState(value: unknown): value is StoredState {
  if (typeof value !== "object" || value === null) return false;
  const state = value as Partial<StoredState>;
  if (state.schemaVersion !== SCHEMA_VERSION || !state.settings || !state.usage || !state.accounting) return false;
  const u = state.usage; const s = state.settings;
  return /^\d{4}-\d{2}-\d{2}$/.test(u.date) && finiteNonnegative(u.regularSeconds) &&
    finiteNonnegative(u.shortsSeconds) && finiteNonnegative(u.regularBonusSeconds) &&
    finiteNonnegative(u.shortsBonusSeconds) && typeof u.unlimitedToday === "boolean" &&
    Array.isArray(u.warningsShown) && u.warningsShown.every((item) => typeof item === "string") &&
    Number.isInteger(u.revision) && u.revision >= 0 && typeof u.updatedAt === "string" &&
    typeof s.setupComplete === "boolean" && validLimit(s.dailyLimitSeconds) && validLimit(s.shortsLimitSeconds) &&
    (s.shortsMode === "allow" || s.shortsMode === "block" || s.shortsMode === "separate") &&
    isSchedule(s.schedule) && isExperienceControls(s.experience) && (s.pin === null || isPin(s.pin)) && isAccounting(state.accounting);
}

function isAccounting(value: unknown): value is AccountingMetadata {
  if (typeof value !== "object" || value === null) return false;
  const metadata = value as Partial<AccountingMetadata>;
  return typeof metadata.sources === "object" && metadata.sources !== null && Object.values(metadata.sources).every((item) =>
    Number.isSafeInteger(item.sequence) && item.sequence >= 0 && finiteNonnegative(item.updatedAt)) && Array.isArray(metadata.coverage) &&
    metadata.coverage.every((item) => finiteNonnegative(item.startMs) && finiteNonnegative(item.endMs) && item.endMs > item.startMs);
}

export function isExperienceControls(value: unknown): value is ExperienceControls {
  if (typeof value !== "object" || value === null) return false;
  const controls = value as Partial<ExperienceControls>;
  return [controls.disableAutoplay, controls.hideShorts, controls.hideComments, controls.hideLiveChat,
    controls.hideRecommendations, controls.hideHomeFeed].every((item) => typeof item === "boolean");
}

function isPin(value: unknown): value is PinDerivation {
  if (typeof value !== "object" || value === null) return false;
  const pin = value as Partial<PinDerivation>;
  return pin.algorithm === "PBKDF2-SHA-256" && pin.version === 1 && typeof pin.saltBase64 === "string" &&
    typeof pin.hashBase64 === "string" && Number.isInteger(pin.iterations) && (pin.iterations ?? 0) >= 100_000;
}
