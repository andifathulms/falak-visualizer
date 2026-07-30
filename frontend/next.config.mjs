/** @type {import('next').NextConfig} */

// GitHub Pages can only serve static files, and serves this repo from a
// subpath (/falak-visualizer), so the Pages build sets STATIC_EXPORT=1 to emit
// a plain `out/` directory instead of a .next server build.
//
// Every page under src/app is a client component and reads its query string
// via lib/permalink.ts rather than useSearchParams, so the exported build is
// behaviourally identical to `next start`. The flag exists only because Next
// 14 refuses to `next start` an exported build, which would break the
// docker-compose `frontend` service.
const isStaticExport = process.env.STATIC_EXPORT === "1";

// Must be a build-time constant: it is baked into every emitted asset URL.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig = {
  basePath,
  ...(isStaticExport
    ? {
        output: "export",
        // next/image's optimizer needs a server; nothing here relies on it.
        images: { unoptimized: true },
        // Emit `converter/index.html` rather than `converter.html` so the
        // static host resolves nested routes without per-path rewrite rules.
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
