Project: YouTube Parental Watch-Time Extension

Build a Chrome/Chromebook extension that provides parent-controlled daily YouTube watch-time limits.

The product should be functionally similar to YT Kids Guard in terms of parental-control features and general interaction model, but it must be independently designed and implemented. Do not copy its source code, branding, text, CSS, visual identity, layout, icons, or exact UI structure.

The most important difference is that daily usage MUST persist across browser restarts, Chromebook restarts, tab closures, and extension service-worker restarts.

This is a local-only extension. No backend, remote dashboard, analytics service, user account, telemetry, or cloud persistence should be required.

---

Primary Goals

The extension should:

1. Track actual YouTube video playback time.
2. Enforce a configurable daily video-watch limit.
3. Persist the day's accumulated watch time across Chrome restarts and Chromebook reboots.
4. Protect parental settings behind a PIN or password.
5. Support YouTube Shorts controls.
6. Support time-of-day restrictions such as bedtime.
7. Provide a clean, polished parent-facing UI.
8. Store all configuration and usage data locally.
9. Include automated tests and GitHub Actions CI.
10. Automatically build extension artifacts when changes merge to "main".
11. Perform a dry-run production build on pull requests.
12. Follow semantic versioning.
13. Maintain an "AGENTS.md" file documenting the repository for future coding agents.

---

Platform / Technical Constraints

Target:

- Google Chrome
- ChromeOS / Chromebook
- Manifest V3

Use modern JavaScript or TypeScript.

TypeScript is preferred if it does not significantly complicate the extension.

Use minimal dependencies.

Prefer browser-native APIs wherever practical.

Do not require:

- A server
- Firebase
- Supabase
- OAuth
- Google account integration
- External analytics
- Remote databases
- External APIs for normal operation

The extension should work completely offline after installation, aside from YouTube itself obviously requiring network access.

---

Core Watch-Time Behavior

This is the most important feature.

Do NOT track time simply because:

- youtube.com is open
- a YouTube tab is focused
- the browser is open
- a watch page exists

Count time only when a YouTube video is actually playing.

The primary condition should be equivalent to:

- a valid HTMLVideoElement exists
- "video.paused === false"
- "video.ended === false"
- playback is actively progressing

Use appropriate YouTube DOM/player events plus periodic verification.

Do not depend solely on SPA page-navigation events because YouTube frequently changes routes without a full page reload.

The tracking system should survive YouTube's single-page application navigation.

---

Playback Counting Rules

Count:

- Standard YouTube videos playing in the foreground
- Standard YouTube videos playing in a background tab
- Shorts actively playing
- Videos playing while the user is on another Chrome tab
- Continued video playback after navigation if playback remains active

Do NOT count:

- Paused video
- Buffering where playback has stopped progressing for a meaningful period
- Ended video
- YouTube homepage browsing
- Search results browsing
- Channel browsing
- Comments browsing while the video is paused
- A watch page left open overnight with the video paused

If playback is active and audio is muted, it should still count.

If the user changes playback speed, count real-world elapsed time, not content-duration time.

Example:

Watching a video at 2x speed for 10 real minutes consumes 10 minutes of the allowance, not 20.

---

Usage Persistence

This must be designed carefully.

Persist accumulated usage using "chrome.storage.local".

Do not keep the authoritative counter only in memory.

Persist usage frequently enough that closing Chrome cannot materially reset the counter.

Suggested strategy:

- Keep an in-memory running counter while actively tracking.
- Flush accumulated seconds to "chrome.storage.local" every 5–15 seconds.
- Flush immediately when:
  - playback pauses
  - navigation occurs
  - the page unloads where possible
  - the extension detects a tab closing where possible
  - the daily limit is reached
  - extension settings change

Because lifecycle events are not guaranteed, periodic persistence MUST be sufficient on its own.

Maximum reasonable usage loss after a forced shutdown should be approximately 10 seconds.

Closing and reopening Chrome must NOT reset usage.

Restarting the Chromebook must NOT reset usage.

Closing and reopening YouTube must NOT reset usage.

Opening a new YouTube tab must NOT reset usage.

---

