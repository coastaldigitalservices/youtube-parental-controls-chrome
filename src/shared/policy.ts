import type { Bucket, StoredState } from "./model.js";

export type BlockReason = "setup" | "shorts" | "schedule" | "limit" | "storage" | null;
export interface PolicyStatus { allowed: boolean; reason: BlockReason; usedSeconds: number; limitSeconds: number | null;
  remainingSeconds: number | null; nextReset: string; nextAvailable: string | null; bucket: Bucket }

export function scheduleAllows(startMinute: number, endMinute: number, nowMinute: number): boolean {
  if (startMinute === endMinute) return true;
  return startMinute < endMinute ? nowMinute >= startMinute && nowMinute < endMinute : nowMinute >= startMinute || nowMinute < endMinute;
}

export function nextLocalReset(now: Date): string { const next = new Date(now); next.setDate(next.getDate() + 1); next.setHours(0, 0, 0, 0); return next.toISOString(); }

export function evaluatePolicy(state: StoredState, bucket: Bucket, now = new Date()): PolicyStatus {
  const usedSeconds = state.settings.shortsMode === "allow" ? state.usage.regularSeconds + state.usage.shortsSeconds :
    bucket === "shorts" ? state.usage.shortsSeconds : state.usage.regularSeconds;
  const base = bucket === "shorts" && state.settings.shortsMode === "separate" ? state.settings.shortsLimitSeconds : state.settings.dailyLimitSeconds;
  const bonus = bucket === "shorts" && state.settings.shortsMode === "separate" ? state.usage.shortsBonusSeconds : state.usage.regularBonusSeconds;
  const limitSeconds = state.usage.unlimitedToday || base === null ? null : base + bonus;
  const common = { usedSeconds, limitSeconds, remainingSeconds: limitSeconds === null ? null : Math.max(0, limitSeconds - usedSeconds),
    nextReset: nextLocalReset(now), nextAvailable: null, bucket };
  if (!state.settings.setupComplete) return { ...common, allowed: true, reason: "setup" };
  if (bucket === "shorts" && state.settings.shortsMode === "block") return { ...common, allowed: false, reason: "shorts" };
  const schedule = state.settings.schedule; const minute = now.getHours() * 60 + now.getMinutes();
  if (schedule.enabled && !scheduleAllows(schedule.startMinute, schedule.endMinute, minute)) {
    const next = new Date(now); next.setSeconds(0, 0); next.setHours(Math.floor(schedule.startMinute / 60), schedule.startMinute % 60, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return { ...common, allowed: false, reason: "schedule", nextAvailable: next.toISOString() };
  }
  if (limitSeconds !== null && usedSeconds >= limitSeconds) return { ...common, allowed: false, reason: "limit" };
  return { ...common, allowed: true, reason: null };
}
