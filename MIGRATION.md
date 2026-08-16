# MIGRATION.md — Falak

File-by-file disposition for the DESIGN.md rework, plus every place DESIGN.md
does not (yet) account for. Built by reading DESIGN.md, PRD.md, CLAUDE.md, and
DESIGN-AUDIT.md, then walking `frontend/src` file by file.

**Precedence, restated:** CLAUDE.md's non-negotiables outrank DESIGN.md.
`frontend/src/lib/falak/**` is frozen — no edits except adding new pure,
read-only selector functions (new exports that derive a display value from
existing engine output; never new physics, never a change to an existing
export's signature or behaviour, since the golden-vector suite pins those).

Legend: **keep** = no change. **restyle** = classNames/tokens/copy change,
structure and behaviour unchanged. **rewrite** = structure, props, or logic
change, file survives. **absorb** = content/behaviour moves into a new
route's file; this file becomes (or is replaced by) a redirect stub.
**delete** = removed outright.

---

## `app/`

| File | Action | Notes |
|---|---|---|
| `app/layout.tsx` | rewrite | Adds context bar (§4.3), theme toggle + no-FOUC script (§2.5, §9.1), `<html lang="id">` (§7, do in the language pass, not step 1). Keep `MotionProvider`, `StructuredData`, skip link, footer disclaimer line. |
| `app/globals.css` | rewrite | Step 1 target — see "Step 1" below. |
| `app/page.tsx` | rewrite | Home becomes the live instrument (§6 `/`). Kills hero/feature-grid. |
| `app/favicon.ico`, `app/icon.png`, `app/apple-icon.png` | **flagged, no DESIGN.md owner** | Derived from the old palette/mark. DESIGN.md never revisits the icon set. See Flags §1. |
| `app/robots.ts` | keep | Generic; reads `ALL_PATHS`/`absoluteUrl` from `lib/routes.ts`, which is rewritten — this file needs no edit of its own. |
| `app/sitemap.ts` | keep | Same — consumes `ALL_PATHS`, self-updates once `routes.ts` changes. |
| `app/converter/page.tsx`, `app/converter/layout.tsx` | absorb → redirect stub | Converter control + `DerivationTrace` move into `/kalender` (§6 `/kalender`). Old path becomes a client-redirect stub, pattern already proven at `app/method-divergence/*` (§4.1, §9.9). |
| `app/hilal-visibility/page.tsx`, `layout.tsx` | absorb → redirect stub | Becomes the "Petang ini" sweep of `/hilal` (§6 `/hilal`, §4.2). |
| `app/visibility-map/page.tsx`, `layout.tsx` | absorb → redirect stub | Becomes the "Se-Indonesia" sweep of `/hilal`. D3 usage (`d3.scaleLinear`/`geoPath`/`geoTransform`) carries over and is restyled, not replaced (§6, "the existing D3 grid, restyled"). |
| `app/visibility-calendar/page.tsx`, `layout.tsx` | absorb → redirect stub | Becomes the "Setahun" sweep of `/hilal` — rebuilt as a grid of miniature `HorizonInstrument`s, not the current per-month numeric cards (§6, explicitly "worth building carefully"). |
| `app/hijri-archive/page.tsx`, `layout.tsx` | absorb → redirect stub | Table survives, relocates under `BoundaryRibbon` on `/kalender` (§5.2, §6). |
| `app/isbat-accuracy/page.tsx`, `layout.tsx` | absorb → redirect stub | Becomes the ribbon's fourth marker lane on `/kalender`; existing `Table`-based comparison stays as the accessible/printable form (§5.2). |
| `app/prayer-times/page.tsx`, `layout.tsx` | absorb → redirect stub | Daily/monthly logic moves into `/langit`, readout changes from 6 cards to one row (§6 `/langit`). |
| `app/qibla/page.tsx`, `layout.tsx` | absorb → redirect stub | `CompassDial` logic feeds into `DayArc`'s base ring; Rashdul Qibla section moves down but survives with its own form (§5.3, §6). |
| `app/method-divergence/page.tsx`, `layout.tsx` | rewrite | Already the redirect-stub pattern DESIGN.md wants copied ninefold — but its own target (`/hijri-archive`) is itself being retired, so this needs re-pointing to `/kalender` once that route exists (§9.9). |
| **new:** `app/hilal/page.tsx` + `layout.tsx` | new | Sweep selector + `HorizonInstrument` (§4.1, §4.2, §6, §9.5). |
| **new:** `app/kalender/page.tsx` + `layout.tsx` | new | `BoundaryRibbon` + table + `DerivationTrace` (§4.1, §5.2, §6, §9.6). |
| **new:** `app/langit/page.tsx` + `layout.tsx` | new | `DayArc` + prayer readout + Rashdul Qibla (§4.1, §5.3, §6, §9.7). |

---

## `components/`

| File | Action | Notes |
|---|---|---|
| `BrandMark.tsx` | restyle | Gradients move from gold/teal hexes to `--ufuk-*`/`--nila-*` role tokens. |
| `CitationList.tsx` | restyle | Copy → Indonesian (§7); token colours only otherwise. |
| `ConventionNote.tsx` | restyle | Survives on `/langit` per §6. |
| `CopyLinkButton.tsx` | restyle | Behaviour unchanged; button styling follows `Button` primitive. |
| `CriterionHistory.tsx` | restyle | Explicitly named as surviving "unchanged in behaviour, restyled" on `/hilal` (§6). |
| `DerivationTrace.tsx` | rewrite | Explicitly called out for a real typographic upgrade, not just recolouring: numbered steps, `--verdict-dark`/`--verdict-lit` per step, Plex Mono values (§6 `/kalender`). |
| `ErrorBanner.tsx` | restyle | Copy rules apply (§7: state what happened + what to do, no apology). |
| `HilalMoon.tsx` | **flagged — orphaned** | §8 only says delete "the pulsing glow loop," not the component. Its sole call sites (`/hilal-visibility` headline, `SampleResult`) are both gone once `HorizonInstrument` replaces the headline and `SampleResult` is deleted. See Flags §2. |
| `HisabDisclaimer.tsx` | rewrite | §7: "one quiet line with a disclosure, not a bordered amber box" — a visual-weight rewrite, not a restyle. `full`/`compact` variants and the CLAUDE.md-mandated presence on every month-start page stay. |
| `HowMonthsWork.tsx` | **flagged — no owner route** | Currently on `/converter` and `/hilal-visibility`, neither of which exist post-migration in this shape. See Flags §3. |
| `LocationPicker.tsx` | rewrite | Logic (city listbox, geolocation, custom lat/lon) is explicitly reused ("the existing `LocationPicker` logic, lifted to a React context provider," §4.3) but the component boundary changes: it stops being a per-page form field and becomes part of the context-bar provider. |
| `MakerSignature.tsx` | restyle | Font family changes (Be Vietnam Pro), no structural change. |
| `MotionProvider.tsx` | keep | `<MotionConfig reducedMotion="user">` stays verbatim (§2.4). |
| `NavBar.tsx` | rewrite | Three items, "Analysis" dropdown deleted, context bar renders beneath it, theme toggle added (§4.3, §8). |
| `PageHeader.tsx` | **flagged — placement unclear** | See Flags §4. |
| `PrintButton.tsx` | restyle | Survives on `/kalender` and `/langit` printable views. |
| `ResultAnnouncer.tsx` | keep | sr-only live-region pattern is orthogonal to the visual redesign and still needed once results compute on every keystroke instead of on submit. |
| `SampleResult.tsx` | delete | Explicit, §6 `/` and §8. |
| `StructuredData.tsx` | rewrite | JSON-LD graph is generated from `lib/routes.ts`'s route list, which is rewritten to the new 3-route IA. |
| `TrajectoryChart.tsx` | delete, **replacement flagged** | Recharts removal is explicit (§8). What replaces the *time-series* it drew (moon/sun altitude across the evening) is not specified — `HorizonInstrument` is a single-moment drawing. See Flags §5. |
| `NavBar.tsx` "Analysis" `Menu` (headlessui) | delete | Folded into the NavBar rewrite above. |
| `components/ui/Badge.tsx` | restyle | Tone set changes from positive/negative to lit/dark/margin, still icon + colour, never colour alone (§2.5, §3.1). |
| `components/ui/Button.tsx` | restyle | Fill colours move to `--accent-solid`/`--accent-on-solid`; motion durations follow the new `--duration-fast` value. |
| `components/ui/Card.tsx` | restyle | `.glass-card` repoints to `--surface-card`/`--border`. Many current call sites (form cards) disappear per §4.3, but `Card` itself survives for secondary content (criterion cards, event cards, etc). |
| `components/ui/Field.tsx` | rewrite | Per-page date/location form fields mostly disappear into the context bar; the handful of surviving standalone fields (year inputs for the ribbon, Rashdul Qibla, isbat filter) keep using it. |
| `components/ui/Select.tsx` | restyle | Method/convention selects survive inline (sweep selector, convention picker). |
| `components/ui/Table.tsx` | restyle | Survives as the explicitly-preserved accessible/printable form behind `BoundaryRibbon` and the monthly prayer table (§5.2, §6). |

---

## `lib/` (non-`falak/`)

| File | Action | Notes |
|---|---|---|
| `lib/api.ts` | rewrite | See Flags §6 — the real "engine-facing, assumes per-page submit" surface is here, not in `lib/falak/`. Not frozen (outside `lib/falak/`), so this absorbs the sweep-consolidation work. |
| `lib/cn.ts` | keep | Generic `clsx`+`tailwind-merge` helper. |
| `lib/date.ts` | keep | Generic `todayIso()`. |
| `lib/locations.ts` | keep | City list is reused verbatim by the context-bar `LocationPicker` (§4.3). |
| `lib/permalink.ts` | keep | Generic query-string read/write; the context bar needs it to carry more keys (`?lat=&lon=&tz=&d=`, §4.3) but the helpers themselves don't change shape. |
| `lib/routeMetadata.ts` | rewrite | Depends on `routes.ts`'s new shape; `locale: "en"` → `"id"` (§7). |
| `lib/routes.ts` | rewrite | New 3-route + home IA, Indonesian titles/descriptions (§4.1, §7). `ALL_PATHS` must include the 9 redirect-stub paths too, so they stay in the sitemap with their `noindex` canonical — confirm this against current `method-divergence` precedent, which is *not* in `ALL_PATHS` today (it's absent from `ROUTES`); the 9 new stubs should follow that same "not in `ALL_PATHS`" precedent, not be added to it. |
| `lib/timezone.ts` | keep | `tz-lookup` wrapper, reused by the context bar's date display. |
| `lib/verdict.ts` | keep | Pure boolean selector over engine wire values, outside `lib/falak/`, already exactly the kind of "read-only selector" the freeze rule allows — but it already lives at the right layer, no need to move it. |
| `lib/verdictLabels.ts` | rewrite | Labels move to Indonesian (§7); the "display-only, one-directional, never parsed back" contract in its own header comment must be preserved exactly. |
| `lib/geo/indonesia.geo.json` | keep | Static topology data, consumed by the restyled D3 sweep. |
| `lib/__tests__/api.test.ts` | rewrite | Follows `api.ts`'s consolidation. |
| `lib/__tests__/verdictLabels.test.ts` | rewrite | Follows the Indonesian label set. |

---

## `lib/falak/` — frozen

| File | Action |
|---|---|
| `archive.ts`, `citations.ts`, `conjunction.ts`, `converter.ts`, `grid.ts`, `grid.worker.ts`, `gridRunner.ts`, `horizon.ts`, `isbat.ts`, `lunar.ts`, `prayerTimes.ts`, `qibla.ts`, `solar.ts`, `time.ts`, `timescale.ts`, `tolerance.ts`, `visibility.ts` | keep |
| `__fixtures__/golden-vectors.json`, `__tests__/golden.test.ts`, `__tests__/tolerance.test.ts` | keep |

No edits. `HorizonInstrument` (§5.1) needs derived values no current export produces — sun's true depression angle at evaluation time, the moon's azimuth offset from the sun for limb-facing direction — these must land as **new, additive, pure selector functions** (e.g. a new `lib/falak/geometry.ts` or additions to `visibility.ts`'s exports), computed from values the engine already produces, never new astronomical formulas. See Flags §7 for the guardrail this needs.

---

## Root-level `frontend/` files outside `src/`

Out of the literal "every file under `frontend/src`" ask, but load-bearing enough to flag: `tailwind.config.ts` (rewrite, step 1 covers the role-token rewiring, ramp deletion is §9.10), `package.json` (rewrite — drop `recharts`; `d3` stays per the restyled sweep), `frontend/README.md` (rewrite per §8, unrelated to the visual migration itself), `frontend/scripts/og-card.source.tsx` (rewrite — currently draws the old gold/teal palette), `public/manifest.webmanifest` (regenerate — `background_color`/`theme_color` are fixed dark hexes from the old palette).

---

## Flags — things DESIGN.md doesn't account for

**1. Icon/PNG assets have no migration owner.** `favicon.ico`, `icon.png`, `apple-icon.png`, and `public/og-card.png` all encode the old gold/teal palette and are generated artifacts (`scripts/build-maskable-icons.mjs`, `scripts/og-card.source.tsx`) rather than hand-edited files. DESIGN.md's palette section (§3.1) governs the CSS token layer; it never says whether the app icon itself should be repainted to the maghrib palette. Needs a decision before §9.10.

**2. `HilalMoon.tsx` becomes orphaned, not deleted.** §8 lists "the `HilalMoon` pulsing glow loop" as a deletion target, distinct from the component. But `HilalMoon`'s only two call sites — the `/hilal-visibility` headline (replaced by `HorizonInstrument`, §5.1) and `SampleResult` (deleted, §8) — both disappear. Either the component is dead code after step 5/8 and should be deleted outright, or DESIGN.md intends a small illustrative role for it somewhere unstated (e.g. inside the mini-instrument grid on "Setahun," or a loading placeholder). Needs a decision before step 5.

**3. `HowMonthsWork.tsx` has no route in the new IA.** It currently explains, in three short cards, how month-start search works — on `/converter` and `/hilal-visibility`. Both routes are absorbed elsewhere; DESIGN.md's page specs for `/hilal` and `/kalender` (§6) don't mention this explanatory block or where its content should live. It's not listed under §8 Deletions either, so silently dropping it isn't obviously correct.

**4. `PageHeader`'s role is unclear once pages are drawing-first.** House layer §2.1 states "the core object is the largest element on the screen and the first thing rendered" — but every current page opens with `PageHeader` (icon + `<h1>` + description) before anything else. DESIGN.md's page specs (§6) show the instrument/ribbon/arc first, with no header above it in any of the three ASCII layouts. Whether `PageHeader` moves below the drawing, shrinks into the context bar, or is dropped per-page in favour of the drawing's own `<desc>`/caption is not specified.

**5. `TrajectoryChart`'s time-series has no designated replacement.** §8 deletes Recharts and `TrajectoryChart` outright, and §5.1 makes clear `HorizonInstrument` is a single-moment drawing ("driven directly by engine output... at the moment of evaluation"). The current `/hilal-visibility` page also shows a *trajectory* — moon altitude and elongation across the ~90 minutes around sunset — via `hilalTrajectory()` in `lib/api.ts`, which calls the frozen `lib/falak/visibility.ts`. That data and its consumer (`fetchHilalVisibility`'s `trajectory` field) still exist; DESIGN.md never says what draws it now. Candidates (an animated sweep of the instrument, a small inline sparkline, dropping the view) are all plausible but unstated — needs a decision before step 3, since it affects whether `HorizonInstrument` needs a time-scrubbing mode.

**6. The actual "assumes a per-page submit" surface is in `lib/api.ts`, not `lib/falak/`.** Checked directly: none of the `lib/falak/*` engine functions are submit-gated — they're plain pure/sync functions callable on every keystroke, so DESIGN.md's "computation is fast and local; delete every submit button" (§4.3) holds for the engine itself. The real constraint lives one layer up, in `lib/api.ts`'s async wrappers, and it is *not* limited to the one sweep DESIGN.md exempts:
   - `fetchVisibilityGrid` (the Indonesia sweep) — correctly identified and exempted by name ("Se-Indonesia," §4.3, §6).
   - `fetchHijriYearArchive` — **not exempted, but has the same shape.** It already carries an `onProgress` callback and yields with `await new Promise(setTimeout, 0)` between each of its 12 months today, specifically because running all 36 month-start searches synchronously blocks the page long enough to need progress UI. `BoundaryRibbon` (§5.2) needs exactly this function's output, driven by the same "typing a date scrolls the ribbon and marks it" recompute-on-change model §6 describes for `/kalender` — but that model is stated for the *single-date* converter control, not for the year-wide ribbon recompute. Whether the ribbon recomputes its full 12-month sweep on every place/date-context change (reintroducing the multi-second block DESIGN.md's own "no submit buttons" reasoning assumes away) or keeps an explicit trigger like the Indonesia sweep is undecided.
   - `fetchVisibilityCalendar` (the "Setahun" sweep, §6) has the same 12-month-loop shape as `fetchHijriYearArchive` but currently has *no* progress/yield mechanism at all — it runs all 12 months synchronously in one tick. Rebuilding it as "twelve miniature instruments" (§6) doesn't reduce the compute cost, so it inherits the same open question.
   - `fetchMethodDivergence` is dead code today (exported from `api.ts`, never imported by any page — confirmed by search) and duplicates `fetchHijriYearArchive`'s per-method loop. It should probably be deleted during the `lib/api.ts` consolidation regardless of the redesign, since `/method-divergence` never called it.

**7. New engine-facing selectors for `HorizonInstrument` need an explicit scope boundary.** §5.1 requires geometry (sun depression angle, moon azimuth offset, illuminated-limb direction) that no current `lib/falak/*` export produces directly. The freeze rule permits "pure read-only selectors" — but a selector that, say, derives azimuth from existing lat/lon/time state is safe, while one that introduces a new coordinate transform not already exercised by the golden-vector suite would be new engine surface wearing a selector's name. Whoever builds step 3 needs a concrete list of which `HorizonInstrument` values are pure recombination of existing engine outputs (safe) versus genuinely new computation (must go through the same validation rigor CLAUDE.md's Phase 0 demands, not be smuggled in as a "selector").

