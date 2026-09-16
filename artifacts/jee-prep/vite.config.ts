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
          (global as any).gc(
            
          );
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
    // Use relative path for universal static site hosting in final build
    base: "./",

    plugins: [
      react(),
      tailwindcss(),
      {
        name: "serve-local-data",
        configureServer(server) {
          server.middlewares.use("/data", async (req: any, res: any, next: any) => {
            try {
              const fs = await import("fs");
              const cleanSub = decodeURIComponent((req.url || "").replace(/^\//, "").split("?")[0]);
              const filePath = path.join(path.resolve(import.meta.dirname, "data"), cleanSub);
              if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                res.setHeader("Content-Type", filePath.endsWith(".json") ? "application/json" : "text/plain");
                res.setHeader("Access-Control-Allow-Origin", "*");
                fs.createReadStream(filePath).pipe(res);
                return;
              }
            } catch (e) {}
            next();
          });
        }
      },
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
      copyPublicDir: false,
      minify: false,
      reportCompressedSize: false,
      sourcemap: false,
      chunkSizeWarningLimit: 2000,
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
        },
      },
    },
  };
});