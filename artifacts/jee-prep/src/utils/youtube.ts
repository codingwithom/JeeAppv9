// YouTube and Invidious/Piped client-side resolution helper

export interface InvidiousInstanceInfo {
  type: string;
  cors: boolean | null;
  api: boolean | null;
  monitor?: {
    down: boolean;
  };
  uri: string;
}

const FALLBACK_INVIDIOUS = [
  "https://invidious.f5.si",
  "https://inv.thepixora.com",
  "https://invidious.nerdvpn.de",
  "https://invidious.jing.rocks",
  "https://vid.puffyan.us",
  "https://invidious.privacydev.net",
  "https://inv.tux.pizza",
  "https://invidious.lunar.icu",
  "https://invidious.flokinet.to"
];

const FALLBACK_PIPED = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.smnz.de",
  "https://piped-api.lunar.icu",
  "https://pipedapi.adminforge.de",
  "https://pipedapi.tokhmi.xyz"
];

let cachedInvidiousInstances: string[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes cache

/**
 * Dynamically fetches healthy Invidious instances from api.invidious.io.
 * Reverts to a verified hardcoded list if the dynamic fetch fails or returns empty.
 */
export async function getInvidiousInstances(): Promise<string[]> {
  const now = Date.now();
  if (cachedInvidiousInstances && (now - lastFetchTime < CACHE_DURATION)) {
    return cachedInvidiousInstances;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    
    // api.invidious.io is CORS-enabled and returns JSON list of instances
    const res = await fetch("https://api.invidious.io/instances.json", {
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const parsedInstances = data
          .filter((item: any) => {
            const info = item[1] as InvidiousInstanceInfo;
            // Get all HTTPS instances that have API enabled (registry CORS flags are often inaccurate,
            // we will query and let the browser CORS policy verify them dynamically)
            return (
              info &&
              info.type === "https" &&
              info.api !== false &&
              (!info.monitor || info.monitor.down === false)
            );
          })
          .map((item: any) => item[1].uri);

        if (parsedInstances.length > 0) {
          // Prepend dynamically found instances to fallback instances, removing duplicates
          const uniqueInstances = Array.from(new Set([...parsedInstances, ...FALLBACK_INVIDIOUS]));
          cachedInvidiousInstances = uniqueInstances;
          lastFetchTime = now;
          return uniqueInstances;
        }
      }
    }
  } catch (err) {
    console.warn("Failed to dynamically fetch Invidious instances, using fallbacks:", err);
  }

  // Fallback to hardcoded instances
  return FALLBACK_INVIDIOUS;
}

export function getPipedInstances(): string[] {
  return FALLBACK_PIPED;
}
