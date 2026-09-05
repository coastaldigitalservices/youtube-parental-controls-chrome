# Privacy Policy — YouTube Parental Controls

**Effective date: September 5, 2026**

YouTube Parental Controls operates locally in Chrome. The extension observes YouTube video playback state—including whether video media is progressing and whether the page represents a Short—solely to calculate and enforce parent-configured watch-time limits, Shorts rules, and allowed hours.

The extension stores the following in `chrome.storage.local`:

- parental settings, including limits, schedule, optional YouTube experience controls, and setup state;
- daily regular-video and Shorts usage totals, bonuses/overrides, date, and accounting metadata; and
- a randomly salted PBKDF2 verifier for the parental PIN. Raw PINs are not stored.

This data remains in the local Chrome profile. The extension has no external backend and sends no personal information to the developer or anyone else. It does not transmit browsing history or YouTube watch history. It has no analytics or telemetry, advertising, or data sales. No account is required.

A parent can erase settings and usage with **Erase all local data** in Parent Controls. Removing the extension also removes its extension data under Chrome's normal extension-data behavior. Because there is no account or server, the developer cannot recover a PIN or remotely delete or restore data.

The extension accesses only pages on `https://www.youtube.com/` to detect playback, enforce configured controls, and apply optional page appearance controls. It uses Chrome's `storage` permission solely for the local data described above.

Questions about this policy should be directed to the support contact supplied by the developer on the Chrome Web Store listing. The developer must add a working contact address there before publication.
