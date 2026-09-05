export interface VideoAdapterCallbacks {
  onPotentialChange(): void;
  shouldBlockPlayback?(): boolean;
}

const MEDIA_EVENTS = ["play", "playing", "pause", "waiting", "stalled", "ended", "timeupdate"] as const;

export class YouTubeVideoAdapter {
  private video: HTMLVideoElement | null = null;
  private readonly observer: MutationObserver;
  private readonly eventHandler = (): void => {
    if (this.callbacks.shouldBlockPlayback?.() && this.video && !this.video.paused) this.video.pause();
    this.callbacks.onPotentialChange();
  };
  private readonly navigationHandler = (): void => { this.discover(); this.callbacks.onPotentialChange(); };

  constructor(private readonly callbacks: VideoAdapterCallbacks) {
    this.observer = new MutationObserver(() => this.discover());
  }

  start(): void {
    this.observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener("yt-navigate-finish", this.navigationHandler);
    this.discover();
  }

  stop(): void {
    this.observer.disconnect();
    window.removeEventListener("yt-navigate-finish", this.navigationHandler);
    this.bind(null);
  }

  current(): HTMLVideoElement | null { return this.video; }
  pause(): void { this.video?.pause(); }

  private discover(): void {
    const candidates = Array.from(document.querySelectorAll("video"));
    const next = candidates.find((candidate) => !candidate.ended && candidate.readyState > 0) ?? candidates[0] ?? null;
    if (next !== this.video) {
      this.bind(next);
      this.callbacks.onPotentialChange();
    }
  }

  private bind(next: HTMLVideoElement | null): void {
    if (this.video) for (const event of MEDIA_EVENTS) this.video.removeEventListener(event, this.eventHandler);
    this.video = next;
    if (this.video) for (const event of MEDIA_EVENTS) this.video.addEventListener(event, this.eventHandler);
  }
}
