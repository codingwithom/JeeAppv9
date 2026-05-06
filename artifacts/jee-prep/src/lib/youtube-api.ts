// Shared singleton for loading the YouTube IFrame Player API.
// All components (VideoPage, MusicContext) share this so the script is only loaded once
// and onYouTubeIframeAPIReady callbacks are chained correctly.

let loading = false;
let ready = false;
const pendingCallbacks: (() => void)[] = [];

export function loadYouTubeApi(): Promise<void> {
  return new Promise((resolve) => {
    if (ready && (window as any).YT?.Player) {
      resolve();
      return;
    }
    pendingCallbacks.push(resolve);
    if (!loading) {
      loading = true;
      const prevCallback = (window as any).onYouTubeIframeAPIReady as (() => void) | undefined;
      (window as any).onYouTubeIframeAPIReady = () => {
        prevCallback?.();
        ready = true;
        pendingCallbacks.forEach((cb) => cb());
        pendingCallbacks.length = 0;
      };
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const s = document.createElement("script");
        s.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(s);
      }
    }
  });
}
