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

const files = ["logo192.png", "logo512.png", "manifest.json"];

for (const f of files) {
  const src = path.join(fromDir, f);
  const dst = path.join(toDir, f);

  if (!fs.existsSync(src)) {
    console.error(`Missing source file: ${src}`);
    process.exit(1);
  }
  fs.copyFileSync(src, dst);
  console.log(`Copied ${f} -> dist/`);
}
