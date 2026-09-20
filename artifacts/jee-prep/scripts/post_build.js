import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");
const publicDir = path.join(rootDir, "public");
const distData = path.join(distDir, "data");

console.log("[post_build] Preparing clean static distribution for stude.is-best.net & omnetwork.in...");

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 1. Copy all static public assets (icons, manifest, .htaccess, logger.php, etc.) into dist/
if (fs.existsSync(publicDir)) {
  console.log("[post_build] Copying public assets to dist/...");
  fs.cpSync(publicDir, distDir, { recursive: true });
}

// 2. Write universal .htaccess in dist/
const htaccessContent = `# ==============================================================================
# StudE & OM Network Universal Apache / cPanel / InfinityFree Configuration
# Works seamlessly on stude.is-best.net (root) and omnetwork.in (root or /v4/)
# ==============================================================================

<IfModule mod_rewrite.c>
  RewriteEngine On
  
  # Allow direct access to existing files and directories
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # Route all other web requests to index.html (SPA Fallback)
  RewriteRule ^ index.html [QSA,L]
</IfModule>

# Enable Cross-Origin Resource Sharing (CORS) for all assets
<IfModule mod_headers.c>
  Header always set Access-Control-Allow-Origin "*"
  Header always set Access-Control-Allow-Methods "GET, POST, OPTIONS, HEAD"
  Header always set Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization"
</IfModule>

# Ensure proper MIME types for modern web assets
<IfModule mod_mime.c>
  AddType application/javascript .js .mjs
  AddType application/json .json
  AddType image/svg+xml .svg .svgz
  AddType application/wasm .wasm
  AddType audio/mpeg .mp3
  AddType audio/ogg .ogg
  AddType font/woff .woff
  AddType font/woff2 .woff2
</IfModule>

# Enable Gzip Compression for fast delivery
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json image/svg+xml
</IfModule>
`;
fs.writeFileSync(path.join(distDir, ".htaccess"), htaccessContent, "utf8");

// 3. Ensure dist/data does NOT exist (keep build lightweight for InfinityFree cPanel upload)
if (fs.existsSync(distData)) {
  console.log("[post_build] Removing dist/data to preserve lightweight static build...");
  fs.rmSync(distData, { recursive: true, force: true });
}

// 4. Write serve.json for SPA routing in dist/
const serveConf = JSON.stringify({
  rewrites: [
    { source: "**", destination: "/index.html" }
  ]
}, null, 2);
fs.writeFileSync(path.join(distDir, "serve.json"), serveConf);

// 5. Ensure root /workspaces/JeeAppv9/dist symlink is intact
const rootWorkspaceDist = "/workspaces/JeeAppv9/dist";
try {
  if (!fs.existsSync(rootWorkspaceDist)) {
    fs.symlinkSync(distDir, rootWorkspaceDist);
  }
} catch (e) {}

console.log("[post_build] Build complete! Clean SPA distribution ready for stude.is-best.net and omnetwork.in.");