**8. Full copy/locale surface is larger than DESIGN.md's examples.** §7 gives a handful of example strings (button labels, one error message). The actual Indonesian-copy surface includes: all of `lib/verdictLabels.ts`'s label map, `lib/routes.ts`'s titles/descriptions, every component's inline strings (`ConventionNote`, `CitationList`, `ErrorBanner` messages thrown from `lib/api.ts`'s `ApiError`s, `HisabDisclaimer`'s full text, ARIA labels on `ResultAnnouncer`/`role="img"` SVGs), and the CLAUDE.md-mandated disclaimer text itself, which is a non-negotiable that must be translated without softening. This isn't a design gap so much as a scope note: the language pass (§9, unnumbered but implied throughout §7) touches nearly every file already being restyled, so it should be sequenced together with each file's restyle/rewrite pass rather than as a separate global find-and-replace at the end.

---

## Step 1 — executed

Scope, per §9.1: tokens (new palette + role tokens), `darkMode: "class"`, a
theme toggle, the global `:focus-visible` rule, and contrast verification.
No page or feature component touched. Diff follows in the next message.

Contrast check (WCAG 2.1, computed against both `--surface-page` and
`--surface-card`, worst case reported — same method the existing token
comments in `globals.css` use):

| Token | Light (worst of page/card) | Dark (worst of page/card) | Floor | Result |
|---|---|---|---|---|
| `--text-body` | 14.39:1 | 13.62:1 | 4.5:1 | pass as spec'd |
| `--text-muted` | 5.79:1 | 6.22:1 | 4.5:1 | pass as spec'd |
| `--accent-text` | 4.83:1 | 8.84:1 | 4.5:1 | pass as spec'd |
| `--verdict-lit` | 4.83:1 | 11.38:1 | 4.5:1 | pass as spec'd |
| `--verdict-dark` | 9.45:1 | 2.52:1 → **fixed to 4.68:1** | 4.5:1 | **dark mode failed as spec'd, lightness adjusted within the same senja hue** |
| `--verdict-margin` | 5.09:1 | 4.65:1 | 4.5:1 | pass as spec'd |
| `--accent-solid` (UI-stroke use, e.g. the focus ring) | 2.02:1 → **fixed to 3.02:1** | 7.41:1 | 3.0:1 | **light mode failed as spec'd, lightness adjusted within the same ufuk hue** |
| `--accent-on-solid` vs `--accent-solid` | 4.78:1 (after fix) | 8.15:1 | 4.5:1 | pass |
| `--border` | 1.30:1 | 1.19:1 | 3.0:1 | **fails, kept as-is** — this is a passive card-edge divider, not a component boundary a user must perceive to operate the UI; WCAG 1.4.11 carves out exactly this case, and the *current, unaudited* `--card-border` token in production measures similarly low against its backgrounds, so this isn't a regression. Documented inline rather than force-darkened, which would fight the deliberate "paper" subtlety §3.1 asks for. |

