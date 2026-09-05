# Repository guide

## Invariants and architecture
- The timer is the product: count real elapsed time only when video media time progresses.
- Only `StateStore` may directly read or write durable extension state. Treat the MV3 worker as disposable.
- Never sum concurrent playback. Do not infer usage across an unobserved worker suspension.
- Keep YouTube DOM selectors isolated in `src/content/youtube-video-adapter.ts`; cosmetic failures must never affect accounting or enforcement.
- Keep the product local-only: no remote code, backend, analytics, telemetry, raw PINs, or broader host permissions.

## Commands and tests
- Use `npm ci` for locked installs and `npm run check` before every commit.
- Timer/date/storage/schema changes require focused tests, including restart and every released-schema migration.
- Lifecycle or playback changes require integration coverage where practical and a documented clean-profile smoke test.
- Generated `dist/`, `.build/`, `.test-dist/`, and `artifacts/` files are ignored and must not be committed.

## Releases and pull requests
- Follow SemVer and Keep a Changelog. Synchronize versions in `package.json`, lockfile, manifest, artifact, tag, and release.
- PRs must describe user-visible behavior, version impact, tests, manual accessibility/browser checks, permissions/security impact, and known gaps.
- Before release, inspect the unpacked build and ZIP for unrelated files, source maps, secrets, test fixtures, remote requests, and development-only permissions.
