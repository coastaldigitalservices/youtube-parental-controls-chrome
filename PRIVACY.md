# Privacy and permissions

YouTube Parental Controls works locally and sends no analytics, telemetry, account information, settings, or watch history to a server.

## Data stored in `chrome.storage.local`

- Setup-completion status and the storage schema version.
- Daily regular-video and Shorts limits, Shorts mode, and the optional allowed-hours schedule.
- A versioned PBKDF2-SHA-256 PIN verifier, random salt, and iteration count. The PIN itself is never stored.
- The current local calendar date; seconds used for regular videos and Shorts; today's bonus-time and unlimited override; displayed warning thresholds; update revision; and update timestamp.

The parent unlock session exists only in service-worker memory for about five minutes. Restarting Chrome or the worker locks it.

## Permissions

- **Storage** stores the local controls and restart-safe daily usage described above.
- **`https://www.youtube.com/*` host access** detects progressing YouTube video elements, pauses disallowed playback, and displays the block screen. No `<all_urls>` or `tabs` permission is requested.

Removing the extension clears its data under Chrome's normal extension-data behavior. A parent can also use the deliberate reset in Parent Controls. Because there is no account or server, there is no remote PIN recovery. A user with sufficient access to Chrome settings or developer mode can disable, remove, or clear the extension.
