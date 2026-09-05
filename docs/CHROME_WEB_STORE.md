# Chrome Web Store: first publication and automation

The release pipeline is designed for an existing **UNLISTED** item. Creating the developer account/item, completing legal declarations, and the initial review remain manual.

## One-time first publication

1. Register in the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/) with the Google account that will own the item.
2. Enable [2-Step Verification](https://myaccount.google.com/signinoptions/two-step-verification) for that account.
3. Pay the one-time developer registration fee shown by the dashboard. Price, tax, and accepted payment methods depend on the account/region and can change.
4. From a clean checkout run `npm ci && npm run check && npm run package`. Inspect `dist/` and `artifacts/youtube-parental-controls-vX.Y.Z.zip`; `npm run validate:store` is mandatory but does not replace human inspection.
5. In the dashboard choose **New item** and upload that ZIP. Do this once only; later releases update this same item.
6. Paste the fields from [`store/listing.md`](../store/listing.md).
7. Upload `store/assets/icon-128.png`, `promo-small-440x280.png`, and a real replacement for `screenshot-1.png`. Follow the current [listing requirements](https://developer.chrome.com/docs/webstore/cws-dashboard-listing/).
8. Complete Privacy Practices using [`store/submission-notes.md`](../store/submission-notes.md), checking the current wording rather than treating the guide as legal advice.
9. Host `store/privacy-policy.html` at a stable HTTPS URL and enter that URL. The optional Pages workflow below is suitable for a public repository.
10. On Distribution choose **Unlisted**. Do not choose Public or Private. See [distribution settings](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution/).
11. Provide a support contact, complete all dashboard declarations, preview the listing, and submit the first release manually. Google may require additional account verification, testing instructions, justification, or policy changes; review timing and acceptance cannot be automated.
12. After the item exists, copy its stable extension ID from the dashboard/listing URL.

## Configure Chrome Web Store API v2

Use Google's current [Chrome Web Store API guide](https://developer.chrome.com/docs/webstore/using-api) and [API v2 reference](https://developer.chrome.com/docs/webstore/api/reference/rest/) to create OAuth credentials authorized for the publisher account and obtain a refresh token. The workflow uses API v2 endpoints under `chromewebstore.googleapis.com`, uploads to the existing item, fetches status, then calls `:publish`; it never creates an item or changes visibility.

OAuth refresh credentials are the simplest broadly supported setup for one developer-owned extension. A service account reduces long-lived personal OAuth credentials, but should be used only if the current dashboard/API documentation allows adding it to this publisher and granting the minimum role; ownership and access setup is more involved. The checked-in workflow therefore uses OAuth client + refresh token. Revisit this choice if Google makes service accounts the recommended path for the publisher.

Add these **GitHub Actions secrets** (repository **Settings → Secrets and variables → Actions**):

- `CWS_CLIENT_ID` — OAuth client ID.
- `CWS_CLIENT_SECRET` — OAuth client secret.
- `CWS_REFRESH_TOKEN` — offline refresh token authorized for Web Store publishing.
- `CWS_PUBLISHER_ID` — publisher/group identifier used by API v2.
- `CWS_EXTENSION_ID` — the one existing item ID created above.

There are no required Actions variables. Protect the `production` GitHub Environment if approval before submission is desired. Never put any value above into source, artifacts, workflow commands, or issue logs. Rotate a credential immediately if exposed.

## Subsequent releases

1. Bump `package.json`, `package-lock.json`, and `manifest.json` to the same greater SemVer; update `CHANGELOG.md`.
2. Open a PR. The PR workflow validates but cannot publish.
3. Merge to `main`. A version already present as a Git tag/release fails rather than overwriting it; this guards against uploading a non-incremented release. The workflow creates `youtube-parental-controls-vX.Y.Z.zip`, artifact, tag, and GitHub Release, then publishes through the existing CWS item when all five secrets are configured.
4. Monitor the Web Store dashboard for automated checks/review and respond manually if Google requests information. Existing **UNLISTED** visibility remains a dashboard property.

## Privacy policy hosting

For a public repository, enable **GitHub Pages: GitHub Actions** in repository Settings → Pages. `.github/workflows/privacy-pages.yml` publishes only the HTML policy at `/privacy-policy.html`; it does not publish the repository, build, or secrets. The stable URL is normally `https://OWNER.github.io/REPOSITORY/privacy-policy.html`.

If the repository is private and the account's Pages settings would expose more than intended or do not provide public Pages, deploy this one HTML file to any stable HTTPS static host you control. Verify it is publicly accessible without authentication before entering it in the dashboard.
