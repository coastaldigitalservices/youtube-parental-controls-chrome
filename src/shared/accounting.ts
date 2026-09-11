import { localDate } from "./date.js";
import type { AccountingMetadata, Bucket, CoveredInterval, WatchInterval } from "./model.js";

export interface Increment { date: string; regularSeconds: number; shortsSeconds: number }

/** Maximum accepted content-script batch. Keeping this small bounds crash loss and bogus reports. */
export const MAX_WATCH_INTERVAL_MS = 10_000;
const COVERAGE_RETENTION_MS = 60_000;
const SOURCE_RETENTION_MS = 7 * 24 * 60 * 60_000;
const MAX_SOURCES = 128;

export const emptyAccountingMetadata = (): AccountingMetadata => ({ sources: {}, coverage: [] });

/**
 * Applies one explicit, verified wall-clock interval. All inputs and results are durable-data friendly;
 * this class has no live clock, leases, or active-source state, so recreating it is harmless.
 */
export class IntervalAccounting {
  apply(metadata: AccountingMetadata, report: WatchInterval): Increment[] {
    const prior = metadata.sources[report.sourceId];
    if (prior && report.sequence <= prior.sequence) return [];

    const uncovered = subtractCoverage(report.startMs, report.endMs, metadata.coverage);
    metadata.sources[report.sourceId] = { sequence: report.sequence, updatedAt: report.endMs };
    metadata.coverage = mergeCoverage([
      ...metadata.coverage.filter((item) => item.endMs >= report.endMs - COVERAGE_RETENTION_MS),
      ...uncovered.map(([startMs, endMs]) => ({ startMs, endMs })),
    ]);
    pruneSources(metadata, report.endMs);
    return groupByLocalDay(uncovered, report.bucket);
  }
}

function subtractCoverage(startMs: number, endMs: number, coverage: CoveredInterval[]): Array<[number, number]> {
  let pieces: Array<[number, number]> = [[startMs, endMs]];
  for (const covered of coverage) {
    const next: Array<[number, number]> = [];
    for (const [start, end] of pieces) {
      if (covered.endMs <= start || covered.startMs >= end) next.push([start, end]);
      else {
        if (covered.startMs > start) next.push([start, Math.min(covered.startMs, end)]);
        if (covered.endMs < end) next.push([Math.max(covered.endMs, start), end]);
      }
    }
    pieces = next;
  }
  return pieces;
}

function mergeCoverage(intervals: CoveredInterval[]): CoveredInterval[] {
  const sorted = intervals.filter((item) => item.endMs > item.startMs).sort((a, b) => a.startMs - b.startMs);
  const merged: CoveredInterval[] = [];
  for (const item of sorted) {
    const last = merged.at(-1);
    if (last && item.startMs <= last.endMs) last.endMs = Math.max(last.endMs, item.endMs);
    else merged.push({ ...item });
  }
  return merged;
}

function groupByLocalDay(intervals: Array<[number, number]>, bucket: Bucket): Increment[] {
  const totals = new Map<string, number>();
  for (const [start, end] of intervals) {
    let cursor = start;
    while (cursor < end) {
      const date = new Date(cursor); const nextMidnight = new Date(date);
      nextMidnight.setHours(24, 0, 0, 0);
      const boundary = Math.min(end, nextMidnight.getTime());
      const day = localDate(date); totals.set(day, (totals.get(day) ?? 0) + (boundary - cursor) / 1000);
      cursor = boundary;
    }
  }
  return [...totals].map(([date, seconds]) => ({ date,
    regularSeconds: bucket === "regular" ? seconds : 0,
    shortsSeconds: bucket === "shorts" ? seconds : 0 }));
}

function pruneSources(metadata: AccountingMetadata, nowMs: number): void {
  const entries = Object.entries(metadata.sources)
    .filter(([, value]) => value.updatedAt >= nowMs - SOURCE_RETENTION_MS)
    .sort((a, b) => b[1].updatedAt - a[1].updatedAt).slice(0, MAX_SOURCES);
  metadata.sources = Object.fromEntries(entries);
}
