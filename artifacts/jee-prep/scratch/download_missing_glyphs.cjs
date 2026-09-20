const https = require("https");
const fs = require("fs");

function get(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve(data));
    });
  });
}

async function run() {
  const base = "https://cdn.jsdelivr.net/npm/mathjax-full@3.2.2/js/output/svg/fonts/tex";
  const files = [
    "tex-size4.js",
    "tex-size3.js",
    "largeop.js",
    "normal.js",
    "bold.js",
    "italic.js",
    "bold-italic.js",
    "double-struck.js",
    "delimiters.js"
  ];

  const prefixMap = {
    "tex-size4.js": "S4-",
    "tex-size3.js": "S3-",
    "largeop.js": "LO-",
    "normal.js": "N-",
    "bold.js": "B-",
    "italic.js": "I-",
    "bold-italic.js": "BI-",
    "double-struck.js": "N-",
    "delimiters.js": "D-"
  };

  const existingDefs = fs.readFileSync("artifacts/jee-prep/src/data/pyq/mathjax-defs.html", "utf8");
  const newPaths = [];

  for (const f of files) {
    const code = await get(`${base}/${f}`);
    const prefix = prefixMap[f];

    // Find all 0x...: '...'
    const matches = code.matchAll(/0x([0-9A-Fa-f]+):\s*'([^']+)'/g);
    for (const m of matches) {
      const hex = m[1].toUpperCase();
      const rawPath = m[2];
      const id = `MJX-TEX-${prefix}${hex}`;

      // Convert rawPath to proper SVG path d
      let d = rawPath.trim();
      if (!d.startsWith("M") && !d.startsWith("m")) {
        d = "M" + d;
      }
      if (!d.endsWith("Z") && !d.endsWith("z")) {
        d = d + "Z";
      }

      if (!existingDefs.includes(`id="${id}"`)) {
        newPaths.push(`<path id="${id}" d="${d}"></path>`);
      }
    }
  }

  console.log(`Generated ${newPaths.length} missing glyph paths!`);
  
  // Also check if BI-1D468 or BI-1D736 were not in bold-italic.js:
  // Note that in MathJax, bold-italic letters use bold.js or italic.js paths with styling if missing,
  // or let's check italic.js for 1D434 (Italic A) and 1D6FC (Italic Alpha) to create BI-1D468 and BI-1D736:
  const italicCode = await get(`${base}/italic.js`);
  const italicMatches = italicCode.matchAll(/0x([0-9A-Fa-f]+):\s*'([^']+)'/g);
  const italicMap = {};
  for (const m of italicMatches) {
    italicMap[m[1].toUpperCase()] = m[2];
  }

  // A: 1D434 -> BI-1D468
  if (italicMap["1D434"]) {
    newPaths.push(`<path id="MJX-TEX-BI-1D468" d="M${italicMap["1D434"]}Z"></path>`);
  }
  // B: 1D435 -> BI-1D469
  if (italicMap["1D435"]) {
    newPaths.push(`<path id="MJX-TEX-BI-1D469" d="M${italicMap["1D435"]}Z"></path>`);
  }
  // C: 1D436 -> BI-1D470
  if (italicMap["1D436"]) {
    newPaths.push(`<path id="MJX-TEX-BI-1D470" d="M${italicMap["1D436"]}Z"></path>`);
  }
  // Alpha: 1D6FC -> BI-1D736
  if (italicMap["1D6FC"]) {
    newPaths.push(`<path id="MJX-TEX-BI-1D736" d="M${italicMap["1D6FC"]}Z"></path>`);
  }

  // Append new paths right before </defs>
  const updatedDefs = existingDefs.replace("</defs>", newPaths.join("") + "</defs>");
  fs.writeFileSync("artifacts/jee-prep/src/data/pyq/mathjax-defs.html", updatedDefs, "utf8");
  console.log("Successfully updated artifacts/jee-prep/src/data/pyq/mathjax-defs.html!");
}

run();
