# Store publication assets

This directory is publication-only and is deliberately excluded from `dist/` and the release ZIP.

- `listing.md`: ready-to-paste listing copy.
- `privacy-policy.md` / `.html`: matching policy source and hostable page.
- `submission-notes.md`: privacy/permission form guidance.
- `assets/icon-128.png`: 128×128 original project icon.
- `assets/promo-small-440x280.png`: 440×280 original promotional tile, without third-party logos.
- `assets/screenshot-1.png`: 1280×800 **capture placeholder; replace before submission with a real browser capture**.

## Shortest reliable screenshot process

Automated extension screenshots are not enabled because the locked project has no browser automation dependency or browser binary. `npm run store:screenshots` builds the exact UI to capture and prints this reminder.

1. Run `npm ci && npm run store:screenshots`.
2. In a clean Chrome profile, open `chrome://extensions`, enable Developer mode, and load `dist/`.
3. Open **Parent settings**, create a non-sensitive demonstration PIN, set representative controls (for example 60 minutes, separate 15-minute Shorts allowance, and an 08:00–20:00 schedule), then unlock the page.
4. Resize the browser viewport to exactly 1280×800, ensure no profile identity/bookmarks/personal pages appear, and capture the visible real extension page as a PNG.
5. Replace `store/assets/screenshot-1.png`; verify dimensions and visually inspect it. Never submit the placeholder.

This is preferable to a brittle or fabricated mockup. If Playwright is added later, it must load `dist/`, seed only `chrome.storage.local`, open the actual options URL, and capture the real rendered page.
