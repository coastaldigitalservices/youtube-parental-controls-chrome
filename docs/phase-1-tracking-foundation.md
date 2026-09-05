# Phase 1: trustworthy tracking foundation

## Goal

Produce an installable Manifest V3 skeleton whose tested core can accurately
detect, coordinate, persist, and restore actual YouTube playback time. This
phase intentionally favors observable correctness over a polished interface.

## Scope

### 1. Repository and extension scaffold

- Establish a minimal TypeScript project with linting, type checking, unit
  tests, production builds, and packaging commands.
- Add a Manifest V3 manifest with only `storage` and the narrowly justified
  YouTube host access initially required.
- Create clear boundaries for the service worker, content script, shared domain
  modules, popup, options page, and tests. Popup/options UI may be functional
  shells only; core timer code must not be a placeholder.
- Add version-consistency and manifest-validation utilities early so build
  artifacts cannot silently drift from the package version.

### 2. Versioned local data model

Define runtime-validated, migration-ready records before feature code. At
minimum, model:

- `schemaVersion`;
- setup and policy settings;
- salted PIN-derivation metadata (the PIN itself is never stored);
- a usage record keyed by local calendar date, with separate regular and Shorts
  seconds plus same-day bonus fields;
- revision/update metadata needed to make storage writes safe; and
- playback-source messages and leases, which are ephemeral and must not be
  mistaken for durable usage.

Storage helpers own defaults, validation, read/modify/write behavior, and
migrations. Other components consume those helpers rather than accessing
untyped storage keys directly.

### 3. Accounting and persistence engine

- Centralize active source reports in the service worker and identify each by
  tab/frame/source identity.
- Convert all currently valid reports into per-bucket activity: zero or more
  regular videos count as one regular elapsed interval; zero or more Shorts
  count as one Shorts interval. Define and test the policy for simultaneous
  regular and Shorts playback before implementation (the recommended rule is a
  single overall real-time interval attributed deterministically to the most
  recently verified source, so total YouTube time cannot double-count).
- Advance counters from monotonic elapsed intervals while a worker is alive;
  clamp unreasonable gaps and never backfill time that was not verified.
- Flush at most every 10 seconds during playback and immediately on known
  pause, end, navigation, limit boundary, settings change, and tab removal.
  Lifecycle flushes are optimizations only; periodic persistence provides the
  durability guarantee.
- Compare the stored date to a freshly generated local date before every read
  or mutation. Atomically initialize a new daily record when it differs.
- Restore counters after worker startup from `chrome.storage.local`, then wait
  for renewed playback reports rather than assuming playback continued.

### 4. Resilient playback detection

- Discover and re-discover the relevant `HTMLVideoElement` after initial load,
  DOM replacement, and YouTube SPA navigation.
- Combine media events (`play`, `playing`, `pause`, `waiting`, `stalled`,
  `ended`, and rate-independent time updates) with periodic verification that
  playback position is advancing.
- Count muted and background playback. Do not require document visibility,
  focus, audio, or a `/watch` route.
- Classify `/shorts/*` separately and report transitions between content types.
- Send heartbeats/leases so a vanished or frozen content script naturally
  expires. Reports must be idempotent and tolerant of worker restarts.
- Keep YouTube selectors and mutation-observer logic in a small adapter so the
  shared accounting engine remains DOM-independent.

### 5. Tests and continuous integration baseline

Unit tests must cover:

- elapsed real-time accounting and playback-speed independence;
- pause, buffering, ended media, and stale-source expiry;
- concurrent-tab de-duplication, including mixed regular/Shorts playback;
- local-date rollover, midnight while open, DST, and timezone-change behavior;
- storage defaults, validation, and migration;
- duration formatting and SemVer/version validation; and
- the mandatory restart regression: accumulate, persist, discard all in-memory
  state, reload unchanged usage, resume playback, and continue from that value.

Add pull-request CI for locked dependency install, lint, type checking, tests,
production build, package dry run, manifest validation, version consistency,
and artifact existence. No PR workflow publishes artifacts.

## Deliverables

- Buildable unpacked extension in `dist/` and a versioned ZIP under
  `artifacts/` (both generated and gitignored).
- Written architecture/storage notes reflecting the implemented choices.
- Tested shared storage, date, and accounting modules.
- Content script and service-worker coordination with diagnostic logging that
  avoids watch-history or PIN data.
- CI workflow that proves a production package can be created.

## Exit criteria

Phase 1 is complete only when:

1. Browsing, pausing, ending, or meaningfully stalled playback consumes no time.
2. Foreground, background, muted, regular, and Shorts playback are detected.
3. Two simultaneous tabs do not make total elapsed time advance twice as fast.
4. Forced restart loses no more than the configured checkpoint interval and
   persisted usage resumes correctly.
5. The next local calendar day receives a fresh record without deleting prior
   settings.
6. The mandatory restart-persistence regression test passes.
7. All validation, production-build, and package-dry-run commands pass in CI.

No polished settings UI, cosmetic YouTube restrictions, or release automation
is required to exit this phase.
