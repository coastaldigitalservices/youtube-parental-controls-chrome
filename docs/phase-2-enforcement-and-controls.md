# Phase 2: enforcement and parent controls

## Goal

Turn the Phase 1 tracking engine into a complete, locally administered parental
control: parents can securely configure policy, children can understand their
status, and YouTube playback is reliably stopped when policy denies access.

## Scope

### 1. First-run setup and security

- Implement the welcome/privacy explanation, 4–8 digit parent PIN creation,
  default daily allowance, Shorts choice, optional allowed hours, and setup
  completion flow. Enforcement begins only after setup completes.
- Derive PIN verifiers with Web Crypto PBKDF2, a cryptographically random salt,
  a versioned algorithm/iteration configuration, and constant-behavior result
  handling. Never log, message-persist, or store a raw PIN.
- Keep a successful parent session in memory for approximately five minutes;
  worker/browser restart always relocks it.
- Require authentication for every administrative mutation, not just entry to
  the settings screen.
- Provide a deliberate multi-confirmation local reset and clearly explain that
  local-only storage means there is no remote PIN recovery.

### 2. Policy and enforcement

- Support no limit, presets, and a validated 1–480 minute custom daily limit.
- Make the service worker the authority for allowance decisions. Content
  scripts pause video and render policy state but cannot grant themselves time.
- At exhaustion, checkpoint usage, pause every active player, reject new play
  attempts, and render one persistent accessible overlay that survives SPA
  navigation without dialog spam.
- Report used time, effective limit, remaining time, and the next local reset in
  child-friendly language.
- Re-evaluate policy after storage changes, midnight rollover, navigation, and
  service-worker/content-script restart.

### 3. Parent override and status UI

- Build the popup with used/remaining time, progress, Shorts status, current
  availability, next reset, and a Parent Settings entry point.
- Build a responsive options page with Today, Daily Limit, Shorts, Schedule,
  Security, and About sections.
- From the block overlay or settings, allow an authenticated parent to add 5,
  15, or 30 minutes, make today unlimited, or deliberately reset today's usage.
- Store overrides in the dated usage record so they expire at the next local
  day and never mutate the base policy accidentally.
- Show each remaining-time warning (15, 5, and 1 minute) at most once per day
  per applicable allowance, using non-disruptive YouTube toasts.

### 4. Shorts and scheduling

- Implement `allow`, `block`, and `separate allowance` Shorts modes. Direct
  `/shorts/*` navigation and actual Shorts playback must be enforced; hiding a
  shelf is not enforcement.
- Keep regular and Shorts usage observable separately even where the accounting
  policy prevents simultaneous real-time double counting.
- Implement optional local-time allowed hours, including windows that cross
  midnight, and show the next availability time when blocked.
- Shape the policy model for optional weekday-specific limits. Implement them
  only if doing so does not put core enforcement reliability at risk.

### 5. Privacy and permissions

- Add `PRIVACY.md` with an exact list of locally stored data and a concise
  in-product privacy statement.
- Document every extension permission. Do not request `tabs` unless the chosen
  implementation demonstrates why narrower APIs are insufficient, and never
  request `<all_urls>`.
- Document the unavoidable limitation that a user with sufficient Chrome or
  developer-mode access may disable, remove, or clear the extension.

## Required tests

- PIN enrollment, verification, wrong-PIN rejection, algorithm versioning, and
  transient parent-session expiry/restart behavior.
- Base limits, bonus time, unlimited-today, reset-usage authorization, and next-
  day override expiry.
- Shorts allow/block/separate modes and transitions during SPA navigation.
- Same-day and cross-midnight availability windows, boundary minutes, DST, and
  disabled schedules.
- Enforcement after limit crossing, attempted replay, worker restart, and page
  navigation.
- First-run setup gating, locked settings mutations, and local reset.
- Popup/options status derivation and one-time remaining-time warnings.

Add focused extension integration tests for playback blocking and core parent
flows without coupling the entire suite to YouTube's live site. Use controlled
fixtures for deterministic media and messaging behavior.

## Exit criteria

Phase 2 is complete only when:

1. First-run setup securely enrolls a parent and enables enforcement afterward.
2. Settings and overrides cannot be changed without valid authentication.
3. Reaching any applicable limit immediately pauses and continues to block
   playback across reloads, SPA navigation, and worker restarts.
4. Bonus and unlimited-today choices affect only the current local date.
5. Shorts and allowed-hours policies work through direct navigation, not merely
   through DOM hiding.
6. Popup and settings surfaces accurately reflect the same authoritative state.
7. Phase 1 tracking, de-duplication, rollover, and restart tests still pass.
