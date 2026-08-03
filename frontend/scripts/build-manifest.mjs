/**
 * Generate public/manifest.webmanifest.
 *
 * Runs automatically before every build (npm's `prebuild` hook), and the result
 * is committed so `next dev` has it too.
 *
 * Why this is a script and not app/manifest.ts
 * --------------------------------------------
 * Next's `app/manifest.ts` route produces correct JSON, but the `<link
 * rel="manifest">` it injects is emitted *without* the configured basePath, and
 * it overrides any `metadata.manifest` you set to correct it. On a project Pages
 * site served from /falak-visualizer/, that href resolves to the origin root and
 * 404s — so Chrome never reads the manifest and never offers to install the app.
 * Nothing warns you; the install prompt is simply absent.
 *
 * Writing the file into public/ and declaring `metadata.manifest` in the layout
 * sidesteps that: the link then carries the basePath, verified in the build.
 *
 * What the manifest is for
 * ------------------------
 * Android/Chrome will not offer "Install app" without one. iOS never needed it —
 * `app/apple-icon.png` alone covers "Add to Home Screen" there.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUTPUT = resolve(HERE, "../public/manifest.webmanifest");

// Must match the layout's `metadata.manifest` and next.config's basePath. Empty
// for local dev, "/falak-visualizer" for the Pages build.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const icon = (name, size, purpose) => ({
  src: `${BASE_PATH}/icons/${name}`,
  sizes: `${size}x${size}`,
  type: "image/png",
  purpose,
});

const manifest = {
  name: "Falak — Hijri Calendar & Islamic Astronomy",
  short_name: "Falak",
  description:
    "Hijri calendar conversion, hilal visibility, prayer times and qibla direction, computed from astronomical first principles — with the numbers behind every verdict.",
  start_url: `${BASE_PATH}/`,
  scope: `${BASE_PATH}/`,
  display: "standalone",
  // The app's identity is the night sky, so the splash screen and task-switcher
  // chrome stay dark in both colour schemes rather than flashing white.
  background_color: "#05070d",
  theme_color: "#0a0e1a",
  categories: ["utilities", "education", "lifestyle"],
  icons: [
    // "any" keeps the rounded-square artwork intact wherever the platform draws
    // the icon unmodified.
    icon("falak-192.png", 192, "any"),
    icon("falak-512.png", 512, "any"),
    // "maskable" is a separate, full-bleed rendering. Android crops icons to its
    // own launcher shape, and the primary artwork is a rounded square on
    // transparency — cropped to a circle it would show clipped corners. See
    // scripts/build-maskable-icons.mjs.
    icon("falak-maskable-192.png", 192, "maskable"),
    icon("falak-maskable-512.png", 512, "maskable"),
  ],
};

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`wrote public/manifest.webmanifest (basePath: ${BASE_PATH || "<none>"})`);