Daily Reset

Usage resets once per local calendar day.

The daily record should contain something conceptually like:

{
  "date": "2026-09-05",
  "watchedSeconds": 3472
}

When the local calendar date changes, begin a new daily allowance.

Do not base the reset on browser uptime.

Do not use "24 hours since extension startup."

Use the Chromebook/browser's local timezone.

Handle:

- browser remaining open across midnight
- browser being closed at midnight
- DST transitions
- timezone changes

A reasonable implementation is to compare a stored local YYYY-MM-DD value with the current local date before reading/updating usage.

---

Multiple YouTube Tabs

Prevent double-counting.

If the same user somehow has two YouTube videos playing simultaneously in separate tabs, the daily allowance should represent real elapsed YouTube watching time rather than summing every concurrent video.

Example:

Two YouTube videos play simultaneously for 5 minutes.

Usage should increase by approximately 5 minutes, not 10.

Design the architecture so active playback sources report state to a centralized tracker.

The centralized tracker should determine whether at least one YouTube video is actively playing.

---

Daily Limit

Parent can configure a daily watch-time limit.

Allow:

- No limit
- 15 minutes
- 30 minutes
- 45 minutes
- 1 hour
- 1.5 hours
- 2 hours
- 3 hours
- custom duration

Custom duration should support at least 1–480 minutes.

Store internally in seconds or minutes as appropriate.

Display usage clearly:

- Used today
- Remaining today
- Daily allowance
- Progress bar

Example:

"47 min of 90 min used"

---

Limit Enforcement

When the daily allowance is exhausted:

1. Pause any currently playing YouTube video.
2. Prevent further playback.
3. Display a polished blocking overlay on YouTube.

Example message:

«Daily YouTube time is finished.»

Show:

- time used
- daily limit
- when access resets

Example:

"90 minutes used today. More YouTube will be available tomorrow."

Do not continuously spam dialogs.

Use an in-page overlay/modal.

The overlay should survive YouTube SPA navigation.

If the user tries to press play again, playback should immediately be blocked.

---

Parent Override

The blocked screen should provide:

"Parent access"

Selecting it asks for the parent PIN/password.

After successful authentication, allow the parent to:

- add 5 minutes
- add 15 minutes
- add 30 minutes
- remove today's limit
- optionally reset today's usage

Temporary extra time should apply only to the current date.

Example data structure:

{
  "baseDailyLimitSeconds": 5400,
  "bonusSecondsToday": 900
}

Bonus time resets the next day.

---

PIN / Password Protection

Settings must be protected.

Initial setup should require creating a parent PIN.

Preferred:

- 4–8 digit PIN

Optionally support a longer password if easy.

Never store the raw PIN.

Store a secure hash using Web Crypto.

Use:

- PBKDF2 or similar browser-native password derivation
- random salt
- sufficiently high iteration count

Do not invent custom cryptography.

The extension does not need enterprise-grade adversarial security, but obvious plaintext storage is unacceptable.

Require authentication before:

- changing daily limits
- disabling protection
- changing Shorts settings
- changing bedtime
- resetting usage
- changing the PIN
- granting extra time
- accessing administrative settings

After successful authentication, allow a short parent session such as 5 minutes before requesting the PIN again.

Do NOT persist an unlocked parent session across browser restarts.

---

PIN Recovery

Because everything is local-only, there is no email recovery.

During setup, clearly state:

«There is no remote PIN recovery because your settings remain on this device.»

Provide a deliberate reset mechanism.

Potential implementation:

- extension options page
- "Reset extension" action
- requires multiple confirmation steps

Resetting should erase configuration and usage and return to first-run setup.

Document the security tradeoff clearly.

Do not create fake security that can never be recovered from.

---

Shorts Controls

Provide separate Shorts controls.

Parent options:

- Allow Shorts
- Block Shorts completely
- Give Shorts a separate daily allowance

If separate allowance is enabled:

Example:

Regular videos: 90 minutes/day
Shorts: 15 minutes/day

Track Shorts separately.

Data might conceptually resemble:

{
  "date": "2026-09-05",
  "regularVideoSeconds": 2800,
  "shortsSeconds": 420
}

