import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");
const distRepoDir = path.resolve(rootDir, "..", "dist-repo");
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const REPO_URL = GITHUB_TOKEN ? `https://${GITHUB_TOKEN}@github.com/codingwithom/dist.git` : "https://github.com/codingwithom/dist.git";

console.log("[push_dist] Syncing static distribution to GitHub repo: codingwithom/dist...");

if (!fs.existsSync(distDir)) {
  console.error("[push_dist] Error: dist directory does not exist! Please run 'npm run build' first.");
  process.exit(1);
}

// 1. Ensure dist-repo exists
if (!fs.existsSync(distRepoDir)) {
  console.log(`[push_dist] Cloning dist repo to ${distRepoDir}...`);
  execSync(`git clone ${REPO_URL} "${distRepoDir}"`, { stdio: "inherit" });
} else {
  try {
    execSync(`git -C "${distRepoDir}" pull origin main`, { stdio: "ignore" });
  } catch {}
}

// 2. Sync all files from dist into dist-repo (preserving .git)
console.log("[push_dist] Copying files into dist-repo...");
const entries = fs.readdirSync(distDir);
for (const entry of entries) {
  const src = path.join(distDir, entry);
  const dest = path.join(distRepoDir, entry);
  fs.cpSync(src, dest, { recursive: true, force: true });
}

// 3. Commit and push
try {
  execSync(`git -C "${distRepoDir}" add -A`, { stdio: "inherit" });
  const status = execSync(`git -C "${distRepoDir}" status -s`).toString().trim();
  if (!status) {
    console.log("[push_dist] No new changes to commit in dist.");
  } else {
    const timestamp = new Date().toISOString();
    execSync(`git -C "${distRepoDir}" commit -m "build: update static assets [${timestamp}]"`, { stdio: "inherit" });
    execSync(`git -C "${distRepoDir}" push origin main`, { stdio: "inherit" });
    console.log("[push_dist] Successfully pushed all assets to https://github.com/codingwithom/dist!");
  }
} catch (err) {
  console.error("[push_dist] Git push failed:", err.message);
  process.exit(1);
}

console.log(`
=============================================================================
  DISTRIBUTION SYNC COMPLETE!
  GitHub Repo: https://github.com/codingwithom/dist
  CDN Endpoint: https://cdn.jsdelivr.net/gh/codingwithom/dist@main/
  
  Tip: If built with 'npm run deploy:dist', you only need to upload the 
       small 'index.html' file to your web host (omnetwork.in/v4)!
       All other 45-80 assets will be loaded automatically from the CDN.
=============================================================================
`);
