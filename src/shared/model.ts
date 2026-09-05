export const SCHEMA_VERSION = 1;

export type Bucket = "regular" | "shorts";

export interface PinDerivation {
  algorithm: "PBKDF2-SHA-256";
  saltBase64: string;
  iterations: number;
  hashBase64: string;
}

export interface Settings {
  setupComplete: boolean;
  dailyLimitSeconds: number | null;
  shortsLimitSeconds: number | null;
  pin: PinDerivation | null;
}

export interface DailyUsage {
  date: string;
  regularSeconds: number;
  shortsSeconds: number;
  regularBonusSeconds: number;
  shortsBonusSeconds: number;
  revision: number;
  updatedAt: string;
}

export interface StoredState {
  schemaVersion: typeof SCHEMA_VERSION;
  settings: Settings;
  usage: DailyUsage;
}

export interface PlaybackReport {
  type: "playback-state";
  sourceId: string;
  bucket: Bucket;
  progressing: boolean;
  observedAt: number;
}

const finiteNonnegative = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

export function isPlaybackReport(value: unknown): value is PlaybackReport {
  if (typeof value !== "object" || value === null) return false;
  const report = value as Partial<PlaybackReport>;
  return report.type === "playback-state" && typeof report.sourceId === "string" &&
    report.sourceId.length > 0 && (report.bucket === "regular" || report.bucket === "shorts") &&
    typeof report.progressing === "boolean" && finiteNonnegative(report.observedAt);
}

export function isStoredState(value: unknown): value is StoredState {
  if (typeof value !== "object" || value === null) return false;
  const state = value as Partial<StoredState>;
  if (state.schemaVersion !== SCHEMA_VERSION || !state.settings || !state.usage) return false;
  const u = state.usage;
  const s = state.settings;
  return /^\d{4}-\d{2}-\d{2}$/.test(u.date) && finiteNonnegative(u.regularSeconds) &&
    finiteNonnegative(u.shortsSeconds) && finiteNonnegative(u.regularBonusSeconds) &&
    finiteNonnegative(u.shortsBonusSeconds) && Number.isInteger(u.revision) && u.revision >= 0 &&
    typeof u.updatedAt === "string" && typeof s.setupComplete === "boolean" &&
    (s.dailyLimitSeconds === null || finiteNonnegative(s.dailyLimitSeconds)) &&
    (s.shortsLimitSeconds === null || finiteNonnegative(s.shortsLimitSeconds)) &&
    (s.pin === null || isPin(s.pin));
}

function isPin(value: unknown): value is PinDerivation {
  if (typeof value !== "object" || value === null) return false;
  const pin = value as Partial<PinDerivation>;
  return pin.algorithm === "PBKDF2-SHA-256" && typeof pin.saltBase64 === "string" &&
    typeof pin.hashBase64 === "string" && Number.isInteger(pin.iterations) && (pin.iterations ?? 0) > 0;
}
