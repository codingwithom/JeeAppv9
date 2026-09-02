import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const rootDir = process.cwd();
const publicData = path.join(rootDir, "public/data");
const distDir = path.join(rootDir, "dist");
const distData = path.join(distDir, "data");

console.log("[post_build] Syncing data folder to dist...");

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 1. Copy public/data to dist/data if not already present
if (fs.existsSync(publicData)) {
  console.log("[post_build] Copying public/data to dist/data...");
  try {
    execSync("cp -a public/data dist/", { stdio: "inherit" });
  } catch (e) {
    console.error("[post_build] Error copying public/data:", e.message);
  }
}

// 2. Ensure both /data/... and /data/pyq/... access patterns work seamlessly
if (fs.existsSync(distData)) {
  const pyqDir = path.join(distData, "pyq");
  if (fs.existsSync(pyqDir)) {
    // Also link or copy subfolders directly under dist/data if user pastes pyq directly
    const items = ["papers", "questions", "catalogs", "chapters", "search_index.json"];
    for (const item of items) {
      const src = path.join(pyqDir, item);
      const dest = path.join(distData, item);
      if (fs.existsSync(src) && !fs.existsSync(dest)) {
        try {
          fs.symlinkSync(path.relative(distData, src), dest);
        } catch(e) {}
      }
    }
  }
}

// 3. Write serve.json for SPA routing in dist/
const serveConf = JSON.stringify({
  rewrites: [
    { source: "**", destination: "/index.html" }
  ]
}, null, 2);
fs.writeFileSync(path.join(distDir, "serve.json"), serveConf);

// 4. Ensure root /workspaces/JeeAppv9/dist symlink is intact
const rootWorkspaceDist = "/workspaces/JeeAppv9/dist";
try {
  if (!fs.existsSync(rootWorkspaceDist)) {
    fs.symlinkSync(distDir, rootWorkspaceDist);
  }
} catch (e) {}

console.log("[post_build] Build complete! Static data and SPA routing are ready.");
