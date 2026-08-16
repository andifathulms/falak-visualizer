# Falak Visualizer — Design Audit

Scope: `frontend/` (Next.js app). Backend (`backend/`) exists but is not in the
deployed request path (see §2). All facts below are drawn from the code as
committed; no recommendations.

## 1. What this app is

Per `PRD.md` and `CLAUDE.md`: Falak is a deterministic, astronomically-grounded
web tool for Hijri calendar conversion, hilal (new-crescent-moon) visibility
analysis, prayer-time calculation, and qibla direction, built for Indonesian
Muslims (primary), da'wah/education users (secondary), and developers wanting
an auditable hisab implementation (tertiary). Every output is meant to be
traceable to a formula rather than a lookup table or black-box model, and the
app is explicitly framed as calculation-only, not a substitute for Kemenag's
official sidang isbat announcement.

The core object the app manipulates is a **lat/lon grid of computed hilal-visibility
results over Indonesia** (a ~0.5°-step grid, ~3,255 points for one date/method).
It is rendered by `frontend/src/app/visibility-map/page.tsx` as a hand-built SVG
choropleth (D3 used only for scales/`geoTransform`/`geoPath`, not for DOM
manipulation — the SVG is emitted by React). Secondary "core objects" per route:
a derivation trace (ordered list of month-start search steps) on `/converter`,
a per-evening observation record (altitude/elongation/moon-age/illumination/lag)
on `/hilal-visibility`, and a 12-month table on `/hijri-archive` and
`/visibility-calendar`.

## 2. Stack & constraints

- **Framework:** Next.js 14.2.35 (App Router), React 18.
- **Build/deploy target:** conditional static export. `next.config.mjs` sets
  `output: "export"` when `STATIC_EXPORT=1` is set (`images: {unoptimized:true}`,
  `trailingSlash: true`); `basePath` is baked in at build time from
  `NEXT_PUBLIC_BASE_PATH`. Per repo-root `DEPLOY.md`, the deployed target is
  GitHub Pages (`https://andifathulms.github.io/falak-visualizer/`), via a
  GitHub Actions workflow (`.github/workflows/deploy-frontend.yml`) triggered
  on pushes to `main` touching `frontend/` or `backend/`. Without
  `STATIC_EXPORT`, it runs as an ordinary Next.js server (used in
  `docker-compose`/local dev alongside the Django backend).
- **No backend in the deployed request path.** `frontend/src/lib/api.ts`
  exposes the same function names/shapes a REST client would (`convertDate`,
  `fetchHilalVisibility`, `fetchPrayerTimes`, `fetchQibla`,
  `fetchVisibilityGrid`, etc.) but contains no `fetch()` calls — every function
  runs a TypeScript port of the astronomy engine (`frontend/src/lib/falak/*`)
  synchronously in-browser and returns snake_case, REST-shaped objects,
  throwing `ApiError` (with `.status`) for validation failures. A Django 5 +
  DRF + Celery + Postgres backend (`backend/`) still exists in the repo and can
  optionally be deployed to Fly.io to expose an OpenAPI-documented HTTP API for
  third parties (`NEXT_PUBLIC_API_BASE_URL` re-enables an "API Docs" nav link),
  but is not required for the site to function.