When Shorts are blocked:

- block "/shorts/*"
- prevent Shorts playback
- optionally hide Shorts shelves/buttons where practical

Do not make DOM hiding the only enforcement mechanism.

Direct navigation to "/shorts/..." must still be blocked.

---

Bedtime / Allowed Hours

Support daily YouTube availability windows.

Parent can configure something like:

Allowed:

"7:00 AM – 9:00 PM"

Outside that period:

- videos cannot play
- show an overlay explaining that YouTube is unavailable right now
- show when access resumes

Support disabling this feature entirely.

Use local Chromebook/browser time.

---

Optional Schedule by Day

If reasonably straightforward, support different limits by day of week.

Example:

Monday–Thursday: 60 minutes
Friday: 90 minutes
Saturday–Sunday: 120 minutes

Architect the settings model so this can exist cleanly even if implemented after the initial baseline.

If scope becomes excessive, prioritize a single daily limit first but leave the code extensible.

---

Autoplay Control

Provide parental option:

"Disable YouTube autoplay"

If enabled:

- prevent automatic transition into another video where practical
- turn off YouTube autoplay UI if possible

This is secondary to watch-time enforcement.

Do not let brittle autoplay DOM manipulation compromise the core extension.

---

YouTube Restricted UI Controls

Provide optional controls similar in spirit to other parental YouTube extensions:

- Hide Shorts
- Disable autoplay
- Hide comments
- Hide live chat
- Hide recommendations/sidebar
- Hide homepage feed

These should be optional toggles.

These features are convenience controls, not security boundaries.

The core playback timer must continue working even if YouTube changes its page structure and one of these cosmetic controls breaks.

---

Popup UI

Clicking the extension icon should open a polished status popup.

When locked/not authenticated, show child-safe status information:

- YouTube time used today
- time remaining
- graphical progress indicator
- Shorts remaining if applicable
- bedtime/availability status
- next reset

Example:

YouTube Today

42m / 1h 30m
████████░░░░░

48 minutes remaining

Shorts
9m / 15m

Available until 9:00 PM

[ Parent Settings ]

Selecting Parent Settings prompts for PIN.

---

Parent Settings UI

Use a distinctly original design.

Do not visually copy YT Kids Guard.

Desired visual direction:

- modern
- clean
- friendly
- restrained
- ChromeOS-native feel
- rounded cards
- strong spacing
- clear typography
- minimal clutter

Avoid childish cartoon styling.

It should look like a legitimate polished consumer parental-control product.

Suggested sections:

Today

- today's usage
- remaining time
- bonus time
- reset usage
- add temporary time

Daily Limit

- enable/disable
- duration

Shorts

- allow
- block
- separate allowance

Schedule

- allowed hours
- optional day-specific limits

YouTube Experience

- disable autoplay
- hide Shorts
- hide comments
- hide recommendations
- hide live chat
- hide homepage feed

Security

- change PIN
- parent-session behavior
- reset extension

About

- extension version
- repository link if configured
- privacy statement

---

First-Run Setup

On first install:

1. Welcome screen
2. Explain that all information stays on the Chromebook.
3. Parent creates PIN.
4. Configure daily limit.
5. Configure Shorts.
6. Optional bedtime.
7. Finish setup.

Provide reasonable defaults.

Suggested defaults:

- Daily limit: 90 minutes
- Shorts: 15 minutes or blocked
- Allowed hours: disabled initially
- cosmetic YouTube restrictions: off

Do not start enforcing until setup has completed.

---

Privacy

The extension should collect no remote data.

No analytics.

No telemetry.

No tracking pixels.

No advertising SDK.

No external calls except those inherently made by the user's browser/YouTube.

All extension-specific data should remain in "chrome.storage.local".

Create a "PRIVACY.md" explaining exactly what is stored.

Include a concise privacy statement in the extension UI.

Example:

«This extension stores settings and YouTube watch-time data locally on this device. It does not send browsing history, watch history, PINs, or usage statistics to any server.»

---

Permissions

Use the minimum Chrome permissions required.

Likely candidates:

