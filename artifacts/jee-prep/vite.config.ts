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
  base: process.env.NODE_ENV === "production" ? "/" : "/",

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
        cache: false,
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (id.includes("firebase")) {
                return "vendor-firebase";
              }
              if (id.includes("katex") || id.includes("rehype-katex") || id.includes("remark-math")) {
                return "vendor-math";
              }
              if (id.includes("recharts") || id.includes("d3")) {
                return "vendor-charts";
              }
              if (id.includes("lucide-react") || id.includes("react-icons")) {
                return "vendor-icons";
              }
              if (id.includes("pdfjs-dist")) {
                return "vendor-pdf";
              }
              return "vendor-core";
            }
          }
        }
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