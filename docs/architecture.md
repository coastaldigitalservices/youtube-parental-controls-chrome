# Architecture

## Watch-time accounting

The YouTube content context is the stopwatch. Every two seconds, and on relevant media/navigation/visibility events, it compares `HTMLVideoElement.currentTime` with the prior sample. It emits a wall-clock interval only when a valid video is unpaused, unended, policy-allowed, ready, and media time genuinely advanced. Playback rate therefore does not alter allowance consumption: five real seconds at 2× is five seconds.

Each interval carries a random per-page `sourceId`, monotonically increasing `sequence`, bucket, and `Date.now()` start/end timestamps. Delivery is retried with the same identity until acknowledged. Periodic delivery—not unload—is the correctness mechanism, bounding normal hard-crash loss to one sampling interval (about two seconds). Gaps above ten seconds are not inferred or backfilled.

The Manifest V3 service worker has no active-source map or stopwatch. A message wakes any new worker instance, which immediately asks `StateStore` to commit the self-contained interval. Worker suspension between every pair of reports therefore loses no acknowledged time.

`StateStore` persists compact accounting metadata with daily usage. Highest processed sequences provide retry deduplication. A rolling union of recently covered wall-clock ranges removes overlap before attribution, so concurrent tabs are never summed. Adjacent ranges coalesce, old coverage is pruned, and source sequence records are age- and count-bounded. Intervals are split at local midnight before applying the current day's allowance.

## Trust and privacy boundaries

Only `StateStore` reads or writes durable extension state. Policy decisions run in the worker and content fails closed by pausing playback whenever policy/storage status cannot be verified. YouTube selectors remain isolated in `youtube-video-adapter.ts`, and cosmetic controls cannot affect accounting or enforcement.

All state and diagnostics remain local. There is no backend, telemetry, analytics, remote code, or raw PIN storage. Runtime permissions remain limited to extension storage and `https://www.youtube.com/*`.

For local troubleshooting, append `?ytpcDebug=1` to a YouTube watch URL and open the page and extension-worker developer consoles. The opt-in logs show content verification heartbeats, queued/persisted intervals, worker startup time, last processed sequence, persisted bucket totals, and policy-block state. Nothing is transmitted off-device.

## Clean-profile smoke test

1. Load the unpacked production build in a clean Chrome profile and complete setup.
2. Play a regular video for at least 30 seconds, background the tab, and confirm usage continues increasing.
3. Inspect the extension service worker, stop it repeatedly between samples, and confirm the popup total continues increasing after each automatic restart.
4. Play overlapping videos in two tabs and confirm elapsed usage tracks wall time rather than the sum.
5. Pause and buffer a video and confirm usage stops; play at 2× and confirm real time, not media duration, is consumed.
6. Confirm reaching the allowance pauses playback within one content sampling/status cycle.
