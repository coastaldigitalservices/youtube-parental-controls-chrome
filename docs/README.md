# YouTube Parental Controls: implementation roadmap

This directory turns the requirements in [`PROJECT.md`](../PROJECT.md) into three
independently reviewable implementation phases. The phases are deliberately
ordered around the project's central principle: **the timer is the product**.
UI polish and convenience restrictions must not get ahead of correct playback
detection, durable accounting, and enforcement.

## Delivery sequence

| Phase | Outcome | Document |
| --- | --- | --- |
| 1 | A tested, restart-safe watch-time engine that detects real playback and never double-counts concurrent tabs | [Trustworthy tracking foundation](phase-1-tracking-foundation.md) |
| 2 | A usable parental-control extension with secure setup, limits, overrides, Shorts controls, schedules, and enforcement | [Enforcement and parent controls](phase-2-enforcement-and-controls.md) |
| 3 | A polished, hardened, documented release with optional YouTube experience controls and complete delivery automation | [Hardening and release](phase-3-hardening-and-release.md) |

Each phase ends with explicit exit criteria. Work should not begin on the next
phase until those criteria pass on the phase's pull request.

## Non-negotiable design rules

These rules apply in every phase:

1. Count real-world elapsed time only while at least one valid YouTube
   `HTMLVideoElement` is actively progressing. Merely opening or focusing
   YouTube never consumes allowance.
2. Treat the background service worker as disposable. Authoritative usage is
   stored in `chrome.storage.local`, updated frequently enough to lose no more
   than approximately 10 seconds after an abrupt shutdown.
3. Aggregate playback as a boolean per allowance bucket (regular video or
   Shorts), rather than summing tab durations. Concurrent tabs therefore do not
   multiply elapsed time.
4. Reset by comparing a stored local `YYYY-MM-DD` value with the browser's
   current local date, including after restarts, timezone changes, and midnight.
5. Keep all extension data local. Never add telemetry, a backend, external
   scripts, raw PIN storage, or broad host permissions such as `<all_urls>`.
6. Isolate fragile YouTube DOM selectors from accounting and persistence logic.
   Cosmetic failures must not weaken the timer or playback blocking.
7. Version the storage schema and migrate it without erasing ordinary usage or
   settings during extension updates.

## Planned architecture

- **YouTube content script:** observes video elements and SPA navigation,
  verifies that media time is progressing, classifies regular videos versus
  Shorts, reports state, and applies blocking UI.
- **Manifest V3 service worker:** coordinates all tab reports, advances at most
  one real-time counter per allowance bucket, evaluates policy, and schedules
  frequent durable checkpoints.
- **Shared domain modules:** own schemas, migration, local-date handling,
  accounting, allowance decisions, schedule evaluation, duration formatting,
  messaging contracts, and PIN derivation/verification.
- **Popup:** presents child-safe current status and an entry point to
  authenticated parent controls.
- **Options/setup UI:** handles first-run setup and complete parent settings.

The service worker reconstructs its state from storage and fresh content-script
reports whenever it starts. It never infers unobserved watch time across a
suspension. Content scripts periodically renew playback leases; expired leases
are considered inactive. Checkpoints use real elapsed wall time bounded by the
last verified activity interval, then persist an updated daily record. This
keeps service-worker suspension safe without trusting a continuously running
JavaScript timer.

## Cross-phase engineering workflow

Every implementation pull request should run, once the commands exist:

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run package
```

Timer, date, policy, storage, or migration changes require focused unit tests.
Playback and lifecycle changes require an integration or browser-level test
where practical. Each pull request must state its semantic-version impact;
documentation-only planning changes require **no version change**.
