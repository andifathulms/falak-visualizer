# Falak — frontend

Next.js 14 App Router frontend for Falak, a Hijri calendar and Islamic
astronomy visualizer. Builds as a static export and deploys to GitHub
Pages — there is no Node server in production; every calculation this
app shows runs client-side, in the browser, against the astronomy engine
under `src/lib/falak/`.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Static export

The production build is a static export (`STATIC_EXPORT=1`), matching
how it's actually served:

```bash
STATIC_EXPORT=1 npm run build
```

This writes a fully static `out/` directory — no API routes, no
server-side rendering at request time. `STATIC_EXPORT=1` is required
because `next.config.mjs` only sets `output: "export"` when that
variable is present, so a plain `npm run build` builds a normal
(non-static) Next.js app instead.

## Testing

```bash
npm run lint
npx tsc --noEmit
npx vitest run
```

`vitest` covers the astronomy geometry modules under `src/lib/` against
fixture data in `src/lib/falak/__fixtures__/golden-vectors.json` — see
the root `PRD.md` and `CLAUDE.md` for why that validation exists and
what it's not allowed to skip.

## Deployment

Deployed to GitHub Pages from the static `out/` output. There is no
Vercel deployment target for this project.