- "storage"
- "tabs" if genuinely required
- host permissions limited to YouTube

Prefer:

https://www.youtube.com/*

Do not request "<all_urls>".

Document why every permission is required.

---

Architecture

Use a clean architecture.

Likely components:

Content Script

Runs on YouTube.

Responsibilities:

- find active video player
- detect video play/pause/end
- detect Shorts versus normal videos
- react to SPA navigation
- enforce blocking overlays
- enforce cosmetic restrictions
- communicate playback state

Background Service Worker

Authoritative coordinator.

Responsibilities:

- aggregate playback state across tabs
- prevent double counting
- calculate elapsed real time
- periodically persist usage
- enforce daily reset
- manage bonus time
- expose current status to UI

Popup

Shows status and parent-entry point.

Options / Settings Page

Full parental configuration.

Shared Library

Utilities for:

- settings schema
- date handling
- duration formatting
- storage
- PIN hashing/validation
- watch-time accounting

Avoid duplicating business logic between the popup, options page, content scripts, and background worker.

---

Storage Schema

Define and version the storage schema.

Example conceptually:

{
  "schemaVersion": 1,
  "settings": {
    "setupComplete": true,
    "dailyLimitSeconds": 5400,
    "shortsMode": "separate",
    "shortsLimitSeconds": 900,
    "allowedHoursEnabled": true,
    "allowedStart": "07:00",
    "allowedEnd": "21:00",
    "disableAutoplay": true,
    "hideComments": false,
    "hideRecommendations": false,
    "hideLiveChat": false,
    "hideHomepageFeed": false
  },
  "security": {
    "pinHash": "...",
    "pinSalt": "...",
    "pinAlgorithmVersion": 1
  },
  "usage": {
    "date": "2026-09-05",
    "regularSeconds": 2800,
    "shortsSeconds": 400,
    "bonusRegularSeconds": 900,
    "bonusShortsSeconds": 0
  }
}

This is illustrative; design the actual schema appropriately.

Include migration support so future schema changes do not destroy existing settings.

---

Reliability Requirements

Watch-time tracking should remain correct during:

- Chrome restart
- Chromebook restart
- extension service-worker suspension/restart
- tab refresh
- YouTube SPA navigation
- switching between videos
- switching between normal videos and Shorts
- multiple YouTube tabs
- background playback
- network buffering
- changing video playback speed
- midnight rollover
- extension update

Never assume the Manifest V3 service worker remains continuously alive.

Design around MV3 lifecycle behavior.

---

Tests

Use automated tests for business logic.

At minimum test:

- daily date rollover
- accumulated watch-time calculation
- multiple concurrent playback sources do not double-count
- regular/Shorts separation
- bonus-time calculation
- limit reached logic
- bedtime schedule logic
- cross-midnight schedule logic if supported
- PIN hashing/validation
- storage schema migration
- duration formatting
- semver helper/version validation if applicable

Where practical, add browser-level tests using Playwright or another reasonable framework.

Browser tests should cover important extension interactions without making CI unnecessarily fragile.

---

Critical Regression Test

There MUST be an automated or integration-level test specifically for the bug that motivated this project:

1. accumulate watch time
2. persist state
3. simulate background/service-worker/browser restart
4. reload persisted state
5. confirm accumulated usage remains unchanged
6. resume playback
7. verify counting continues from the persisted value

This should never regress.

---

Development Commands

Provide consistent commands such as:

npm install
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npm run package

"npm run build" should create a production-ready unpacked extension.

"npm run package" should produce a ZIP suitable for uploading to the Chrome Web Store or installing through appropriate Chrome tooling.

---

Build Output

Use:

dist/

for unpacked production extension output.

Create packaged ZIP files under something like:

artifacts/
youtube-parental-control-v1.2.3.zip

Do not commit generated build output unless there is a strong reason.

---

GitHub Actions

Create GitHub Actions workflows.

Pull Request CI

Trigger:

pull_request:

Run:

1. dependency install using lockfile
2. lint
3. typecheck
4. unit tests
5. production build
6. package dry run
7. validate "manifest.json"
8. verify manifest version matches project version
9. ensure resulting extension artifact exists