- **Routing:** Next.js App Router, one directory per route under
  `frontend/src/app/`: `/`, `/converter`, `/hilal-visibility`, `/hijri-archive`,
  `/isbat-accuracy`, `/method-divergence` (client-side redirect to
  `/hijri-archive`, kept because a static host can't 302), `/prayer-times`,
  `/qibla`, `/visibility-calendar`, `/visibility-map`. Every route's
  `page.tsx` is a client component (`"use client"`); every route (except
  `/method-divergence`) pairs it with a server-component `layout.tsx` whose
  sole job is exporting `metadata = routeMetadata("<route-key>")`, since the
  client page itself cannot export metadata.
- **Styling approach:** Tailwind CSS 3, configured with `darkMode: "media"`
  (see §3). Design tokens are CSS custom properties in
  `frontend/src/app/globals.css`, wired into `tailwind.config.ts` via
  `theme.extend` (colors, fontSize, spacing, transitionDuration) rather than
  used as raw Tailwind defaults. Verbatim token block:

```ts
// tailwind.config.ts — theme.extend.colors
ink:     { DEFAULT: "var(--text-body)", muted: "var(--text-muted)" }
accent:  { DEFAULT: "var(--accent-text)", solid: "var(--accent-solid)", on: "var(--accent-on-solid)" }
verdict: { positive: "var(--verdict-positive)", negative: "var(--verdict-negative)" }

night:   { 950:"#05070d", 900:"#0a0e1a", 850:"#0e1425", 800:"#131a2e", 700:"#1b2440", 600:"#293353", 500:"#3c4970" }
gold:    { 300:"#f2d68a", 400:"#e8c164", 500:"#d9a83e", 600:"#b9862a" }
moon:    { 400:"#7dd3c8", 500:"#4fb3a6", 600:"#2f8f83", 700:"#1f7a6e" }
land:    { light:"#e8eaf0", "light-context":"#eef0f4", "light-coast":"#cbd2e0", dark:"#1b2440", "dark-context":"#131a2e", "dark-coast":"#293353" }
lattice: { light:"#9aa4b8", dark:"#6b7899" }
```

- **Vis/animation/chart libraries actually imported** (confirmed by real
  imports, not just `package.json`):
  - `d3` (`^7.9.0`) — imported in `visibility-map/page.tsx` only, for
    `scaleLinear`, `geoPath`, `geoTransform`, `mean`. No other page imports
    `d3`.
  - `recharts` (`^3.9.2`) — imported in `components/TrajectoryChart.tsx` only
    (`LineChart`, `ResponsiveContainer`, `CartesianGrid`, `XAxis`, `YAxis`,
    `ReferenceLine`, `Tooltip`, `Legend`, `Line`, `accessibilityLayer`). This
    component is code-split via `next/dynamic({ssr:false})` on
    `/hilal-visibility`.
  - `framer-motion` (`^12.42.2`) — used across most pages/components for
    entrance fades, staggered lists, an SVG needle spring animation, and a
    pulsing glow layer (see §5).
  - `@headlessui/react` (`^2.2.10`) — `Listbox` (Select/LocationPicker),
    `Menu`/`Transition` (NavBar "Analysis" dropdown).
  - `lucide-react` — icon set used throughout.
  - `topojson-client` / `world-atlas` — dev dependencies feeding
    `frontend/scripts/build-indonesia-geo.mjs`, which pre-generates the static
    `frontend/src/lib/geo/indonesia.geo.json` consumed by the visibility map;
    not imported at runtime by the app itself.
- **Constraints observed in code:**
  - Static hosting (GitHub Pages), no backend required at runtime.
  - `public/manifest.webmanifest` present (`display:"standalone"`,
    `background_color:"#05070d"`, `theme_color:"#0a0e1a"`, 192/512 `any` +
    192/512 `maskable` icons, categories `["utilities","education","lifestyle"]`).
    No service worker or offline-caching code exists anywhere in the repo (no
    `sw.js`, no `next-pwa` config) — the manifest alone does not make the app
    offline-capable.
  - No i18n: `<html lang="en">` is hardcoded in the root layout; no locale
    routing or translation files exist.
  - `frontend/README.md` is the unmodified default `create-next-app`
    boilerplate and does not describe the actual static-export/GitHub Pages
    deployment (that is documented only in the repo-root `DEPLOY.md`).
  - The only route offloading work to Web Workers is `/visibility-map`
    (`lib/falak/grid.worker.ts` + `gridRunner.ts`, one shard per CPU core minus
    one, capped at 8), with a chunked main-thread fallback
    (`setTimeout(...,0)`-yielded, chunk size 32) if `Worker` is unavailable.
    Every other route's computation runs synchronously on the main thread
    inside an `async` wrapper, sometimes yielding between iterations
    (`/hijri-archive`, one `setTimeout(...,0)` per month) and sometimes not
    (`/visibility-calendar`, `/prayer-times` monthly).

## 3. Visual system as-built

### Colour tokens (verbatim, `frontend/src/app/globals.css`)

Light mode (`:root`):
```css
--background: #f7f7fb;
--foreground: #12131a;      /* 17.3:1 */
--card: #ffffff;
--card-border: #e5e5ee;

--text-body: #12131a;       /* 17.3:1 */
--text-muted: #5c6373;      /*  5.6:1 */

--accent-text: #8d6420;     /*  4.9:1 */
--accent-solid: #d9a83e;
--accent-on-solid: #05070d; /*  9.2:1 on accent-solid */

--accent-gradient-from: #e8c164;
--accent-gradient-to: #4fb3a6;

--verdict-positive: #1f7a6e; /*  4.8:1 */
--verdict-negative: #c92a2a; /*  5.1:1 */
```

Dark mode (`@media (prefers-color-scheme: dark) { :root { ... } }`):
```css
--background: #05070d;
--foreground: #eceef5;      /* 15.8:1 */
--card: #0e1425;
--card-border: #1b2440;

--text-body: #eceef5;       /* 15.8:1 */
--text-muted: #98a1b5;      /*  7.1:1 */

--accent-text: #e8c164;     /* 10.7:1 */
--accent-solid: #d9a83e;
--accent-on-solid: #05070d;

--verdict-positive: #7dd3c8; /* 10.5:1 */
--verdict-negative: #f87171; /*  6.6:1 */
```

Occurrence counts for every literal hex value found via grep across
`frontend/src` (excluding node_modules):

| Hex | Count | Where |
|---|---|---|
| `#05070d` | 3 | `globals.css` (`--accent-on-solid` light, `--background` dark, `--accent-on-solid` dark) |
| `#f7f7fb` | 1 | `globals.css` `--background` light |
| `#12131a` | 2 | `globals.css` `--foreground`/`--text-body` light |
| `#ffffff` | 1 | `globals.css` `--card` light |
| `#e5e5ee` | 1 | `globals.css` `--card-border` light |
| `#5c6373` | 1 | `globals.css` `--text-muted` light |
| `#8d6420` | 1 | `globals.css` `--accent-text` light |
| `#d9a83e` | 2 | `globals.css` `--accent-solid` (light+dark); also `TrajectoryChart.tsx` elongation line stroke |
| `#e8c164` | 5 | `globals.css` `--accent-gradient-from`/`--accent-text` dark; `qibla/page.tsx` needle gradient; `HilalMoon.tsx` ×2 (visible-face stop, glow fill) |
| `#4fb3a6` | 4 | `globals.css` `--accent-gradient-to`; `qibla/page.tsx` needle gradient; `BrandMark.tsx` star gradient; `TrajectoryChart.tsx` altitude line stroke |
| `#1f7a6e` | 1 | `globals.css` `--verdict-positive` light (same value as `moon-700`) |
| `#c92a2a` | 1 | `globals.css` `--verdict-negative` light |
| `#eceef5` | 2 | `globals.css` `--foreground`/`--text-body` dark |
| `#0e1425` | 1 | `globals.css` `--card` dark |
| `#1b2440` | 1 | `globals.css` `--card-border` dark |
| `#98a1b5` | 1 | `globals.css` `--text-muted` dark |
| `#7dd3c8` | 2 | `globals.css` `--verdict-positive` dark; `BrandMark.tsx` star gradient stop |
| `#f87171` | 1 | `globals.css` `--verdict-negative` dark |
| `#f2d68a` | 1 | `BrandMark.tsx` crescent gradient stop |
| `#b9862a` | 1 | `BrandMark.tsx` crescent gradient stop |
| `#f8e6b8` | 1 | `HilalMoon.tsx` visible-face gradient start |
| `#c7cbd6` | 1 | `HilalMoon.tsx` not-visible face gradient start |
| `#8b93a8` | 1 | `HilalMoon.tsx` not-visible face gradient end |
| `#94a3b8` | 5–6 | `TrajectoryChart.tsx` grid line, axis ticks, axis strokes, reference-line stroke |

Also present: `rgba(217,168,62,0.15)` / `rgba(79,179,166,0.12)` (hero
`night-sky` background gradient, `tailwind.config.ts`); `rgba(217,168,62,0.35)`
(`::selection` background, `globals.css`); several more `rgba(...)` values for
the `.starfield::before/::after` decorative dots (`globals.css` L238–249).

`TrajectoryChart.tsx` is the one component whose colours are not
theme-token-driven: it hardcodes `#94a3b8` for grid/axis lines regardless of
light/dark mode, and its two data-line colours (`#4fb3a6`, `#d9a83e`) are raw
literals duplicating the CSS gradient endpoints rather than reading
`var(--accent-gradient-*)`.

### Typography

One font family loaded: `next/font/local` with `src/app/fonts/GeistVF.woff2`
(variable weight 100–900), CSS var `--font-geist-sans`, mapped to
`fontFamily.display` in `tailwind.config.ts`. A previously-loaded Geist Mono
font was removed (per code comment) as unused dead weight. No `font-mono`
override is defined in the Tailwind config, so any `font-mono` class (used
extensively for numeric/tabular figures — converter results, prayer times,
criteria margins) resolves to Tailwind's default `ui-monospace` system stack.

Type scale (`globals.css`, all on `:root`):
```css
--text-2xs: 0.8125rem;  /* 13px */
--text-xs:  0.875rem;   /* 14px */
--text-sm:  1rem;       /* 16px */
--text-md:  1.125rem;   /* 18px */
--text-lg:  1.375rem;   /* 22px */
--text-xl:  1.75rem;    /* 28px */
--text-2xl: 2.25rem;    /* 36px */
--text-3xl: 3rem;       /* 48px */

--leading-tight:  1.15;
--leading-snug:   1.35;
--leading-normal: 1.6;
```
`tailwind.config.ts` overrides (not extends) Tailwind's `fontSize` scale with
these tokens, so `text-sm` and `text-base` both resolve to 16px/1.6 — the
project's stated body-size floor. `body { font-size: var(--text-sm); line-height: var(--leading-normal); }`;
`h1,h2,h3 { line-height: var(--leading-tight); text-wrap: balance; }`.

### Spacing (verbatim, `globals.css`)
```css
--space-1: 0.25rem;
--space-2: 0.5rem;
--space-3: 0.75rem;
--space-4: 1rem;
--space-5: 1.5rem;
--space-6: 2rem;
--space-7: 2.5rem;
--space-8: 3rem;
--space-9: 4rem;
--space-10: 5rem;
```
Mapped to Tailwind utilities `s1`…`s10` (e.g. `p-s4`) additively — Tailwind's
own default spacing scale remains available alongside these.

### Border-radius / shadow

No custom `borderRadius` key exists in `tailwind.config.ts`; only Tailwind's
stock radius classes are used: `rounded-full`, `rounded-lg`, `rounded-sm`,
`rounded-xl`, `rounded-2xl`, `rounded-3xl`. `rounded-3xl` appears only on the
home-page hero section; `rounded-2xl` is `Card`'s default; `rounded-xl` is the
most common (buttons, inputs, most card/section wrappers); `rounded-full` for
pills/badges/dots.

No raw `box-shadow` CSS declarations exist in `globals.css` — all shadows are
Tailwind utility classes: `shadow-sm`, `shadow-md`, `shadow-lg`, plus opacity
variants `shadow-black/5`, `shadow-black/10`, `shadow-black/30`,
`shadow-black/40`, `shadow-gold-500/5`, `shadow-gold-500/20`,
`shadow-gold-500/30`. `Card` defaults to `shadow-sm shadow-black/5
dark:shadow-black/30`; the primary `Button` uses `shadow-md shadow-gold-500/20`
→ `hover:shadow-lg hover:shadow-gold-500/30`; dropdown/menu panels (`NavBar`,
`Select`, `LocationPicker`) use `shadow-lg shadow-black/10 dark:shadow-black/40`.

### Centralisation

Colour, type-scale, spacing, and motion-duration tokens are centralised as CSS
custom properties in `frontend/src/app/globals.css` and re-exposed through
`tailwind.config.ts`'s `theme.extend`. The one documented exception is
`TrajectoryChart.tsx` (Recharts), whose stroke colours are hardcoded literals
rather than references to the shared tokens (noted above).

### Dark mode

`tailwind.config.ts`: `darkMode: "media"` — OS-preference-only. There is no
class-based toggle and no in-app switcher: `grep -ri 'theme'` across
`frontend/src` returns zero matches in any `.tsx`/`.ts` file (no
`ThemeToggle`, no `useTheme`, no `next-themes`). Dark styling is applied via
Tailwind's `dark:` variant (compiling to `@media (prefers-color-scheme: dark)`
under `darkMode:"media"`) plus the `@media (prefers-color-scheme: dark)` block
in `globals.css` for the custom properties — coverage is full across the
token system, with the one exception (`TrajectoryChart.tsx` hardcoded colours,
above). `manifest.webmanifest`'s `background_color`/`theme_color` are fixed
dark values (`#05070d`/`#0a0e1a`) regardless of OS preference.

