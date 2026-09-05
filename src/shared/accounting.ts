import type { Bucket, PlaybackReport } from "./model.js";

interface Source extends PlaybackReport { identity: string }
export interface Increment { regularSeconds: number; shortsSeconds: number }

export class AccountingEngine {
  private readonly sources = new Map<string, Source>();
  private lastTickMs: number | null = null;
  constructor(readonly leaseMs = 15_000, readonly maxGapMs = 10_000) {}

  report(identity: string, report: PlaybackReport, nowMs: number): Increment {
    const increment = this.advance(nowMs);
    if (report.progressing) this.sources.set(identity, { ...report, identity, observedAt: nowMs });
    else this.sources.delete(identity);
    this.lastTickMs = nowMs;
    return increment;
  }

  removeWhere(predicate: (identity: string) => boolean, nowMs: number): Increment {
    const increment = this.advance(nowMs);
    for (const identity of this.sources.keys()) if (predicate(identity)) this.sources.delete(identity);
    this.lastTickMs = nowMs;
    return increment;
  }

  advance(nowMs: number): Increment {
    this.expire(nowMs);
    if (this.lastTickMs === null) { this.lastTickMs = nowMs; return empty(); }
    const elapsed = Math.max(0, Math.min(nowMs - this.lastTickMs, this.maxGapMs)) / 1000;
    this.lastTickMs = nowMs;
    const selected = this.selectedBucket();
    return selected === "regular" ? { regularSeconds: elapsed, shortsSeconds: 0 } :
      selected === "shorts" ? { regularSeconds: 0, shortsSeconds: elapsed } : empty();
  }

  resetClock(): void { this.sources.clear(); this.lastTickMs = null; }

  private expire(nowMs: number): void {
    for (const [key, source] of this.sources) {
      if (nowMs - source.observedAt > this.leaseMs) this.sources.delete(key);
    }
  }

  private selectedBucket(): Bucket | null {
    let selected: Source | undefined;
    for (const source of this.sources.values()) {
      if (!selected || source.observedAt > selected.observedAt ||
          (source.observedAt === selected.observedAt && source.identity > selected.identity)) selected = source;
    }
    return selected?.bucket ?? null;
  }
}

const empty = (): Increment => ({ regularSeconds: 0, shortsSeconds: 0 });