Do not publish anything from PR builds.

The purpose is to prove the PR can produce a valid extension.

---

Main Branch Build

When a PR merges to "main":

Run:

1. dependency install
2. lint
3. typecheck
4. tests
5. production build
6. package extension
7. upload ZIP as GitHub Actions artifact

The artifact name should include the semantic version.

Example:

youtube-parental-control-v1.3.0.zip

---

Releases

Prefer automated GitHub Releases.

When the version changes on "main", create a Git tag:

v1.3.0

Then create a GitHub Release containing:

- version
- generated changelog/release notes
- packaged Chrome extension ZIP

Do not attempt automatic Chrome Web Store publication unless explicitly added later.

---

Semantic Versioning

Follow SemVer:

MAJOR.MINOR.PATCH

Examples:

Patch:

- bug fix
- CSS correction
- internal refactor without user-visible behavior change
- tracking reliability fix

Minor:

- new parental setting
- new blocking capability
- new UI feature
- backwards-compatible feature

Major:

- breaking storage/schema behavior
- significant incompatible UX/configuration change
- rewrite requiring reset/migration that cannot preserve compatibility

Keep version synchronized between:

- "package.json"
- Chrome "manifest.json"
- displayed UI version
- release artifact
- Git tag

Chrome manifest versions must comply with Chrome's version-format restrictions.

Do not append unsupported prerelease strings directly to the manifest version.

---

Version Determination for Agent-Generated Changes

Coding agents should evaluate the semantic impact of their changes.

For every PR, determine whether the change is:

- patch
- minor
- major
- no-version-change

Prefer explicitly labeling/documenting the bump in the PR.

If a user-visible functional change occurs, update the version as part of the PR.

Do not blindly increment a version for documentation-only changes unless appropriate.

Include tooling to verify version consistency.

---

Changelog

Maintain:

CHANGELOG.md

Use a Keep-a-Changelog-style structure.

Example:

# Changelog

## [1.2.0] - 2026-09-05

### Added
- Separate Shorts daily allowance.
- Parent bonus-time controls.

### Fixed
- Daily usage now persists across Chrome restarts.

Every released version should have meaningful release notes.

---

AGENTS.md

Create an "AGENTS.md" at the repository root.

This file exists primarily for Codex and future coding agents.

It should explain:

Repository purpose

This is a local-only Chrome/ChromeOS parental-control extension for enforcing actual YouTube playback-time limits.

Non-negotiable invariants

Explicitly state:

1. Watch time means actual video playback time.
2. Browsing YouTube alone must never consume watch time.
3. Daily usage must survive browser and Chromebook restarts.
4. Multiple simultaneously playing tabs must not double-count elapsed time.
5. All user data remains local.
6. Raw parental PINs must never be stored.
7. The extension must continue to work with Manifest V3 service-worker suspension.
8. Cosmetic YouTube controls must never compromise core timer reliability.
9. Permissions must remain minimal.
10. Core usage data must not be reset during ordinary extension upgrades.

Architecture

Explain:

- content scripts
- background service worker
- popup
- settings UI
- shared modules
- persistence system

Development workflow

Explain commands for:

- install
- test
- lint
- build
- package

Testing expectations

Agents modifying timer or persistence code MUST add/update tests.

Agents must run all validation before considering work complete.

Versioning

Explain SemVer policy.

Agents must determine whether their work requires:

- patch
- minor
- major
- no bump

Update all necessary version locations consistently.

Changelog

User-visible changes require a changelog entry.

Pull request expectations

Before completing a task:

- run lint
- run typecheck
- run tests
- run production build
- verify extension package
- summarize architecture-impacting changes
- call out migrations explicitly

Security

Never:

- send PINs remotely
- introduce analytics without explicit approval
- broaden host permissions casually
- add "<all_urls>"
- store plaintext PINs
- add unnecessary third-party scripts

YouTube DOM fragility

Any code relying on YouTube DOM selectors should:

- fail gracefully
- isolate selectors
- avoid coupling core watch-time accounting to cosmetic selectors
- include comments explaining brittle assumptions

