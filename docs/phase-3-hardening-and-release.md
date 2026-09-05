# Phase 3: hardening and release

## Goal

Polish the extension without weakening its timer, exercise it against realistic
Chrome/YouTube lifecycle behavior, and automate production packaging and
versioned releases from `main`.

## Scope

### 1. Product polish and accessibility

- Refine setup, popup, settings, overlay, and toast visuals into an original,
  restrained ChromeOS-style system with consistent spacing, typography,
  rounded cards, keyboard navigation, focus management, contrast, reduced-
  motion support, and screen-reader labels.
- Make remaining time the clearest child-facing information and keep common
  authenticated bonus actions to only a few interactions.
- Add useful empty, loading, error, migration, and storage-failure states. Never
  fail open silently: communicate when reliable enforcement cannot be assured.
- Verify responsive layouts at popup dimensions and common Chromebook display
  sizes.

### 2. Optional YouTube experience controls

Implement independent, fail-soft settings for:

- disabling autoplay where practical;
- hiding Shorts entry points;
- hiding comments and live chat;
- hiding recommendations/sidebar; and
- hiding the homepage feed.

Selectors belong in the YouTube adapter, are documented as brittle, and fail
gracefully. Direct Shorts blocking remains policy enforcement. A broken cosmetic
selector must never throw through, disable, or alter accounting.

### 3. Lifecycle and compatibility hardening

- Exercise tab creation/removal, duplicate messages, out-of-order messages,
  worker suspension, extension update, offline startup, storage write failure,
  YouTube DOM replacement, route changes, buffering, picture-in-picture where
  observable, and playback in background tabs.
- Validate fresh install and schema migration from every released schema. Core
  usage and settings must survive ordinary upgrades.
- Manually test stable Chrome on ChromeOS/Chromebook hardware where available;
  otherwise document the closest ChromeOS-equivalent validation and remaining
  gap.
- Review content-security policy, message validation, permission scope,
  dependency provenance, and the absence of remote calls/telemetry.

### 4. Documentation and repository guidance

- Create the polished root `README.md` with features, architecture, screenshots,
  development, unpacked installation, Chromebook testing, packaging, privacy,
  permissions, and release workflow.
- Create root `AGENTS.md` with the repository invariants, architecture, commands,
  testing rules, SemVer/changelog policy, security constraints, selector
  guidance, and PR checklist required by `PROJECT.md`.
- Maintain a Keep-a-Changelog-style `CHANGELOG.md` and record any user-visible
  behavior delivered by Phases 1–3.
- Document known limitations honestly, including YouTube DOM churn and the lack
  of protection against extension removal or storage clearing by a sufficiently
  privileged user.

### 5. Release automation

- On pushes/merges to `main`, run the same locked install, lint, typecheck,
  tests, build, packaging, manifest checks, and version checks used for PRs.
- Upload `artifacts/youtube-parental-control-vX.Y.Z.zip` as a workflow artifact.
- When a new valid version lands on `main`, create the matching `vX.Y.Z` tag and
  GitHub Release with generated notes and the ZIP. Make the workflow idempotent
  so reruns do not create conflicting releases.
- Keep `package.json`, manifest, displayed version, artifact name, tag, and
  release version synchronized. Manifest versions contain only Chrome-supported
  numeric components.
- Do not automate Chrome Web Store publication unless a future requirement
  explicitly adds and secures that capability.

## Required validation

- Full unit and integration suite, including the restart-persistence regression.
- Deterministic browser-level smoke tests for installation/setup, active versus
  paused media, restart restoration, blocking, PIN override, Shorts policy, and
  allowed hours.
- Production unpacked build inspection and clean-profile installation.
- ZIP contents inspection: no source maps containing secrets, test fixtures,
  development-only permissions, or unrelated files.
- Automated manifest schema/version validation and offline/network-request
  review for extension-owned code.
- Accessibility checks plus manual keyboard and screen-reader spot checks.

## Exit criteria

Phase 3 is complete only when:

1. All Initial Definition of Done items in `PROJECT.md` are demonstrated by an
   automated check or a documented manual verification.
2. A clean Chrome profile can install the production build, complete setup,
   enforce playback policy, survive restart, and accept an authenticated bonus.
3. Optional cosmetic controls can fail independently without affecting timing
   or enforcement.
4. Documentation, privacy disclosures, permissions, changelog, agent guidance,
   and known limitations match the shipped behavior.
5. Pull requests perform a non-publishing production dry run, while `main`
   produces a correctly versioned artifact and release.
6. The chosen semantic version is consistent everywhere and its release notes
   accurately describe the delivered product.
