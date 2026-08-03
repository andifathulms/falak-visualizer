/**
 * Render the full-bleed "maskable" app icons from the brand SVG.
 *
 * Run once, commit the output:
 *
 *     npm i --no-save playwright && npx playwright install chromium
 *     node scripts/build-maskable-icons.mjs
 *
 * Playwright is deliberately NOT a project dependency. It pulls ~95MB of browser
 * for a job that runs when the logo changes - roughly never - so it is installed
 * on demand and the generated PNGs are committed, the same way the coastline
 * GeoJSON is.
 *
 * Why a separate icon at all
 * --------------------------
 * Android does not draw an app icon as given; it crops it to whatever shape the
 * launcher uses (circle, squircle, teardrop). An icon declared `purpose:
 * "maskable"` is expected to be edge-to-edge artwork with its subject inside the
 * central 80% "safe zone", so any crop still looks deliberate.
 *
 * The primary mark is a rounded square on a transparent background. Handed to a
 * circular crop it would show clipped, transparent corners. So this takes the
 * same SVG and squares off the background rect - the crescent already sits at
 * ~11.5% inset, comfortably inside the safe zone - producing artwork that fills
 * the frame and survives any mask.
 *
 * The rounded original is still shipped as `purpose: "any"` for the platforms
 * that draw icons unmodified.
 */
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

// A vendored copy of exports/falak-logo/falak-icon-primary.svg. That directory
// is gitignored as local design-tool output, and a committed script cannot
// depend on an uncommitted file - so the one source this build needs lives in
// the repo. Re-copy it if the logo is redrawn.
const SOURCE_SVG = resolve(HERE, "../public/icons/falak-icon.svg");
const OUTPUT_DIR = resolve(HERE, "../public/icons");
const SIZES = [192, 512];

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error(
    "playwright is not installed. It is an on-demand tool, not a dependency:\n" +
      "  npm i --no-save playwright && npx playwright install chromium",
  );
  process.exit(1);
}

const source = readFileSync(SOURCE_SVG, "utf8");

// Square off the background rect. Asserted rather than assumed: a silent no-op
// here would emit rounded "maskable" icons that look broken only on a phone.
const fullBleed = source.replace(/rx="\d+(\.\d+)?"/, 'rx="0"');
if (fullBleed === source) {
  throw new Error(`no rounded-rect corner radius found in ${SOURCE_SVG}; has the logo changed?`);
}

mkdirSync(OUTPUT_DIR, { recursive: true });

const browser = await chromium.launch();
for (const size of SIZES) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<style>*{margin:0;padding:0}svg{display:block;width:${size}px;height:${size}px}</style>${fullBleed}`,
  );
  const out = resolve(OUTPUT_DIR, `falak-maskable-${size}.png`);
  await page.locator("svg").screenshot({ path: out });
  await page.close();
  console.log(`wrote public/icons/falak-maskable-${size}.png`);
}
await browser.close();
