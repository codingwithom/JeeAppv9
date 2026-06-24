import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const port = Number(process.env.PORT) || 3000;

const gcPlugin = () => {
  let count = 0;
  return {
    name: "gc-plugin",
    transform() {
      count++;
      if (count % 40 === 0) {
        if (typeof global !== "undefined" && (global as any).gc) {
          (global as any).gc();
        }
      }
    },
    buildEnd() {
      if (typeof global !== "undefined" && (global as any).gc) {
        (global as any).gc();
      }
    },
    generateBundle() {
      if (typeof global !== "undefined" && (global as any).gc) {
        (global as any).gc();
      }
    },
    writeBundle() {
      if (typeof global !== "undefined" && (global as any).gc) {
        (global as any).gc();
      }
    }
  };
};

export default defineConfig(async () => {
  // Conditionally load Replit plugins asynchronously
  const extraPlugins = [];
  if (process.env.NODE_ENV !== "production") {
    extraPlugins.push(runtimeErrorOverlay());
    if (process.env.REPL_ID !== undefined) {
      const { cartographer } = await import("@replit/vite-plugin-cartographer");
      const { devBanner } = await import("@replit/vite-plugin-dev-banner");
      
      extraPlugins.push(
        cartographer({ root: path.resolve(import.meta.dirname, "..") }),
        devBanner()
      );
    }
  }

  return {
    // Use absolute root path for web routing inside Codespaces
  base: process.env.NODE_ENV === "production" ? "/v4/" : "/",

    plugins: [
      react(),
      tailwindcss(),
      gcPlugin(),
      ...extraPlugins,
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
        "@assets": path.resolve(import.meta.dirname, "../../attached_assets"),
      },
      dedupe: ["react", "react-dom"],
    },
    
    // CRITICAL FIX: Tells Vite that index.html is located one level up in the workspace root
    root: path.resolve(import.meta.dirname),
    
    build: {
      outDir: "dist",
      emptyOutDir: true,
      reportCompressedSize: false,
      sourcemap: false,
      rollupOptions: {
        maxParallelFileOps: 1,
        cache: false
      }
    },
    server: {
      port,
      strictPort: false,
      host: "0.0.0.0",
      allowedHosts: true,
      fs: {
        // Allow Vite to serve layout components outside this sub-workspace folder
        strict: false,
      },
      proxy: {
        "/api": {
          target: "http://localhost:8080",
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on("error", (err, _req, res) => {
              // Suppress connection refused logs from cluttering the terminal, return 502 instead
              if ("writeHead" in res) {
                res.writeHead(502, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Backend server unreachable", details: err.message }));
              }
            });
          },
        },
      },
    },
  };
});