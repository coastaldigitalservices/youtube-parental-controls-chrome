import { enrollPin, verifyPin } from "../shared/pin.js";
import { evaluatePolicy, type PolicyStatus } from "../shared/policy.js";
import { defaultSettings, type StateStore } from "../shared/storage.js";
import type { Bucket, ParentMutation, Schedule, ShortsMode, StoredState } from "../shared/model.js";

export interface SetupInput { pin: string; dailyLimitSeconds: number | null; shortsMode: ShortsMode; shortsLimitSeconds: number | null; schedule: Schedule }
export interface CommandResult { ok: boolean; error?: string; status?: PolicyStatus; state?: StoredState; warning?: number }

export class ParentController {
  private authenticatedUntil = 0;
  constructor(private readonly store: StateStore, private readonly clock: () => Date = () => new Date(), readonly sessionMs = 5 * 60_000) {}

  async setup(input: SetupInput): Promise<CommandResult> {
    const current = await this.store.read();
    if (current.settings.setupComplete) return { ok: false, error: "Setup is already complete." };
    const error = validateSettings(input.dailyLimitSeconds, input.shortsMode, input.shortsLimitSeconds, input.schedule);
    if (error) return { ok: false, error };
    let verifier;
    try { verifier = await enrollPin(input.pin); } catch (caught) { return { ok: false, error: caught instanceof Error ? caught.message : "Invalid PIN." }; }
    const state = await this.store.update((draft) => { draft.settings = { setupComplete: true, dailyLimitSeconds: input.dailyLimitSeconds,
      shortsMode: input.shortsMode, shortsLimitSeconds: input.shortsLimitSeconds, schedule: input.schedule, pin: verifier }; });
    this.authenticatedUntil = this.clock().getTime() + this.sessionMs;
    return { ok: true, state };
  }

  async authenticate(pin: string): Promise<CommandResult> {
    const state = await this.store.read();
    const ok = state.settings.pin !== null && await verifyPin(pin, state.settings.pin);
    if (ok) this.authenticatedUntil = this.clock().getTime() + this.sessionMs;
    return { ok, error: ok ? undefined : "Incorrect PIN." };
  }

  async mutate(mutation: ParentMutation): Promise<CommandResult> {
    if (this.clock().getTime() >= this.authenticatedUntil) return { ok: false, error: "Parent session is locked. Enter the PIN again." };
    if (mutation.action === "reset-all") {
      if (mutation.confirmation !== "RESET") return { ok: false, error: "Reset confirmation did not match." };
      this.authenticatedUntil = 0; return { ok: true, state: await this.store.reset() };
    }
    if (mutation.action === "change-pin") {
      let pin; try { pin = await enrollPin(mutation.pin); } catch (caught) { return { ok: false, error: caught instanceof Error ? caught.message : "Invalid PIN." }; }
      return { ok: true, state: await this.store.update((state) => { state.settings.pin = pin; }) };
    }
    if (mutation.action === "save-settings") {
      const error = validateSettings(mutation.dailyLimitSeconds, mutation.shortsMode, mutation.shortsLimitSeconds, mutation.schedule);
      if (error) return { ok: false, error };
      return { ok: true, state: await this.store.update((state) => {
        state.settings.dailyLimitSeconds = mutation.dailyLimitSeconds; state.settings.shortsMode = mutation.shortsMode;
        state.settings.shortsLimitSeconds = mutation.shortsLimitSeconds; state.settings.schedule = mutation.schedule;
      }) };
    }
    return { ok: true, state: await this.store.update((state) => {
      if (mutation.action === "add-bonus") {
        if (mutation.bucket === "shorts") state.usage.shortsBonusSeconds += mutation.seconds;
        else state.usage.regularBonusSeconds += mutation.seconds;
      } else if (mutation.action === "unlimited-today") state.usage.unlimitedToday = true;
      else if (mutation.action === "reset-usage") {
        state.usage.regularSeconds = 0; state.usage.shortsSeconds = 0;
        state.usage.regularBonusSeconds = 0; state.usage.shortsBonusSeconds = 0; state.usage.unlimitedToday = false; state.usage.warningsShown = [];
      }
    }) };
  }

  async status(bucket: Bucket): Promise<CommandResult> {
    const state = await this.store.read(); const status = evaluatePolicy(state, bucket, this.clock());
    let warning: number | undefined;
    if (status.allowed && status.remainingSeconds !== null) {
      for (const threshold of [60, 300, 900]) if (status.remainingSeconds <= threshold && !state.usage.warningsShown.includes(`${bucket}:${threshold}`)) { warning = threshold; break; }
      if (warning) await this.store.update((draft) => { draft.usage.warningsShown.push(`${bucket}:${warning}`); });
    }
    return { ok: true, status, state, warning };
  }
}

function validateSettings(daily: number | null, mode: ShortsMode, shorts: number | null, schedule: Schedule): string | null {
  const limitValid = (value: number | null): boolean => value === null || (Number.isInteger(value) && value >= 60 && value <= 480 * 60);
  if (!limitValid(daily) || !limitValid(shorts)) return "Limits must be between 1 and 480 minutes, or unlimited.";
  if (!(["allow", "block", "separate"] as ShortsMode[]).includes(mode)) return "Invalid Shorts mode.";
  if (![schedule.startMinute, schedule.endMinute].every((value) => Number.isInteger(value) && value >= 0 && value < 1440)) return "Invalid schedule.";
  return null;
}
