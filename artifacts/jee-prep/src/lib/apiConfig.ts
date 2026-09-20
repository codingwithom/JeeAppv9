/**
 * API Configuration & Fetch Interceptor
 * Ensures all API calls work seamlessly across stude.is-best.net, omnetwork.in, and local environments.
 */

export function getBackendBaseUrl(): string {
  if (typeof window === "undefined") return "";

  // 1. Check custom user override in localStorage
  const savedOverride = localStorage.getItem("jee_backend_api");
  if (savedOverride) return savedOverride.replace(/\/$/, "");

  // 2. Check environment variable if provided during build
  if (import.meta.env.VITE_API_URL) {
    return (import.meta.env.VITE_API_URL as string).replace(/\/$/, "");
  }

  // 3. If hosted on stude.is-best.net or external static host, route API to live omnetwork.in backend
  const hostname = window.location.hostname.toLowerCase();
  const isStaticHost =
    hostname.includes("stude.is-best.net") ||
    hostname.includes("is-best.net") ||
    hostname.endsWith(".github.io") ||
    hostname.endsWith(".web.app") ||
    hostname.endsWith(".firebaseapp.com");

  if (isStaticHost) {
    return "https://omnetwork.in";
  }

  // 4. Default: relative same-origin (for localhost and fullstack deployments)
  return "";
}

/**
 * Initializes global fetch interception for relative `/api/*` endpoints.
 * When running on a static domain like stude.is-best.net, automatically redirects
 * `/api/` calls to the live backend server while preserving CORS credentials.
 */
export function setupApiInterceptors() {
  if (typeof window === "undefined" || (window as any).__api_interceptors_initialized) return;
  (window as any).__api_interceptors_initialized = true;

  const originalFetch = window.fetch;

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    let urlStr = "";

    if (typeof input === "string") {
      urlStr = input;
    } else if (input instanceof URL) {
      urlStr = input.toString();
    } else if (input && typeof input === "object" && "url" in input) {
      urlStr = (input as Request).url;
    }

    if (urlStr.startsWith("/api/")) {
      const backendBase = getBackendBaseUrl();
      if (backendBase) {
        const fullUrl = `${backendBase}${urlStr}`;
        if (typeof input === "string" || input instanceof URL) {
          input = fullUrl;
        } else {
          input = new Request(fullUrl, input as Request);
        }
      }
    }

    return originalFetch.call(this, input, init);
  };

  console.log("[API Config] API Interceptors initialized. Active Backend:", getBackendBaseUrl() || "(same-origin)");
}
