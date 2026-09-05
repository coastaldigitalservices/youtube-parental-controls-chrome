# Phase 1 architecture and storage

The content script keeps YouTube-specific DOM discovery in `youtube-video-adapter`.
It treats media events as prompts to verify, not proof of playback: media time must
advance on periodic samples. Visibility, focus, audio and playback rate are not
inputs. Each document has a random source ID and renews an active lease every five
seconds; `/shorts/` is classified independently.

The service worker is the coordinator. Reports are keyed by tab, frame and source.
It converts all unexpired reports into one active bucket. If regular and Shorts
overlap, the most recently verified source wins (with identity as a stable tie
breaker), so total usage never advances faster than wall time. Elapsed values use
the monotonic `performance` clock, are capped at ten seconds, and are
checkpointed every six seconds while the worker is alive. Pause, page exit and tab
removal request an immediate checkpoint. A restarted worker clears leases and waits
for fresh verification rather than backfilling an unknown interval.

## Storage schema

The single `parentalControlsState` object in `chrome.storage.local` contains:

- `schemaVersion` (currently 1);
- settings, including nullable limits and nullable salted PBKDF2 metadata (never a
  raw PIN);
- the current local-date usage record, with regular/Shorts counters, same-day bonus
  fields, revision and update timestamp.

All reads and serialized read-modify-writes pass through `StateStore`. Runtime
validation rejects partial/corrupt current records; migration preserves the
pre-version prototype's `watchedSeconds`. Every operation recomputes the local
calendar date from local `Date` components. A changed day replaces usage only and
retains settings. Ephemeral source leases never enter durable storage.
