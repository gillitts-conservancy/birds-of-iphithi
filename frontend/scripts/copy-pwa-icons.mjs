// NOTE:
// Expo Router web builds do not reliably place PWA assets at the web root.
// Chrome requires install icons at absolute URLs (/logo192.png, /logo512.png).
// This script copies required PWA files into dist/ after build.
// Do not remove unless Expo web output behaviour changes.
import fs from "fs";
import path from "path";

const root = process.cwd();
const fromDir = path.join(root, "public");
const toDir = path.join(root, "dist");

// Adjust these if you want different colours:
const THEME_GREEN = "#018440"; // splash/system UI tint
const APP_DARK_BG = "#1a1a1a"; // your app background

const files = ["manifest.json", "logo192.png", "logo512.png"];

function copyFileOrFail(filename) {
  const src = path.join(fromDir, filename);
  const dst = path.join(toDir, filename);

  if (!fs.existsSync(src)) {
    console.error(`Missing source file: ${src}`);
    process.exit(1);
  }
  fs.copyFileSync(src, dst);
  console.log(`Copied ${filename} -> dist/`);
}

function patchManifest() {
  const manifestPath = path.join(toDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) return;

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

    // Force colours (prevents "I swear I changed it" caching confusion)
    manifest.theme_color = THEME_GREEN;
    manifest.background_color = THEME_GREEN;

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
    console.log("Patched dist/manifest.json theme_color/background_color");
  } catch (e) {
    console.error("Failed to parse/patch dist/manifest.json", e);
    process.exit(1);
  }
}

function patchIndexHtml() {
  const indexPath = path.join(toDir, "index.html");
  if (!fs.existsSync(indexPath)) {
    console.error(`Missing dist/index.html at ${indexPath}`);
    process.exit(1);
  }

  let html = fs.readFileSync(indexPath, "utf8");

  // Ensure theme-color meta exists and is correct
  const themeMeta = `<meta name="theme-color" content="${THEME_GREEN}">`;
  if (html.includes('name="theme-color"')) {
    html = html.replace(/<meta\s+name="theme-color"\s+content="[^"]*"\s*\/?>/i, themeMeta);
  } else {
    html = html.replace(/<\/head>/i, `  ${themeMeta}\n</head>`);
  }

  // Force the actual page background + height (this fixes the “white below list”)
  const styleBlock = `
  <style>
    html, body, #root {
      height: 100%;
      background: ${APP_DARK_BG};
    }
    body { margin: 0; }
  </style>`.trim();

  if (!html.includes("html, body, #root")) {
    html = html.replace(/<\/head>/i, `  ${styleBlock}\n</head>`);
  }

  fs.writeFileSync(indexPath, html, "utf8");
  console.log("Patched dist/index.html background + theme-color");
}

// 1) Copy required PWA assets into dist root
for (const f of files) copyFileOrFail(f);

// 2) Force manifest colours
patchManifest();

// 3) Force dist/index.html background + theme colour
patchIndexHtml();

