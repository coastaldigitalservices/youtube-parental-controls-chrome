# Changelog

All notable changes follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project uses [Semantic Versioning](https://semver.org/).

## [0.4.0] - 2026-09-05

### Added
- Chrome Web Store listing, privacy, submission, icon, and promotional assets.
- Chrome Web Store API v2 publishing support, hosted privacy-policy deployment, and production package validation.

### Changed
- Release automation keeps the store item unlisted and limits Web Store uploads to release workflows.
- Pull-request checks now validate store readiness without uploading or publishing.

## [0.3.0] - 2026-09-05

### Added
- Accessible, responsive product polish and explicit storage-failure messaging.
- Independent fail-soft controls for autoplay, Shorts entry points, comments, live chat, recommendations, and the homepage feed.
- Production artifact and idempotent GitHub Release automation, plus release and validation documentation.

### Changed
- Storage schema 3 preserves schema 1 and 2 settings and usage while adding experience controls.

## [0.2.0] - 2026-09-05

### Added
- PIN-protected setup/settings, limits, Shorts policy, schedules, warnings, blocking overlay, and same-day parent overrides.

## [0.1.0] - 2026-09-05

### Added
- Restart-safe progressing-playback accounting, local-day rollover, multi-tab aggregation, narrow MV3 manifest, tests, and PR checks.
