# Chrome Web Store submission notes

These answers reflect the source and production manifest at version 0.3.0. Re-audit them whenever data handling or permissions change.

## Single purpose

**Recommended answer:** “Provide parent-controlled YouTube watch-time, Shorts, and allowed-hours limits by measuring actual video playback locally and pausing playback when a configured rule is reached.”

Optional YouTube page-cleanup controls support that purpose. Do not describe this as unremovable or as an OS security boundary.

## Permission justifications

- **`storage`:** Persists parental settings, the salted PIN verifier, daily usage/accounting data, and same-day overrides in the local Chrome profile so limits survive worker/browser restarts.
- **Host access — `https://www.youtube.com/*`:** Runs the playback observer and enforcement UI only on YouTube, detects actual media-time progression and Shorts, pauses disallowed playback, and applies optional page cleanup. No broader host access or `tabs` permission is requested.

## Privacy Practices answers

- **Does the extension handle web browsing activity?** **Yes.** Select the dashboard's browsing-activity category because the extension observes activity on YouTube pages and whether a YouTube video is playing. Explain that this is processed locally only to provide the disclosed single purpose. It does not retain URLs, titles, video IDs, search terms, or watch history.
- **Does it collect user data?** Google's form generally treats data used or transmitted by the extension as “collected,” even when processed locally. Disclose **Web history / website activity** conservatively if the current form includes locally processed browsing activity. The implementation records only aggregate seconds and a regular/Shorts bucket, not visited URLs or watch history. The exact checkbox wording is dashboard-dependent and requires the developer's judgment at submission time.
- **Personally identifiable information, health, financial/payment, authentication, personal communications, location, and user-generated content:** **No**, based on the current implementation. A parental PIN is accepted locally but raw PINs are neither stored nor transmitted; only a salted verifier is retained.
- **Is any user data transmitted off-device?** **No.** Extension code has no backend, analytics, telemetry, ads, or data-sale path. Chrome's own extension update/sync platform behavior is outside this extension; the code specifically uses `chrome.storage.local`, not sync.
- **Data sale; use for unrelated purposes; credit/lending:** **No** to each.
- **Privacy policy:** provide the stable HTTPS URL for `store/privacy-policy.html` after publishing it.

## Limited Use certification

Certify only after reading the current dashboard language. On this code, the appropriate representation is that use of YouTube playback activity is limited to the prominent single purpose, data is not transferred, not used for advertising, and not used for human credit decisions. Re-audit before checking the certification; it is a developer/legal attestation, not something CI can make.

## Reviewer notes

The extension is local-only and needs no test account. Explain setup: install, open **Parent settings**, create a 4–8 digit PIN and choose a short daily limit, then play a video on `www.youtube.com`. Mention that the optional cosmetic controls may track YouTube DOM changes independently of accounting.