## 4. Screen & component inventory

All routes share the identical `layout.tsx` pattern (server component
exporting `metadata = routeMetadata("<route-key>")`, rendering only
`children`) except `/method-divergence`, whose layout hand-sets
`robots:{index:false, follow:true}` and a canonical pointing at
`/hijri-archive`. Every `page.tsx` is `"use client"`.

**`/` — home** (`app/page.tsx`): hero (`BrandMark` eyebrow pill, `h1` with
gradient span, lead paragraph, two CTA links, a 3-item fact list, `SampleResult`
in the right column on lg+); a 5-card grid linking to Converter, Hilal
Visibility, Visibility Map, Prayer Times, Qibla; `HisabDisclaimer
variant="compact"`. No data fetching.

**`/converter`**: `ResultAnnouncer` → `PageHeader` → `HisabDisclaimer` →
form `Card` (direction toggle, Gregorian date `Field` or Hijri
year/month/day `Field`+`Select`, submit) → `HowMonthsWork` → `ErrorBanner`
(conditional) → result `Card` (converted date + `DerivationTrace`) →
`CopyLinkButton`. Computes via `convertDate()` in-browser.

**`/hilal-visibility`**: `ResultAnnouncer` → `PageHeader` → `HisabDisclaimer`
→ form `Card` (date, `LocationPicker`, submit) → `HowMonthsWork` →
`ErrorBanner` → headline `Card` (`HilalMoon` + verdict + sunset/moonset/
conjunction times) → "Observational numbers" `Card` (6-stat grid: altitude,
elongation, moon age, illumination, lag time, crescent width) → "Around
sunset" `Card` (lazy-loaded `TrajectoryChart` + collapsible trajectory table)
→ `Card` wrapping `CriterionHistory` → "Criteria comparison" `Card` (3
criterion cards + collapsible caveats list) → `CopyLinkButton` +
`PrintButton`.

