// Serve carousel-core's fonts, plus Falak's own faces for the falak-malam card
// variant, from public/carousel-core/fonts/ - so they load from
// <basePath>/carousel-core/fonts/ on GitHub Pages (carousel-core PORTING §4.3).
// Regenerated on every dev/build; the folder is gitignored.
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = dirname(createRequire(import.meta.url).resolve("carousel-core/package.json"));
const out = join(root, "public/carousel-core/fonts");

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(pkg, "fonts"), out, { recursive: true });

// The same files next/font/local serves to the app (src/app/layout.tsx).
const FALAK_FONTS = [
  "PlusJakartaSans-Variable.woff2",
  "Newsreader-Variable.woff2",
  "IBMPlexMono-Regular.woff2",
  "IBMPlexMono-SemiBold.woff2",
];
for (const file of FALAK_FONTS) cpSync(join(root, "src/app/fonts", file), join(out, file));

console.log(`carousel-core fonts -> ${out}`);
