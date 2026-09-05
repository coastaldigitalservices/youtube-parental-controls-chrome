# Repository guide

- Run `npm run check` before committing changes.
- Keep YouTube DOM selectors isolated in `src/content/youtube-video-adapter.ts`.
- Only `StateStore` may directly read or write the durable extension state.
- Timer/date/storage changes require focused tests, including restart behavior.
- Generated `dist/`, `.build/`, `.test-dist/`, and `artifacts/` files are ignored.