**`/hijri-archive`**: `ResultAnnouncer` → `PageHeader` → form `Card` (year,
`LocationPicker`, submit, in-progress label "Month N of 12…") →
`ErrorBanner` → summary `Card` → scrollable table `Card` (month × 3 methods +
agree/differ/unresolved `Badge`, rows animated in) → `HisabDisclaimer` →
`CopyLinkButton` + `PrintButton`.

**`/isbat-accuracy`**: `ResultAnnouncer` → `PageHeader` → `HisabDisclaimer` →
an informational "Unverified" notice → form `Card` (optional Hijri-year
field, submit) → `ErrorBanner` → either an empty-state `Card` ("No sidang
isbat record for {year}…") or a result `Card` wrapping the shared `Table`
(Month / Actual / one column per method with match/mismatch `Badge` /
Source). Data source is a hardcoded local dataset (`lib/falak/isbat.ts`), not
computed astronomy.

**`/method-divergence`**: retired; `PageHeader` ("has moved") + `Card` with a
manual link, `useEffect` calls `router.replace()` to `/hijri-archive` on
mount. Not linked from `NavBar`.

**`/prayer-times`**: `ResultAnnouncer` → `PageHeader` → daily/monthly toggle
→ **daily branch:** form `Card` (date, `LocationPicker`, convention `Select`,
submit) → `ErrorBanner` → timezone note → grid of 6 prayer-time `Card`s →
`ConventionNote` → `CopyLinkButton` + `PrintButton`; **monthly branch:** form
`Card` (year, month, `LocationPicker`, `Select`, submit) → `ErrorBanner` →
result `Card` with `Table` of daily times → `PrintButton` + `ConventionNote`.

**`/qibla`**: `ResultAnnouncer` → `PageHeader` → form `Card`
(`LocationPicker`, submit) → `ErrorBanner` → result `Card` with a custom
`CompassDial` SVG (240×240, animated needle) + bearing/distance `dl` →
`CopyLinkButton`; second `Card` "Sun Calibration (Rashdul Qibla)" with its own
year-input form, independent `ErrorBanner`, and two ascending/descending
event cards.

**`/visibility-calendar`**: `ResultAnnouncer` → `PageHeader` →
`HisabDisclaimer` → form `Card` (Hijri year, method `Select`,
`LocationPicker`, submit) → `ErrorBanner` → result grid (2/3/4-col responsive)
of per-month `Card`s, each showing verdict + altitude/elongation/lag `dl`, or
an inline "unresolved" reason.

**`/visibility-map`**: `ResultAnnouncer` → `PageHeader` → `HisabDisclaimer` →
form `Card` (date, method `Select`, submit "Load grid") → `ErrorBanner` →
progress indicator (spinner + `role="progressbar"` bar, visible while
computing) → result `Card` containing the SVG map, a hover tooltip
(`glass-card`, absolutely positioned), a collapsible "Results by city" table,
and a legend row (Criterion met / Calculated, not met / Land). Not
auto-triggered from a restored permalink (per code comment) — requires a
manual "Load grid" click.

### Reusable components (`frontend/src/components/`)

| Component | One-line description |
|---|---|
| `BrandMark` | Static inline SVG logo (32×32): crescent + 4-point star, two linear gradients. |
| `CitationList` | List of citation entries under a criterion rule; external link, plain label, or "Citation needed" flag. |
| `ConventionNote` | Bordered info box explaining a prayer-time convention's angles/shadow factor in prose with inline mono numbers. |
| `CopyLinkButton` | Ghost button copying `window.location.href`, toggling icon/label for 1.5s. |
| `CriterionHistory` | Toggle between current/pre-2021 MABIMS rule, recomputes and shows met/not-met badges. |
| `DerivationTrace` | Ordered list of month-start search steps with pass/fail icon and altitude/elongation/lag figures per evening. |
| `ErrorBanner` | Red-tinted bordered `role="alert"` banner with icon + message, animated entrance. |
| `HilalMoon` | Animated inline SVG crescent icon (masked circles + radial gradient); pulsing blurred glow layer when visible; spring entrance. Decorative (`aria-hidden`). |
| `HisabDisclaimer` | Amber/gold bordered disclaimer; `full` (static block) or `compact` (`<details>` disclosure, home page only) variant. |
| `HowMonthsWork` | Card with a 3-item fact grid (icon + title + one-sentence body), CSS subgrid alignment. |
| `LocationPicker` | City dropdown + geolocation button + conditionally-revealed custom lat/lon inputs. |
| `MakerSignature` | Footer credit block with name link and social icon links. |
| `MotionProvider` | Wraps app in `<MotionConfig reducedMotion="user">`. |
| `PageHeader` | Animated header row: icon tile + `<h1>` + description; used at the top of every tool page. |
| `PrintButton` | Ghost button calling `window.print()`. |
| `ResultAnnouncer` | Visually-hidden `role="status"` live region announcing result summaries; on every compute-driven page. |
| `SampleResult` | Static illustrative "example result" card for the home hero; fixed fictional data. |
| `StructuredData` | Injects a JSON-LD `<script>` (WebApplication + WebSite graph). |
| `TrajectoryChart` | Recharts line chart (moon altitude + elongation vs. minutes-from-sunset), fixed `h-64` container, lazy-loaded. |
| `NavBar` | Sticky, blurred header: brand, 5 primary links, "Analysis" dropdown (3 links), optional external "API Docs" link, mobile hamburger panel. |

### `components/ui/` primitives

| Primitive | Visual shape |
|---|---|
| `Badge` | Small rounded pill with leading icon, 4 tones (positive/neutral/negative/indeterminate). |
| `Button` | Fixed `h-11 rounded-xl` button; `primary` = gold gradient + shadow; `ghost` = bordered transparent; spinner when `loading`. |
| `Card` | `.glass-card rounded-2xl shadow-sm` — translucent tinted background via `color-mix`, 1px border, no blur filter. |
| `Field` | Label wrapper + shared `inputClasses` (fixed `h-11` bordered rounded input). |
| `Select` | Headless-UI `Listbox` styled to match `inputClasses`, glass-card floating panel. |
| `Table` | Generic column/row table renderer; scrollable `role="region"` wrapper, sr-only caption, `scope="col"` headers. |

### Core-object viewport share

The visibility map (§1's core object) is drawn at a fixed intrinsic SVG size
of 640×~(proportional to Indonesia's lat/lon span), styled `h-auto w-full
max-w-full` inside a `<div className="relative overflow-x-auto">`, itself
inside the shared page container `<main className="... max-w-6xl px-4 py-10
sm:px-6">`. On a desktop viewport at or above the 1152px content cap, the map
scales to roughly the full content-column width (≤1152px minus padding) at
its native aspect ratio — well under full viewport width on very wide
screens, but the dominant element within the result `Card`. On mobile it
scales to full device width (minus 2×16px padding) via `w-full`. It is one
element among several in the result `Card` (summary sentence, legend, and a
collapsible city table sit above/below it), not a full-bleed or full-height
map.

## 5. Interaction & state

**Inputs/controls across the app:** date `<input type="date">` fields,
numeric year/month/day fields, a city `Listbox` dropdown, a "My location"
geolocation button, custom lat/lon numeric fields (revealed conditionally),
method/convention `Listbox` selects, direction-toggle buttons (converter),
daily/monthly toggle buttons (prayer times), submit buttons per form, a
copy-link button, a print button, a mobile hamburger toggle, an "Analysis"
dropdown menu, `<details>/<summary>` disclosures (trajectory table, model
caveats, compact disclaimer), and hover-driven tooltips over the visibility
map's SVG cells (`onMouseMove`).

**Keyboard:** native semantics throughout (buttons, links, `<select>`-like
Headless-UI `Listbox`/`Menu` components handle their own keyboard nav); a
"skip to content" link is the first tab stop in the root layout
(`sr-only focus:not-sr-only`); explicit `focus-visible:` styling appears in
exactly two places — the `/hijri-archive` scrollable table wrapper and the
shared `Table` component — both `role="region" tabIndex={0}` with an outline
ring. The visibility-map's individual grid cells are not independently
focusable/keyboard-navigable; the collapsible "Results by city" table is
provided as the keyboard/touch/screen-reader route to the same data.
`TrajectoryChart` uses Recharts' `accessibilityLayer` for built-in keyboard
series-walking.

**Gestures:** none beyond standard pointer hover/click and native touch
scrolling; the map tooltip and geolocation button are the only
pointer/device-API-driven interactions (`navigator.geolocation` for "My
location").

**Animation and mechanism:**
- `framer-motion` drives nearly all page/section entrance animations
  (`motion.div`/`motion.section`, opacity+translateY fades, some with
  `staggerChildren`/per-item `delay: i * 0.0X`), an `AnimatePresence`-based
  panel swap on the converter's direction toggle, and an `AnimatePresence`
  height animation revealing custom lat/lon fields in `LocationPicker`.
- `HilalMoon.tsx`: spring-in wrapper (`type:"spring", stiffness:90,
  damping:14`) plus, when the verdict is "visible," a looping pulsing glow
  (`motion.circle`, opacity `[0.5,0.9,0.5]`, 2.6s, Gaussian-blur filter).
- `qibla/page.tsx`'s `CompassDial`: needle is a `motion.g` with
  `animate={{rotate: bearingDeg}}`, spring transition (`stiffness:60,
  damping:12`).
- `/visibility-map`: the SVG data layer reveals via a `motion.rect` clip-path
  wipe (`width: 0 → WIDTH`, 0.9s easeInOut); the progress bar fades in.
- `MotionProvider` wraps the whole app in `<MotionConfig reducedMotion="user">`,
  a single global mechanism that drops transform/layout animation under the OS
  reduced-motion setting while permitting opacity cross-fades.
- Separately, `globals.css` has two `@media (prefers-reduced-motion: reduce)`
  blocks: one collapses `--duration-fast/base/slow` CSS custom properties to
  `1ms` (not `0ms`, per an in-code comment about `transitionend` firing
  reliability), the other disables the decorative `.starfield`
  twinkle animation and `.bg-shimmer` (stars remain visible, motion stops).

**Loading/empty/error/first-visit states:**
- *Loading:* every compute-triggering form shows a `Button loading` state
  (spinner + label change, e.g. "Converting…", "Computing…", "Loading…").
  `/hijri-archive` shows month-by-month progress text ("Month N of 12…").
  `/visibility-map` shows a distinct progress bar (`role="progressbar"
  aria-valuenow/min/max`) with completed/total shard counts. `TrajectoryChart`
  has a height-reserved placeholder (`<div className="h-64 w-full"
  aria-hidden />`) while its `next/dynamic` chunk loads. No dedicated
  `loading.tsx` route-level skeleton file exists anywhere in the app.
- *Error:* a shared `ErrorBanner` (`role="alert"`) renders on every page that
  computes something, driven by a per-page `error` state (some pages,
  `/qibla` and `/prayer-times`, keep two independent error states for two
  independent forms on the same page).
  
- *Empty/no-result:* `/isbat-accuracy` has an explicit empty state (a
  centered `Card` message distinguishing "no records seeded at all" from "no
  record for this specific year"). `/hilal-visibility` distinguishes an
  "indeterminate"/too-close-to-call verdict state from visible/not-visible.
  `/visibility-calendar` handles per-month failure inline within each card
  rather than as a page-level empty state. Other list-producing pages
  (`/hijri-archive`, `/prayer-times` monthly) always return a fixed-length
  result set (12 months / N days) so have no "zero results" case.
- *First-visit:* no onboarding/tour/tooltip-walkthrough exists. The home page
  (`/`) functions as the first-visit surface, and `SampleResult` on it shows a
  static, hardcoded example of a computed result before the user runs a
  calculation themselves.

## 6. Weak points, stated plainly

- The **home page** (`/`) is a standard hero + feature-card-grid layout (eyebrow
  pill, gradient headline, two CTAs, a 5-item icon-card grid) — the generic
  marketing-page shape, distinguished from a template only by its copy and the
  `SampleResult`/`HilalMoon` illustration placed in the hero.
- The **method-comparison data on `/hijri-archive` and `/isbat-accuracy`** —
  inherently a multi-dimensional comparison across 12 months × up to 3–4
  methods — is rendered as a plain HTML table (columns per method, badge per
  cell), not as any kind of visual diff/timeline. `/isbat-accuracy` (actual
  vs. predicted date per method, per year) is table-only with no chart.
- **`/prayer-times` monthly view** and **`/hijri-archive`**, both inherently
  calendar/temporal data, are rendered as scrollable tables rather than any
  calendar-shaped or timeline layout.
- **`TrajectoryChart`'s colours are not theme-adaptive** — its grid/axis
  strokes (`#94a3b8`) and line colours (`#4fb3a6`, `#4fb3a6`/`#d9a83e` as raw
  literals) are hardcoded rather than referencing the CSS custom properties
  used everywhere else, so this one chart does not follow the same
  light/dark-mode token discipline as the rest of the app.
- **Visibility-map cells are not keyboard-focusable** — the SVG grid only
  responds to `onMouseMove`; keyboard/screen-reader users are routed to a
  separate collapsible "Results by city" table rather than being able to
  inspect individual grid cells directly.
- **`focus-visible` styling is applied in only two places** in the whole
  codebase (the `/hijri-archive` table wrapper and the shared `Table`
  component) — no centralized `:focus-visible` rule exists in `globals.css`,
  so focus-ring coverage on other interactive elements (buttons, links,
  form controls, the compass SVG, map tooltip trigger) depends on
  browser/Tailwind defaults rather than an explicit, audited style.
- **No dark-mode toggle** — `darkMode: "media"` means the app always follows
  the OS setting with no in-app override, so a user whose OS is set
  differently from their preference for this specific app has no way to
  change it.
- **`frontend/README.md` is stale** — it is the unmodified `create-next-app`
  boilerplate and does not describe the app's actual static-export/GitHub
  Pages deployment (documented instead in the separate root `DEPLOY.md`).

## Open questions

- Whether the Django/Celery/Postgres backend (`backend/`) is presently
  deployed anywhere, or exists only as an optional/dormant capability — the
  repo contains `fly.toml` and Docker Compose config for it, but no evidence
  in the frontend code of its being reachable by default (`NEXT_PUBLIC_API_BASE_URL`
  appears unset in the static build).
  
- Whether the golden-vector conformance suite
  (`backend/scripts/generate_golden_vectors.py` →
  `frontend/src/lib/falak/__fixtures__/golden-vectors.json` → `golden.test.ts`)
  runs in CI on every change, or only on demand — not verifiable from the
  frontend code alone.
- Exact pixel/viewport measurements for the visibility map on real devices
  were derived from `WIDTH=640` and the `max-w-6xl` container class rather
  than a rendered screenshot; actual on-screen scaling under browser zoom or
  non-standard viewports was not verified visually.
- Whether the `TrajectoryChart` colour non-adaptivity (§6) was a deliberate
  choice (e.g. deferred) or an oversight could not be determined from the code
  or comments.
