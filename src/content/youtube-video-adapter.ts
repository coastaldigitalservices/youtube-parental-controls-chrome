export interface VideoAdapterCallbacks {
  onPotentialChange(): void;
  shouldBlockPlayback?(): boolean;
}

export interface YouTubeExperienceControls {
  disableAutoplay: boolean; hideShorts: boolean; hideComments: boolean; hideLiveChat: boolean;
  hideRecommendations: boolean; hideHomeFeed: boolean;
}

// These selectors are intentionally isolated and fail-soft. YouTube may rename them;
// playback detection and policy enforcement do not depend on individual selector in this list.
const COSMETIC_SELECTORS = {
  shorts: "ytd-guide-entry-renderer a[title='Shorts'], ytd-mini-guide-entry-renderer a[title='Shorts'], ytd-rich-shelf-renderer[is-shorts]",
  comments: "ytd-comments#comments",
  liveChat: "ytd-live-chat-frame#chat, #chat-container",
  recommendations: "ytd-watch-next-secondary-results-renderer, #secondary.ytd-watch-flexy",
  homeFeed: "ytd-browse[page-subtype='home'] ytd-rich-grid-renderer"
} as const;

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

  applyExperienceControls(controls: YouTubeExperienceControls): void {
    const rules = [
      [controls.hideShorts, COSMETIC_SELECTORS.shorts], [controls.hideComments, COSMETIC_SELECTORS.comments],
      [controls.hideLiveChat, COSMETIC_SELECTORS.liveChat], [controls.hideRecommendations, COSMETIC_SELECTORS.recommendations],
      [controls.hideHomeFeed, COSMETIC_SELECTORS.homeFeed]
    ] as const;
    let style = document.querySelector<HTMLStyleElement>("#yt-parental-controls-cosmetics");
    if (!style) { style = document.createElement("style"); style.id = "yt-parental-controls-cosmetics"; document.documentElement.append(style); }
    style.textContent = rules.filter(([enabled]) => enabled).map(([, selector]) => `${selector}{display:none!important}`).join("\n");
    if (controls.disableAutoplay) this.disableAutoplay();
  }

  private disableAutoplay(): void {
    // Best effort only: click the documented-by-accessibility toggle when it is on.
    try {
      const toggle = document.querySelector<HTMLElement>(".ytp-autonav-toggle-button[aria-checked='true']");
      toggle?.click();
    } catch { /* Cosmetic controls never affect enforcement or accounting. */ }
  }

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