Two token values differ from DESIGN.md's literal hex values as a direct
result of this verification, per §3.1's own instruction ("Verify every pair
... and adjust the *lightness* of the given hue if a pair fails. Do not
substitute a different hue.") — both documented with their measured ratio
inline in `globals.css`, matching the file's existing comment convention:

- Light-mode `--accent-solid`: `#E8A05C` (ufuk-500) → `#D4771E`, an
  unlisted, darker step of the same ufuk hue, used only for this role token
  (the `--ufuk-*` ramp itself is unchanged).
- Dark-mode `--verdict-dark`: `#6B5680` (senja-500) → `#9682AB`, an
  unlisted, lighter step of the same senja hue, same treatment.

---

## Step 2 — executed

Scope, per §9.2: add the three families via `next/font/local`, map to
`display`/`sans`/`mono`, narrow `font-mono` to genuinely technical values.

**Correction to DESIGN.md:** §3.2 calls Be Vietnam Pro "(variable)". Checked
against the npm registry directly (`@fontsource-variable/be-vietnam-pro`
returns 404; only `@fontsource/be-vietnam-pro`, static weights, exists) —
Google Fonts has never published a variable build of this family, only
Newsreader is actually variable. Loaded Be Vietnam Pro as three static
weight files instead (400/500/600 — the only weights the app's classNames
use anywhere, confirmed by grep; `font-bold`/700 appears nowhere). This has
no user-visible difference from a variable font at these three weights and
is the standard `next/font/local` pattern for a multi-weight static family.
Newsreader is genuinely variable and was loaded as one file carrying both
its `wght` (200–800) and `opsz` (6–72) axes, confirmed via `fontTools`
against the actual binary rather than assumed from the package name.

