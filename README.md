# YouTube Parental Controls

A local-only Manifest V3 Chrome extension that counts **actual progressing YouTube playback**, persists daily usage through browser and Chromebook restarts, and pauses video when a parent's policy says time is up.

## Features

- Daily regular-video limits with restart-safe checkpoints and no concurrent-tab double counting.
- Separate allow, block, or timed policies for Shorts.
- Local allowed-hours schedule and authenticated same-day bonus time.
- Salted PBKDF2 parent PIN; no raw PIN, account, backend, analytics, or telemetry.
- Optional fail-soft controls for autoplay, Shorts links, comments, chat, recommendations, and the home feed.
- Accessible popup, setup/settings page, warning toast, and playback-blocking overlay.

## Architecture and privacy

A YouTube content script verifies media-time progress and reports renewable leases. A disposable service worker aggregates those leases, evaluates policy, and writes through the sole durable-state boundary, `StateStore`, every six seconds. See [the architecture](docs/architecture.md) and [privacy disclosure](PRIVACY.md). The extension requests only local storage and `https://www.youtube.com/*` access; extension-owned code makes no network requests.

## Install an unpacked development build

```sh
npm ci
npm run build
```

Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select `dist/`. Open the extension's options page to create a 4–8 digit parent PIN. There is no remote PIN recovery.

## Development and validation

```sh
npm run check             # lint, types, tests, build, manifest/version, package dry run
npm run validate:store    # audit the unpacked production extension
npm run package           # artifacts/youtube-parental-controls-vX.Y.Z.zip
```

For a clean-profile smoke test, load `dist/`, complete setup, confirm paused media does not count, play a standard video and a Short, exhaust a short test limit, restart Chrome, verify usage remains, then authenticate and add five minutes. Test keyboard-only navigation and spot-check the popup and overlay with ChromeVox. Stable Chrome on Linux is the closest automated/developer substitute when Chromebook hardware is unavailable; final ChromeOS hardware behavior remains a manual release check.

## Releases

Pull requests run a non-publishing production dry run. A merge to `main` runs the locked install and complete validation pipeline, uploads the versioned ZIP, creates the matching tag and GitHub Release, and optionally submits the existing Chrome Web Store item through API v2. Versions follow SemVer, must increase, and must match `package.json` and `manifest.json`. See [the Chrome Web Store guide](docs/CHROME_WEB_STORE.md).

## Known limitations

YouTube frequently changes its DOM. Cosmetic hiding and autoplay controls can temporarily stop working, but are isolated from accounting and direct Shorts enforcement. Browser lifecycle events are not guaranteed, so an abrupt shutdown can lose up to one checkpoint interval. Picture-in-picture playback is counted when the page's video continues to progress. A sufficiently privileged user can remove the extension, clear its storage, use developer mode, or alter the system clock/timezone; this tool is not an OS-level security boundary.
