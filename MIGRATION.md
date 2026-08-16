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