**Found and fixed in passing, not scope creep:** the previous single-family
setup (`fontFamily.display` → Geist) was never actually applied anywhere —
`grep -rn "font-display\b" src` returned zero matches before this step, and
Tailwind's Preflight was never told to use it as the default `sans` either
(only `extend.fontFamily.display` existed, not `.sans`). The app has been
rendering in the plain browser default sans-serif stack this entire time;
Geist shipped as dead weight in the same way Geist Mono already had (per
that font's own removal comment). Fixed by overriding Tailwind's default
`sans` and `mono` keys (not just adding `display`), which is what makes
Preflight's `html { font-family: theme('fontFamily.sans') }` and every
`font-mono` utility actually resolve to the new families — verified against
the compiled build output, not assumed:
`html{font-family:var(--font-sans),ui-sans-serif,system-ui,sans-serif}` and
`.font-mono{font-family:var(--font-plex-mono),ui-monospace,...}`. This also
required moving the font-variable classes from `<body>` to `<html>` — a CSS
custom property is only visible to the element defining it and that
element's descendants, and Preflight's rule lives on `html` itself.

`font-display` is applied to exactly one place in this step: `PageHeader`'s
`<h1>`, the app's one shared "page title" element and the first item on
DESIGN.md's own typography table (§3.2). Nowhere else — the rest of the
typography rollout (verdict sentences, the headline number, pull quotes)
belongs to the pages that carry them, which are being rewritten wholesale
in steps 3–8, not retrofitted here.

Verified: `tsc --noEmit` clean, eslint clean, `next build`
(`STATIC_EXPORT=1`) succeeds, compiled CSS inspected directly to confirm
the font-family resolution above, and all 63 vitest tests (including the
golden-vector suite) pass unchanged.

---

## Step 3 — executed

Scope, per §9.3: build `HorizonInstrument` standalone against
`__fixtures__/golden-vectors.json`, get the crescent geometry, the
threshold band, and the hover-linking right. Not wired into any page.

**Resolved the azimuth flag (MIGRATION.md's earlier flag #7)** per your
answer: horizontal placement uses `lagTimeMinutes` (already validated,
already exported) instead of a true azimuth value, which doesn't exist
anywhere in the frozen engine. Turned out to need *zero* new files under
`lib/falak/` — every value the drawing needs (altitude, elongation,
illumination, lag time, the MABIMS/Odeh thresholds) was already exported.
The geometry mapping itself lives in a new file **outside** the frozen
boundary, `src/lib/instrumentGeometry.ts`, which only *reads* two existing
`lib/falak/visibility.ts` exports (`MABIMS_MIN_ALTITUDE_DEG`, `odehVValue`)
and never modifies them.

**Built and screenshot-verified, not just compiled.** Per this session's
own standing instruction to check UI changes in a browser before calling
them done: built a standalone preview harness at
`src/app/_dev/horizon-instrument/page.tsx` (the `_` prefix is Next's App
Router convention for a private, unroutable folder — confirmed by building
and checking it produces no route, both before and after every fix below),
rendered it against six real cases from the fixture set via a temporary
real route + Playwright screenshots, in both light and dark mode. This
caught two real bugs a passing test suite alone did not:

1. **The moon was invisible in every realistic case.** A literally
   area-proportional crescent (the mathematically "correct" version -
   `circleOverlapVisibleFraction`, still in the module and still tested)
   renders real hilal-scale illumination (routinely under 1%) as a
   sub-pixel sliver at icon scale - confirmed directly: illumination
   0.00212 produced a ~0.09px mask offset on a 44px-diameter circle.
   DESIGN.md's "a 0.4% crescent must look like a 0.4% crescent" (§5.1)
   turns out to require *perceptual* differentiation, not photometric area
   truth, for the exact regime this app lives in. Fixed by adding
   `perceptualCrescentFraction()` - a documented, monotonic, exact-at-both-
   ends power-curve compression (gamma 0.3) applied before the area
   inversion - so a 0.02% crescent, a 2% crescent, and a 90% crescent are
   all visibly distinct and none of them disappear. The true
   `illumination_fraction` is never hidden by this: it's always the number
   shown in the readout beside the drawing, only the drawing's shape is
   compressed.
2. **Extreme-but-real fixture values drove the moon off-canvas** in both
   axes - the fixture set's own stress case (37.4° altitude, +562 minutes
   of lag, a near-full moon far outside hilal territory, used elsewhere
   only to exercise the Odeh formula's range) pushed the moon 88px above
   the top edge and, separately, 90px past the right edge. Fixed with two
   independent defensive pixel-space clamps (`ALT_DOMAIN_*`/`SUN_RADIUS`/
   `MOON_RADIUS` margins on the y-axis, canvas-width margins on the x-axis)
   on top of the existing semantic value-range clamps, so a future change
   to `ALT_PX_PER_DEG`, `LAG_PX_PER_MINUTE`, or the viewport size can't
   silently reopen the same failure by drifting out of sync with the
   canvas size. Real hilal-range inputs (0-15° altitude, tens of minutes of
   lag) never approach either clamp.

Both fixes are covered by new tests (`instrumentGeometry.test.ts`) that
encode the exact fixture values that exposed them, not just the fix's
final behaviour, so a regression back to either bug fails loudly. The
component's `<title>` tooltips, `role="img"` + `<desc>`, and the `<dl>`
readout's keyboard-reachable hover-linking were also confirmed by direct
inspection of the rendered SVG output and an interactive hover screenshot,
not assumed from the code alone.

**Also found, not fixed:** `HilalMoon.tsx`'s own crescent-shift formula,
worked through the same two-circle mask this component reuses, puts the
offset in the *opposite* direction from `HorizonInstrument`'s - largest at
illumination 0, which is backwards for an area-proportional reading (see
`crescentOffsetForVisibleFraction`'s doc comment). This isn't fixed here:
`HilalMoon` is already flagged as likely orphaned (MIGRATION.md flag #2)
once `HorizonInstrument` replaces its call sites, so this is one more data
point for deleting it outright rather than patching it.

**Odeh's threshold band is cross-validated against all 195 real fixture
observations**, not just algebra checked in isolation:
`odehThresholdBand()`'s closed-form altitude inversion is asserted to
agree with the frozen `odehCriterion()`'s own verdict for every
`"visible"` and `"not_visible"` observation in the fixture set (marginal
cases are between the two boundaries `odehThresholdBand` doesn't compute,
so aren't checked here - the "visible" boundary is the one this component
draws).

Verified: `tsc --noEmit` clean, eslint clean, `next build`
(`STATIC_EXPORT=1`) succeeds with `/_dev/**` producing no route (checked
directly in the build output, both before and after cleanup), all 86
vitest tests pass (63 prior + 23 new, including cross-validation against
all 195 real fixture observations), and the component was visually
verified via rendered screenshots in both light and dark mode plus an
interactive hover-linking screenshot - not just compiled.

---

## Step 4 — executed

Scope, per §9.4: lift place and date to a provider, wire to URL query
params and `localStorage`, render the bar in the root layout.

**Logic lifted, not copied.** `LocationPicker.tsx`'s city-selection,
geolocation, and custom-coordinate handling now lives in
`ObservationProvider.tsx` (a React context + `useObservation()` hook);
`LocationPicker.tsx` itself is untouched for now (`ContextBar.tsx` is a new,
separate component - see the transitional note below on why the old
component wasn't deleted or rewritten yet).

**URL shape matches DESIGN.md's literal spec** (`?lat=&lon=&tz=&d=`) with
one deliberate change: no separate location-label param. A shared link's
friendly name (e.g. "Jakarta") is always re-derived from its coordinates
(`matchCity` in `lib/observation.ts`) rather than stored as its own field,
so a stale or hand-edited label can never disagree with the coordinates it
sits next to. `tz` is written for transparency/debuggability of a shared
link but never trusted back on read - it's always recomputed from lat/lon
via the existing `resolveTimeZone`, so a stale or hand-edited `tz` param in
a pasted URL can't silently override a correct derived value.

**SSR-safe by construction, not by accident**: initial state is
`defaultObservation()` (Jakarta + today), identical to what a static
prerender produces; the real value (from the URL, then `localStorage`,
then that same default) is applied in a `useEffect` after mount. This is
the exact pattern `lib/permalink.ts`'s own header comment documents for
the pages that already read the query string post-mount rather than
during render, deliberately kept consistent rather than introducing a
second SSR-safety pattern into the same codebase. Verified directly, not
assumed: a fresh headless-browser load of a permalinked URL produced zero
console errors, warnings, or hydration-related messages.

**Screenshot- and interaction-verified**, not just compiled - rendered the
real home page and `/converter` (still fully live, pre-migration) via a
static build + headless browser, then drove it through actual pointer/
keyboard events (Playwright's `fill()`, not manual DOM mutation, which
turned out to matter - see below) to confirm: switching cities updates the
URL and the live Hijri readout instantly; opening "Koordinat kustom…"
reveals typeable lat/lon fields without disturbing the current place
until the user actually types; typing custom coordinates updates the URL
live; changing the date recomputes the Hijri equivalent with no submit
button, and 2024-03-11 correctly resolves to "30 Sya'ban 1445H" - the day
immediately before the engine's own documented anchor point (1 Ramadhan
1445H = 2024-03-12, `converter.ts`'s own comment), a real-world
correctness check that fell out of testing the UI rather than being
constructed for it. A first pass using `element.value = ...` plus a
manually dispatched `Event('input')` silently failed to trigger React's
change handling (a known gap in that approach, since React's controlled-
input tracking hooks the native property setter, not a bare dispatched
event) - worth recording since it looked exactly like a real product bug
(stale URL, stale Hijri label) until re-tested with genuine simulated
input.

**Transitional state, not a design intent**: mounting `ContextBar` in the
root layout makes it appear on every route immediately, including all
nine still-live pre-migration pages, each of which keeps its own separate
`LocationPicker`-based form for now (confirmed side-by-side on
`/converter`: both the new bar and the old form render correctly,
independently, with no layout regression). DESIGN.md's "delete every
per-page location form and submit button" (§4.3) is explicitly *not* done
in this step - that deletion belongs to each page's absorption into
`/hilal`, `/kalender`, `/langit` (§9.5-§9.7), where the page's internal
state gets rewired to read `useObservation()` instead of holding its own
copy. Doing that deletion now, before those routes exist, would strand
users on the pages that are still each route's only way to compute
anything.

**NavBar intentionally not touched.** §4.3's last line ("Nav is three
items. Delete the 'Analysis' dropdown.") describes the nav *after* `/hilal`,
`/kalender`, `/langit` exist - collapsing it now would point the header at
three routes that don't exist yet (they're built in steps 5-7), stranding
navigation on every still-live page in between. Deferred to whichever of
those steps makes the new nav's targets real, and flagged here so it isn't
mistaken for an oversight.

**Language**: new copy in `ContextBar` ("Lokasi saya", "Koordinat
kustom…") is Indonesian per DESIGN.md §7's decided direction, scoped with
its own `lang="id"` rather than flipping `<html lang>` - the document is
still overwhelmingly English (every existing page's own content) until
steps 5-8 rewrite it, and mislabeling the whole document would be worse
than a correctly-scoped mixed-language page.

Verified: `tsc --noEmit` clean, eslint clean, `next build`
(`STATIC_EXPORT=1`) succeeds, all 96 vitest tests pass (86 prior + 10 new),
and the provider/bar were checked via rendered screenshots and real
Playwright-driven interaction (city switch, custom coordinates,
geolocation button, live date recompute, permalink round-trip on fresh
load, console/hydration check) - not just compiled.

---

## Step 5 — executed

Scope, per §9.5: build `/hilal` with all three sweeps, absorbing
`/hilal-visibility`, `/visibility-map`, `/visibility-calendar`. The largest
step so far - built and screenshot-verified one sweep at a time (Petang
ini, then Setahun, then Se-Indonesia), each checked in a real browser
before moving to the next, matching the discipline steps 3-4 established.
The old three routes are untouched and still fully live; they become
redirect stubs to `/hilal` in step 9, not this one.

**Frozen-boundary extension, justified before making it:**
`lib/falak/grid.ts`'s `GridPoint` interface gained five fields
(`sun_altitude_deg`, `illumination_fraction`, `lag_time_minutes`,
`crescent_width_arcmin`, `moon_age_hours`) so the Se-Indonesia sweep's
hover-linked instrument (§6: "a cell is not a colour, it is a horizon")
has enough data to draw. Checked before editing, not after: the golden
vector suite's "visibility grid" tests assert against
`computeHilalObservation`/`verdictFor` directly, never `GridPoint`'s
shape, and `computeGridSlice` already computed all five fields internally
on every point - they were being discarded, not added. No new physics, no
edit to any validated function, confirmed by re-running the golden suite
before and after (34/34 both times). `grid.worker.ts` and `gridRunner.ts`
needed no changes - both pass `GridPoint` objects through wholesale via
`postMessage`/array-spread, never reconstructing them field-by-field.

**Flags resolved from earlier steps, by building the actual page:**
- *PageHeader placement* (flagged in step 0's migration plan): resolved by
  not using it on `/hilal` at all. DESIGN.md's own mockup for this page
  opens directly on the sweep selector, and the house rule ("the core
  object is the largest element on screen and the first thing rendered")
  contradicts an icon+title header above the instrument. A visually-hidden
  `<h1>` keeps a landmark for screen readers.
- *TrajectoryChart's replacement* (flagged as unresolved in the original
  migration plan): resolved as a plain `<details>`-wrapped table of the
  same trajectory samples, no chart. DESIGN.md's own phrase for this page -
  "derivation detail in a disclosure" - names the replacement directly:
  the chart is deleted per §8, the data survives as the accessible table
  form it already had (Recharts was never the only place this data lived).

**Two real, previously-invisible bugs found only by rendering and
interacting with the page, not by review:**

1. **Every Tailwind opacity modifier (`bg-x/10`, `fill-x/85`, ...) against
   any of the five custom colour tokens (`surface`, `border`, `ink`,
   `accent`, `verdict`) was silently generating no CSS rule at all**, back
   to step 1. Tailwind v3 can only synthesize an opacity variant from a
   colour it can decompose into channels - a literal hex, or an
   `rgb(var(--x) / <alpha-value>)` triple - and every one of these tokens
   was defined as a bare `"var(--token)"` string, which is opaque to it.
   The Se-Indonesia grid rendering as solid black instead of a translucent
   tint is what surfaced it; confirmed at the compiled-CSS level
   (`.bg-accent-solid{...}` existed, `.bg-accent-solid\/10{...}` did not)
   before concluding it was systemic rather than a one-off. Fixed at the
   source: `tailwind.config.ts`'s five custom colour groups now resolve
   through a `withOpacity()` helper that returns a `color-mix()` expression
   when a modifier is present and the plain `var()` otherwise, so every
   existing and future `/NN` usage against these tokens is corrected by
   one change, not by hunting down each call site. `color-mix()` was
   already load-bearing elsewhere in this codebase (`.glass-card`), so this
   isn't a new browser-support bar for the project. Every dark/light
   screenshot taken in steps 1-4 happened not to exercise a case where the
   missing rule was visually obvious (a missing translucent tint reads as
   "slightly less soft," not "broken") - this is logged so it's clear the
   bug predates step 5, not introduced by it.
2. **SVG `fill="transparent"` hit-rects were not receiving pointer events
   at all** in the rendered browser (confirmed via
   `document.elementFromPoint` at the exact hovered coordinate returning a
   different element underneath, not the hit-rect) - the Se-Indonesia
   grid's hover tooltip and linked instrument silently did nothing.
   Fixed with an explicit `pointerEvents="all"` on the hit-rects. A related
   second cause: the coastline stroke `<path>`s drawn after the data grid
   (intentionally, so they read over a fully-"visible" evening) had
   `pointerEvents="none"` set on their parent `<g>` only, which did not
   reliably inherit to the children in testing - fixed by setting it on
   each `<path>` directly. **This same `fill="transparent"` pattern exists
   unmodified in the old, still-live `/visibility-map` page** (never
   touched by this migration) - meaning its hover tooltip has likely been
   silently non-functional since before this migration started. Left
   alone there (out of scope, frozen until its own redirect-stub step),
   but recorded here since it's a real, pre-existing product bug this
   session happened to uncover, not one it introduced.

**A third bug, in the instrument itself, found by rendering `/hilal` with
a realistic date** (not the arbitrary fixture-only cases step 3's preview
used): the crescent-visibility perceptual-compression work from step 3
was correct, but two geometry clamps step 3 added defensively were never
exercised by *this* step's real data until now - both held up under
`/hilal`'s actual observation range without further changes needed.

**Two components upgraded globally, not forked**, because DESIGN.md's own
directives for them aren't scoped to new pages only, and forking would
have meant maintaining two versions of the same information:
- `HisabDisclaimer` fully rewritten per §7 ("one quiet line with a
  disclosure, not a bordered amber box") and translated to Indonesian -
  every one of its 7 existing call sites, including all six still-live
  pre-migration pages, picked up the quieter style and the new language
  automatically. Confirmed side-by-side on `/visibility-map`: renders
  correctly, no regression.
- `verdictLabels.ts` translated to Indonesian (Terpenuhi/Belum
  terpenuhi/Terlihat/etc). Unlike the longer explanatory prose deferred
  below, this is a short, unambiguous lookup table with low
  mistranslation risk, and it sits in the single most visible spot on
  every criteria comparison (the badges) - not translating it would have
  shipped mixed-language badges on a page built to be read in Indonesian.
- `Badge`, `Button`, `Card`, `Field`, `Select`, `Table`, `CitationList`,
  `CriterionHistory`, `ErrorBanner` restyled onto the new tokens (copy
  unchanged) for the same reason: `/hilal` depends on all of them, and a
  forked "new" copy of each would have been the actual scope violation.
  `ErrorBanner` now uses `verdict-dark` rather than a hardcoded red - the
  maghrib palette has no dedicated error hue, and "the calculation could
  not establish an answer" is, in this app's own terms, already what
  `verdict-dark` means.

**Deliberately deferred, not forgotten** (consistent with the scope
boundary set in step 3's flags): the longer explanatory prose inside
`CriterionHistory`, `CitationList`'s citation notes, and `PetangIni`'s own
per-criterion "why" paragraphs stay in English for now. These are nuanced
technical/religious content where a rushed mechanical translation carries
real mistranslation risk this session isn't positioned to guarantee
against - unlike the short structural copy (headings, verdict sentences,
button labels) and the short lookup tables (`HisabDisclaimer`,
`verdictLabels.ts`) translated above, which carry much lower risk per
word. `/hilal` is genuinely mixed-language as shipped in this step;
flagged here rather than hidden.

**Mobile-width bug caught by the explicit 375px check DESIGN.md's
migration order requires after this step**: the full-size instrument on
"Petang ini" was still constrained by `<main>`'s own `px-4` page padding,
not full-bleed edge-to-edge as §5.1 requires on mobile ("it should not
sit inside a card with 16px of padding around it"). Fixed with
`-mx-4 sm:mx-0` on its wrapper, breaking it out of the page padding only
below the `sm` breakpoint. Found by rendering at 375px, not by reading the
class list.

Verified: `tsc --noEmit` clean, `eslint` clean across the full `src/`
tree (not just touched files), `next build` (`STATIC_EXPORT=1`) succeeds
for all 19 routes, all 98 vitest tests pass unchanged, and every one of
the three sweeps was checked via rendered screenshots in light and dark
mode, real Playwright-driven interaction (tab switching, the Se-Indonesia
compute trigger and its ~3,255-point Web Worker sweep run to completion,
grid hover, method selection), and a 375px mobile pass across all three
sweeps - not just compiled.

---

## Step 6 — executed

Scope, per §9.6: build `BoundaryRibbon`, then `/kalender`, absorbing
`/converter`, `/hijri-archive`, `/isbat-accuracy`. Same standalone-first
discipline as steps 3 and 5: a pure geometry module, tested; a component,
screenshot-verified with real engine data against a temporary preview
route; then the page.

**Design reading, stated explicitly since DESIGN.md's prose leaves the
exact mechanism open:** §5.2 describes lanes that "merge into one solid
band" or "visibly split, offset by the number of days". Implemented as one
mechanism, not two code paths: each boundary's per-lane ticks are always
connected by a single polyline; when every resolved tick shares the same
x-position the polyline is trivially straight (drawn thicker, solid,
accent-coloured - reads as "merged"), and when they differ it zigzags
(thinner, dashed, verdict-margin/nila-coloured - reads as "split"). One
element, two readings, driven entirely by the same offset data
`fetchHijriYearArchive` already computes - no separate "is this merged"
branch to keep in sync with the geometry.

**A design decision DESIGN.md leaves implicit, made explicit here:**
clicking a boundary needs an actual Gregorian date to link to, but the
geometry module only carries relative day-*offsets* (deliberately - that's
all layout needs). `BoundaryPoint` carries one additional field,
`mabimsStartDate`, threaded through for the link only and never read by
any layout math, so the "pure offsets" property of the geometry itself
still holds.

**Click targets are plain HTML `<Link>`s below the SVG, not inside it** -
a deliberate choice made *because of*, not despite, step 5's
`fill="transparent"`/pointer-events lesson: an SVG-native click target
around each cluster would need its own hit-testing story, and having just
paid down that exact class of bug once this step doesn't reopen it.
Twelve real, keyboard-reachable links are simpler and carry no such risk.
Verified end-to-end, not just as a plausible href: a preview-harness click
correctly landed on `/hilal`'s "Petang ini" showing the exact right
evening, place, and date - confirming `?lat=&lon=&d=` written by
`BoundaryRibbon` and read by `ObservationProvider` (step 4) agree on
their contract without any new code linking the two pages together.

**DerivationTrace rewritten, not just restyled, per DESIGN.md's explicit
instruction** ("each search step numbered, the failing condition in
`--verdict-dark`, the passing one in `--verdict-lit`"): numbered step
badges, and the step's own explanatory sentence (not just an icon) now
carries the verdict colour. Still used unchanged by the old, still-live
`/converter` page - upgraded globally, same reasoning as `HisabDisclaimer`
and `verdictLabels.ts` in step 5.

**DESIGN.md's "conversion control" turned out to need no new input at
all.** Re-reading §6 against what §4.3 already built: the context bar's
existing date field, with its live Hijri readout, *is* the conversion
control - re-implementing it on `/kalender` would have duplicated state
that migration step 4 already centralised. What `/kalender` adds is
reading the *structured* result of that same conversion (`hijri.month`,
not just its formatted label) to drive `BoundaryRibbon`'s highlight -
`ObservationProvider`'s `hijri` field gained `year`/`month`/`day` fields
alongside the existing formatted `label`, additive and non-breaking.
Confirmed live: typing a date in the context bar visibly moves which
ribbon segment is highlighted, with no page-specific date input anywhere
on `/kalender`.

**Resolved a question MIGRATION.md left open** (flag #6, "whether the
ribbon recomputes its full 12-month sweep on every place/date-context
change... is undecided"): `fetchHijriYearArchive`'s 36 month-start
searches auto-compute with a visible progress readout on year/place
change, the same pattern already validated for the lighter 12-single-
evening `Setahun` sweep in step 5 - not gated behind an explicit trigger
like the Indonesia sweep, which needs one specifically because it's
Web-Worker-sharded; this one isn't and runs main-thread with yields, same
as `Setahun` and the same as the old `/hijri-archive` page it replaces.

**Screenshot-verified, including a real cross-page interaction**, not
just individually: the full `/kalender` page rendered correctly in light
and dark mode with real data (Jakarta, evening of 2024-03-11); the
month x method table and isbat comparison both correctly ported from the
old pages' logic (kept, per §5.2's explicit "do not delete it") with
Indonesian labels and restyled tokens; the `DerivationTrace` disclosure
opens to show the numbered, colour-coded steps; and the 375px mobile pass
confirmed no crashes or broken layout, though it surfaced a minor,
non-blocking cosmetic redundancy - the SVG's own bottom month labels and
the separate HTML link row beneath it both show month abbreviations,
which crowd together at 375px. Left as a follow-up polish item, not fixed
in this step: functionally both rows work (the SVG labels are decorative,
the link row is the real interactive target), and the fix (suppressing
the SVG's own text at narrow widths) is cosmetic, not structural.

Verified: `tsc --noEmit` clean, `eslint` clean across the full `src/`
tree, `next build` (`STATIC_EXPORT=1`) succeeds for all 20 routes, all
106 vitest tests pass (98 prior + 8 new), and `BoundaryRibbon` was
checked via rendered screenshots (light/dark) against three real years of
engine output (1445-1447H, the years with seeded isbat records) before
being wired into `/kalender`, plus a real click-through from a ribbon
boundary to `/hilal` and a 375px mobile pass of the finished page.

---

## Step 7 — executed

Scope, per §9.7: build `DayArc`, then `/langit`, absorbing `/prayer-times`
and `/qibla`. Same standalone-first discipline as every prior signature
component - and the step that found the two most consequential bugs in
this whole migration, both only visible by actually rendering and
interacting with real output, never from reading the code.

**Geometry, stated explicitly:** the arc's x-axis is time (real sun-
altitude samples via `solarPosition` + `altitudeDeg`, the same pair
`hilalTrajectory` already combines for a similar purpose near sunset, just
extended across a full day); the compass strip's x-axis is bearing.
DESIGN.md's "the qibla bearing is a line across the compass ring at the
base of the dome, sharing the same horizon" is read as a shared *baseline*,
not a shared *axis* - unifying two different coordinate systems into one
would misrepresent both. Fajr/Isha's depression zone and the merged/split
reading elsewhere in this migration follow the same "one data source, two
renderings" shape: one continuous altitude curve, styled solid above the
horizon and dashed/shaded below it, not two separately-constructed shapes.

**A frozen-boundary exposure, smaller than step 5's**: `prayerTimes.ts`'s
`asrTargetAltitudeDeg` changed from module-private to exported - one
keyword, no logic touched - so DayArc can label Asr's defining angle with
the exact value `dailyPrayerTimes` already computed internally, rather
than re-deriving the same formula a second time outside the tested module.
Confirmed the golden-vector suite exercises `dailyPrayerTimes`/
`solarTransit`/`CONVENTIONS` only, never this function directly, so the
export pins nothing new (34/34 before and after).

**Bug 1 - a real, general hydration risk, not specific to this
component.** A first version of the preview harness called
`buildDayArcInput`/`qiblaDirection` synchronously in the render body -
reasonable-looking, since both are plain synchronous functions, unlike
every fetchXxx-shaped flow elsewhere in this app. That ran the computation
during static-export prerendering (Node.js) AND again during client
hydration (the browser's engine), and confirmed via the dev server's
unminified error output: `Math.sin`/`cos`/`atan2` are not guaranteed
bit-identical across JS engines (ECMA-262 leaves their precision
implementation-defined), and the drift was large enough to shift which
side of a bisection search `dailyPrayerTimes` landed on - not just
last-bit pixel noise. Fixed two ways: `dayArcGeometry.ts`'s coordinate
outputs are now rounded to 2dp at the module boundary (defensive, cheap,
and correct regardless of cause - a chart doesn't need 16-digit pixel
precision), and, more importantly, the preview harness itself was moved
onto the `useEffect`-gated pattern every other data flow in this app
(PetangIni, SeIndonesia, Setahun, /kalender) already uses - not because
that pattern was previously understood to prevent this, but because it
turns out to, and now is documented as why. `instrumentGeometry.ts` uses
the same class of transcendental math (`Math.acos`/`sqrt` in the crescent
bisection) and was not audited for this in this pass - flagged, not fixed,
since nothing currently renders it synchronously at build time.

**Bug 2 - a real, currently-live defect in the frozen engine**, found by
rendering four real cities and seeing two of them render as a solid,
nonsensical block instead of a dome. Traced to `lib/falak/horizon.ts`'s
`findHorizonCrossing`: its 36-hour search window can contain two
same-direction horizon crossings (today's and tomorrow's), and the
`mod(_, 24)` distance-to-target-local-hour comparison it uses to pick
between them doesn't distinguish which calendar day either candidate is
actually on - confirmed directly (Banda Aceh, 5.5483/95.3238,
2026-06-15, Kemenag RI: `dailyPrayerTimes` returns fajr at 2026-06-16
05:00 local, a full day after sunrise/dhuhr/asr/maghrib/isha, which all
land correctly on 2026-06-15). This is a defect in code the currently-
live `/prayer-times` page already calls - discovered as a side effect of
this step, not introduced by it, and `lib/falak/**` is frozen for this
work: the actual fix (correcting the disambiguation logic, then
regenerating the golden-vector suite through the backend pipeline) is out
of scope here and belongs to a separate workstream. Per CLAUDE.md's
no-silent-fallback rule, `dayArcData.ts` now validates every prayer
instant sits within a plausible span of dhuhr before building the chart,
and throws an explicit, specific error instead of plotting a mis-dated
value - covered by a regression test (`dayArcData.test.ts`) using the
exact real coordinates and date that exposed it, not a synthetic case.
**This should be surfaced to whoever owns the backend astronomy engine -
it is a real accuracy defect in a religious-calendar tool, not a
migration-scope nicety.**

**DESIGN.md's "conversion control"-style reuse, again**: the daily
readout row and DayArc's plotted markers are both built from the *same*
`buildDayArcInput` call, not two separate computations that could drift -
matching the same "one source, multiple views" discipline as
`/kalender`'s conversion line and `BoundaryRibbon`'s highlight.

Verified: `tsc --noEmit` clean, `eslint` clean across the full `src/`
tree, `next build` (`STATIC_EXPORT=1`) succeeds for all 21 routes, all
117 vitest tests pass (106 prior + 11 new: 9 geometry + 2 regression),
`DayArc` checked via rendered screenshots (light/dark) against four real
cities before being wired in (two of which correctly show an explicit
error rather than a broken chart, confirming the guard works both ways),
and the finished `/langit` page verified with real data end to end
(daily readout, monthly table load, qibla bearing/distance, Rashdul
Qibla) plus a 375px mobile pass confirming the arc goes properly
full-bleed there, same fix pattern as step 5's `HorizonInstrument`.

---

## Step 8 — executed

Scope, per §9.8: rebuild `/` as the live instrument. Smaller than steps
5-7 - no new signature component, entirely reuse of `HorizonInstrument`
(step 3) and `ObservationProvider` (step 4) - but the step where the
"one instrument, asked three questions" thesis actually becomes visible
on the page most visitors land on first.

**Two small hooks extracted, not duplicated**, once home gave the app a
second real call site for logic that previously had exactly one:
- `useHilalVisibility(dateIso, lat, lon)` - the same place+date ->
  single-evening fetch `PetangIni` already had inline, now shared so the
  two pages' error handling/cancellation can't quietly diverge.
- `useFirstEntranceAnimation()` - DESIGN.md §3.3's "on first load of any
  page, the sky settles... once per session" reveal.
  `HorizonInstrument`'s `animateEntrance` prop existed since step 3 but
  was never actually driven by anything until now. Deliberately shared
  with `PetangIni`, not home-only: a permalink can land a visitor on
  `/hilal` before they ever see `/`, and the orchestrated moment belongs
  to whichever page is first in the session, not to home specifically.
  Uses `sessionStorage` rather than a module-level flag, since each
  route in a static export is its own HTML document and a module
  variable would reset on every navigation. Verified directly, not
  assumed: a real browser session shows the flag set after home loads
  and unchanged (animation correctly suppressed) after navigating to
  `/hilal`.

**The four-value readout DESIGN.md's mockup shows separately from the
instrument turned out to already exist** - `HorizonInstrument`'s own
`<dl>` (altitude/elongation/moon age/lag, `showReadout`'s default) is
exactly that row. No second readout built; the mockup's apparent
separation is just how the drawing already lays itself out.

**Verdict color, not verdict word, carries the headline** on home,
matching DESIGN.md's own mockup text precisely (down to the degrees-and-
minutes altitude format, "12°12'" not "12.2°") - the sentence states the
altitude and lets `--verdict-lit`/plain colour on that number carry
visible-vs-not, with the full verdict one click away via "Lihat
perhitungan lengkap". Home does not restate the criteria comparison,
`CriterionHistory`, or the derivation trace - all reachable from `/hilal`,
which is the point of the three plain-text links replacing the deleted
feature grid.

**`SampleResult` deleted** per §8, confirmed to have exactly one call
site (the old hero) before removal - the home page now shows real
computed data, so a fictional example is no longer needed and would be a
liability on a tool whose whole claim is verifiability, per DESIGN.md's
own reasoning.

Verified: `tsc --noEmit` clean, `eslint` clean across the full `src/`
tree, `next build` (`STATIC_EXPORT=1`) succeeds for all 21 routes (home's
own bundle dropped from the old hero+feature-grid+`SampleResult` weight
to 2.54kB), all 117 vitest tests pass unchanged (no new geometry to
test - this step is composition, not a new drawing), and the finished
page checked via rendered screenshots (light/dark), a 375px mobile pass
confirming the full-bleed instrument fix from step 5 carries over
correctly, and a real two-page browser session confirming the once-per-
session animation gate actually gates.

## Step 9 — executed

Redirect stubs for all nine retired routes (`/converter`,
`/hilal-visibility`, `/visibility-map`, `/visibility-calendar`,
`/hijri-archive`, `/isbat-accuracy`, `/prayer-times`, `/qibla`), plus
re-pointing the existing `/method-divergence` stub (previously
`→ /hijri-archive`, itself now retired) straight at `/kalender` so no
redirect chain ever exists even transiently.

**Query params preserved means intent preserved, not names forwarded.**
`ObservationProvider`'s `lat`/`lon`/`d` contract doesn't match any old
route's own param names (`date`, `year`, `hijri_year`, `method`,
`convention`, `direction`, `hijri_month`, `hijri_day`) - a naive
pass-through would land every old permalink on today's default instead
of the date/place it actually linked to. `lib/legacyRedirects.ts` holds
the shared translation helpers (`hijriYearToGregorianDate` - one read of
the frozen engine's already-validated `hijriToGregorian`, `legacyLatLon`,
`buildSearch`); each stub's `page.tsx` has its own small
`resolveSearch(params)` matching its old route's actual shape. `/hilal`
and `/langit` gained a one-time `useEffect` reading `?sweep=`/`?method=`
and `?convention=` respectively via the existing `lib/permalink.ts`, so
a redirect can land a reader on the right tab/convention rather than
always the default.

**A real bug, found the same way as every other one this migration
turned up - by driving an actual browser, not by reading the diff.**
The first `RedirectStub` implementation used `next/navigation`'s
`router.replace()`. Playwright confirmed all nine stubs never actually
navigated: every one settled back on its OWN old path, with the query
string rewritten to `ObservationProvider`'s own default params (today's
date, a default city) instead of the translated ones. Root cause:
`ObservationProvider` is mounted in the root layout, so it runs on every
route including these stubs; its post-hydrate effect calls
`writeQueryParams` → `window.history.replaceState` directly against
`window.location.pathname` at the moment it fires. That effect runs one
render cycle after `RedirectStub`'s own effect (gated behind its own
`hydrated` flag), and by then `router.replace()`'s client-side transition
had not yet finished swapping `window.location.pathname` - so
`ObservationProvider` read the OLD path, wrote a new query string onto
it, and `router.replace()`'s pending transition never recovered. Fixed
by switching `RedirectStub` to `window.location.replace()`, a real
browser navigation no other component's effect can race or overwrite.
Re-verified with Playwright across all nine translation cases: correct
destination path, correct translated `d`/`lat`/`lon`/`sweep`/`method`/
`convention`, no console errors, no hydration warnings.

**Known, pre-existing characteristic, not a step-9 regression, flagged
not fixed:** once landed on `/hilal` or `/langit`, `ObservationProvider`'s
own URL-sync effect normalizes the address bar down to its own
`lat`/`lon`/`d`/`tz` shape, dropping any `sweep`/`method`/`convention`
param that isn't part of its model - a characteristic of the URL-sync
built in step 4, not something step 9 introduced. Functionally harmless:
`/hilal`'s and `/langit`'s own param-reading effects run one render cycle
earlier (child effects fire before the ancestor `ObservationProvider`'s),
so the right tab/convention is already applied to React state before the
address bar gets normalized - confirmed via Playwright (correct tab
active, correct data rendered, screenshot checked). The only cost is that
re-copying the URL from the address bar after landing won't carry
`sweep`/`method`/`convention` forward a second time. Worth a follow-up if
"share this exact view" permalinks for those three params matter beyond
what step 9 needed (a working one-time redirect), but out of this step's
scope.

`routes.ts`'s `ALL_PATHS` (sitemap) was left unchanged - the nine stubs
follow the same precedent `/method-divergence` already set: retired
routes are never listed for indexing (`layout.tsx` sets
`robots: {index: false, follow: true}` and a `canonical` pointing at the
new route on all nine), only the live IA appears in the sitemap.

Verified: `tsc --noEmit` clean, `eslint` clean, all 117 vitest tests pass
unchanged, `next build` (`STATIC_EXPORT=1`) succeeds for all 21 routes,
and all nine redirects re-verified end-to-end with Playwright after the
`window.location.replace()` fix - correct destination, correct
translated params, no console errors.
