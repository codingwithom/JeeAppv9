/**
 * API Configuration & Fetch Interceptor
 * Ensures all API calls work seamlessly across stude.is-best.net, omnetwork.in, and local environments.
 */

export function getBackendBaseUrl(): string {
  if (typeof window === "undefined") return "";

  // 1. Check custom user override in localStorage (and auto-migrate old api-server worker domain)
  let savedOverride = localStorage.getItem("jee_backend_api") || localStorage.getItem("api_server_url");
  if (savedOverride) {
    if (savedOverride.includes("api-server.stude.workers.dev") || savedOverride.includes("api.stude.workers.dev")) {
      savedOverride = savedOverride.replace("api-server.stude.workers.dev", "apis.stude.workers.dev")
                                   .replace("api.stude.workers.dev", "apis.stude.workers.dev");
      try {
        localStorage.setItem("jee_backend_api", savedOverride);
        localStorage.setItem("api_server_url", savedOverride);
      } catch {}
    }
    const hostname = window.location.hostname.toLowerCase();
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname.includes("github.dev");
    if (!isLocal && (savedOverride.includes("localhost") || savedOverride.includes("127.0.0.1") || savedOverride.includes("github.dev"))) {
      savedOverride = "https://apis.stude.workers.dev";
      try {
        localStorage.setItem("jee_backend_api", savedOverride);
        localStorage.setItem("api_server_url", savedOverride);
      } catch {}
    }
    return savedOverride.trim().replace(/\/$/, "");
  }

  // 2. Check environment variable if provided during build
  if (import.meta.env.VITE_API_URL) {
    return (import.meta.env.VITE_API_URL as string).replace(/\/$/, "");
  }

  // 3. In production builds (dist preview via npx serve or hosted on domain), route to Cloudflare Worker
  if (import.meta.env.PROD) {
    return "https://apis.stude.workers.dev";
  }

  // 4. In local dev mode (npm run dev), check hostname
  const hostname = window.location.hostname.toLowerCase();
  const isLocalDev =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".local") ||
    hostname.includes("replit.dev") ||
    hostname.includes("github.dev");

  if (!isLocalDev) {
    return "https://apis.stude.workers.dev";
  }

  // 5. Default dev mode: relative same-origin (Vite dev proxy to localhost:8080)
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

    const isApiCall =
      urlStr.startsWith("/api/") ||
      urlStr.startsWith("./api/") ||
      urlStr.startsWith("api/") ||
      (urlStr.includes("/api/") && (urlStr.startsWith(window.location.origin) || !urlStr.startsWith("http")));

    if (isApiCall) {
      const backendBase = getBackendBaseUrl();
      if (backendBase) {
        let pathPart = urlStr;
        if (urlStr.startsWith("http")) {
          try {
            const u = new URL(urlStr);
            pathPart = u.pathname + u.search;
          } catch {}
        }
        if (!pathPart.startsWith("/")) {
          pathPart = `/${pathPart.replace(/^\.?\//, "")}`;
        }
        // Normalize /v4/api/ to /api/ if needed
        if (pathPart.startsWith("/v4/api/")) {
          pathPart = pathPart.replace("/v4/api/", "/api/");
        }
        const fullUrl = `${backendBase}${pathPart}`;
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
