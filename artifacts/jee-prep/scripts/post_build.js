import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");
const distData = path.join(distDir, "data");

console.log("[post_build] Preparing clean static distribution...");

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Ensure dist/data does NOT exist (keep build lightweight for InfinityFree cPanel)
if (fs.existsSync(distData)) {
  console.log("[post_build] Removing dist/data to preserve lightweight static build...");
  fs.rmSync(distData, { recursive: true, force: true });
}

// 1. Write serve.json for SPA routing in dist/
const serveConf = JSON.stringify({
  rewrites: [
    { source: "**", destination: "/index.html" }
  ]
}, null, 2);
fs.writeFileSync(path.join(distDir, "serve.json"), serveConf);

// 2. Ensure root /workspaces/JeeAppv9/dist symlink is intact
const rootWorkspaceDist = "/workspaces/JeeAppv9/dist";
try {
  if (!fs.existsSync(rootWorkspaceDist)) {
    fs.symlinkSync(distDir, rootWorkspaceDist);
  }
} catch (e) {}

console.log("[post_build] Build complete! Clean SPA distribution ready without heavy data folder.");