---

README.md

Create a polished README.

Include:

- what the extension does
- screenshots placeholder section
- features
- architecture overview
- local development
- build instructions
- loading unpacked extension in Chrome
- running tests
- packaging
- privacy model
- permissions explanation
- versioning/release workflow

Also include Chromebook testing instructions.

---

UX Requirement: Remaining Time

Make remaining time easy for the child to understand.

Examples:

"38 minutes left today"

Near limit:

"5 minutes left today"

At limit:

"YouTube time is finished for today"

Optionally show warnings at:

- 15 minutes remaining
- 5 minutes remaining
- 1 minute remaining

Warnings should be non-disruptive toast notifications over YouTube.

Do not repeatedly show the same warning.

---

Parent Bonus-Time UX

When near/at the limit, parent should be able to quickly enter the PIN and select:

+5 min
+15 min
+30 min
Unlimited today

This should take only a few interactions.

"Unlimited today" must only affect the current calendar date.

Tomorrow should return to the normal configured limit.

---

Tamper Considerations

This is not intended to defend against a technically sophisticated attacker with developer-mode access.

It should, however, resist casual circumvention.

Protect settings with PIN.

Do not expose an obvious unprotected button that clears usage.

Do not allow reopening Chrome to reset usage.

Do not let clearing a tab or navigating away reset usage.

Document that Chrome Family Link may still permit a supervised child to uninstall an extension; that limitation cannot be solved by normal extension code.

Do not pretend the extension can protect itself from Chrome-level removal if it cannot.

---

Initial Definition of Done

The first production-quality release is complete when all of the following work:

- Extension installs as Manifest V3.
- First-run parent setup works.
- Parent PIN is securely stored as a derived hash.
- Daily limit can be configured.
- Actual YouTube playback is tracked.
- Paused video does not count.
- Browsing YouTube does not count.
- Background playback does count.
- Playback speed does not affect elapsed-time accounting.
- Usage persists through browser restart.
- Usage persists through Chromebook restart.
- Usage survives MV3 service-worker suspension.
- Usage resets on the next local calendar day.
- Multiple tabs do not double-count.
- Daily limit stops playback.
- Block screen appears at the limit.
- Parent can grant temporary bonus time.
- Shorts can be blocked.
- Shorts can optionally have their own allowance.
- Optional bedtime/allowed-hours enforcement works.
- Popup shows today's usage and remaining time.
- Parent settings are PIN protected.
- No network/backend dependency exists.
- Automated unit tests pass.
- Restart persistence has a regression test.
- Production build succeeds.
- PR GitHub Action performs a complete dry-run build.
- Main branch GitHub Action creates a packaged ZIP.
- Semantic version consistency is automatically validated.
- "README.md" exists.
- "PRIVACY.md" exists.
- "CHANGELOG.md" exists.
- "AGENTS.md" exists.

---

Implementation Priorities

Prioritize in this exact order:

1. Correct playback detection
2. Reliable persistent accounting
3. Correct daily reset behavior
4. Limit enforcement
5. Multi-tab correctness
6. PIN/security
7. Parent bonus time
8. Shorts limits
9. Scheduling
10. Parent UI polish
11. Cosmetic YouTube controls

Do not sacrifice items 1–5 to make the UI prettier.

The timer is the product.

---

First Codex Task

Start by scaffolding the complete repository and implementing the architecture.

Before writing substantial UI code:

1. Define the storage schema.
2. Define the watch-time accounting model.
3. Explain in a short architecture document how the design survives Manifest V3 service-worker suspension.
4. Implement the persistence/accounting layer.
5. Write tests for it.
6. Implement YouTube playback detection.
7. Implement multi-tab coordination.
8. Add the restart-persistence regression test.
9. Then build the parent UI and secondary features.

Create small, logically organized commits where possible.

Do not leave placeholder implementations for core timer behavior.

When finished, provide a summary including:

- architecture chosen
- storage model
- how playback is detected
- how double-counting is prevented
- how restart persistence works
- tests implemented
- build commands
- resulting semantic version
- any Chrome/YouTube limitations discovered