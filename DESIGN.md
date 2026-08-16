# DESIGN.md — Falak

Design specification for the visual and structural rework. Read this in full
before changing any file. `PRD.md` still governs *what* is computed;
`CLAUDE.md` still governs the engine rules. This file governs *what the user
sees* and *how the app is organised*. Where this file and an existing
implementation detail disagree, this file wins — except on anything in
`CLAUDE.md` marked non-negotiable, which always wins.

---

## 0. The thesis

Falak is not nine calculators. It is **one instrument, asked three questions.**

Everything the engine computes is a projection of a single situation: where the
sun and moon sit relative to a horizon, at a place, at a moment. Hilal
visibility is that geometry at sunset. Prayer times are solar altitude
crossings across a day. Qibla is a bearing on the same horizon circle. Date
conversion is a sequence of sunset evaluations. The archive is twelve of them
in a row.

The current build hides that unity behind nine identical forms. Every route is
`PageHeader → HisabDisclaimer → form Card → submit → result Card`. The result
is an app that looks like a settings screen for astronomy, and the one thing
only a hisab tool can show — the geometry — is rendered as six numbers in a
stat grid.

**The redesign makes the instrument visible and turns the pages into questions
asked of it.**

The register is warm and devotional, not clinical. This is a tool people open
before Ramadan, in a mosque courtyard, on a phone. It should feel like a
well-set book about the sky, not a telemetry dashboard.

---

## 1. Decisions already made — do not relitigate

1. Nine routes collapse to three plus a home page (§4).
2. Location and date move out of the pages into one persistent context bar (§4.3).
3. Recharts is removed. All data drawing is hand-written SVG driven by engine
   output, so it inherits theme tokens by construction (§5).
4. The palette changes from night-navy/gold/teal to the maghrib palette (§3.1).
   Do not preserve the old tokens "for compatibility" — delete them.
5. Interface language becomes Indonesian (§7). English is a later phase.
6. The instrument (§5.1) is the app's single signature element. Everything else
   stays quiet. Do not add a second showpiece.

---

## 2. House layer — portable across the portfolio

This section is deliberately thin and is intended to be copied verbatim into
other projects. It contains **no colour and no typeface.** Those are always
per-project. What travels is rhythm, discipline, and the quality floor.

### 2.1 Core-object dominance

Every app has one core object — the thing the app exists to manipulate. In
Falak it is the sky at a horizon. The rule: **the core object is the largest
element on the screen and the first thing rendered.** Controls arrange around
it. If a page can be described as "a form that produces a result card," it is
wrong.

### 2.2 Spacing rhythm

A single 4px-based scale, exposed as CSS custom properties and as Tailwind
utilities. Falak already has this (`--space-1`…`--space-10` → `s1`…`s10`);
keep it exactly as is. Vertical rhythm between major page sections is always
`--space-8`; within a section, `--space-5`.

### 2.3 Type scale

Keep the existing scale and the 16px body floor. It is well judged. The only
change is which families fill it (§3.2).

### 2.4 Motion timing

- `--duration-fast: 120ms` — state changes (hover, toggle, focus)
- `--duration-base: 240ms` — element entrances, panel reveals
- `--duration-slow: 900ms` — reserved for the single orchestrated page-load
  moment, one per app, no more
- Easing: `cubic-bezier(0.22, 0.61, 0.36, 1)` for entrances, `ease` for state.
- `MotionConfig reducedMotion="user"` stays. The `prefers-reduced-motion` CSS
  blocks stay.

### 2.5 Quality floor — non-negotiable in every project

- One global `:focus-visible` rule in `globals.css`, applied to every
  interactive element, using a 2px ring in the accent colour with a 2px offset.
  The current codebase applies focus styling in exactly two places; this fixes
  that.
- A theme toggle exists. `darkMode` moves from `"media"` to `"class"`, with the
  OS preference as the initial value and the user's choice persisted.
- Every colour that encodes meaning is paired with a second cue: an icon, a
  shape, a word, or a position. Never colour alone.
- Every data drawing has a keyboard- and screen-reader-equivalent path to the
  same numbers. A visual that cannot be tabbed must be accompanied by a table
  that can.
- Every drawing is theme-token-driven. Zero hardcoded hex outside the token
  file, with one documented exception per project at most.

---

## 3. Falak identity

### 3.1 Palette — maghrib

The palette is the sky Falak is about: the twenty minutes after sunset. Warm at
the horizon, cool above. Light mode is the paper you read the calculation on
(the yellowish paper stock of a kitab); dark mode is the sky itself.

Define these as ramps in `globals.css`, then map role tokens onto them. Do not
use ramp values directly in components — always go through a role token.

```css
/* Ramps */
--senja-900: #1A1330;   /* deep dusk, page background at night */
--senja-800: #241B3C;
--senja-700: #33274F;
--senja-600: #4A3A5E;
--senja-500: #6B5680;

--ufuk-300:  #F6D3A3;   /* horizon ember — the accent family */
--ufuk-400:  #EFB477;
--ufuk-500:  #E8A05C;
--ufuk-600:  #C97F3D;
--ufuk-700:  #9B5E2A;

--kertas-50:  #FDFBF4;  /* paper */
--kertas-100: #FAF6EC;
--kertas-200: #F2EBDA;
--kertas-300: #E4D9C0;

--tinta-900: #2A2318;   /* warm ink, not black */
--tinta-600: #6A5F4E;

--nila-700: #2C5169;    /* indigo — secondary data series only */
--nila-600: #3E6E8E;
--nila-400: #6E8CAE;
```

Role tokens, light (paper):

```css
--surface-page:   var(--kertas-100);
--surface-card:   var(--kertas-50);
--border:         var(--kertas-300);
--text-body:      var(--tinta-900);
--text-muted:     var(--tinta-600);
--accent-text:    var(--ufuk-700);
--accent-solid:   var(--ufuk-500);
--accent-on-solid:var(--tinta-900);
--verdict-lit:    var(--ufuk-700);
--verdict-dark:   var(--senja-600);
--verdict-margin: var(--nila-600);
```

Role tokens, dark (maghrib):

```css
--surface-page:   var(--senja-900);
--surface-card:   var(--senja-800);
--border:         var(--senja-700);
--text-body:      var(--kertas-200);
--text-muted:     #A99BB8;
--accent-text:    var(--ufuk-400);
--accent-solid:   var(--ufuk-500);
--accent-on-solid:var(--senja-900);
--verdict-lit:    var(--ufuk-300);
--verdict-dark:   var(--senja-500);
--verdict-margin: var(--nila-400);
```

**Verdict colour is meaningful, not decorative.** Visible = warm and lit.
Not visible = cool and unlit. Marginal = indigo, the colour of the sky between
the two. This is truer to the subject than a green/red traffic light, and it
matches what the drawing itself shows. Always pair it with the word and the
icon — never colour alone.

Verify every pair against WCAG AA (4.5:1 body, 3:1 large text and UI strokes)
and adjust the *lightness* of the given hue if a pair fails. Do not substitute
a different hue.

**One gradient exists in the whole app**: the sky behind the horizon instrument,
running from `--senja-800` at the top to `--ufuk-500` at the horizon line in
dark mode, and from `--kertas-200` to `--ufuk-300` in light mode. Nowhere else.
Delete the existing `night-sky` hero gradient and the gradient headline span.

### 3.2 Typography

Geist goes. It is a neutral grotesk — the definition of a default — and it is
working against the warmth this app needs.

| Role | Family | Use |
|---|---|---|
| Display | **Newsreader** (variable, optical size) | Page titles, verdict sentences, pull quotes, the number that *is* the answer |
| Body / UI | **Be Vietnam Pro** (variable) | All interface text, labels, buttons, tables, body copy |
| Data | **IBM Plex Mono** | Coordinates, derivation traces, raw engine values only |

Rationale, so it is not undone later: Newsreader is a book face with real
optical sizing and true italics — it makes the app read like a set text rather
than a dashboard, which is exactly the devotional register. Be Vietnam Pro is a
humanist sans with proper Indonesian diacritic coverage and a softer skeleton
than any grotesk. Plex Mono is confined to genuinely tabular technical values;
the existing codebase applies `font-mono` broadly and falls through to the
system stack, which is a bug — fix it by narrowing the usage, not by aliasing
the whole app to a mono.

Self-host all three via `next/font/local` with Latin-subset variable `woff2`,
consistent with the project's no-runtime-dependency posture. No Google Fonts
network requests.

Numerals: prayer times, altitudes and elongations use
`font-variant-numeric: tabular-nums` in Be Vietnam Pro. Only the *headline*
number on a page — the one that is the answer — is set in Newsreader.

### 3.3 Motion — one orchestrated moment

On first load of any page, the sky settles: the gradient fades up, the horizon
line draws left to right, then the moon and sun rise into position. Total 900ms,
once per session, `--duration-slow`. Under `prefers-reduced-motion` the scene
appears at rest with an opacity fade only.

Everything else is `--duration-base` at most. Delete the pulsing glow loop on
`HilalMoon` and the staggered per-item list entrances — with a real drawing on
the page they read as fidget.

---

## 4. Information architecture

### 4.1 Routes

| New route | Replaces | Question it answers |
|---|---|---|
| `/` | `/` | What does the sky look like where I am, tonight? |
| `/hilal` | `/hilal-visibility`, `/visibility-map`, `/visibility-calendar` | Is the crescent visible? |
| `/kalender` | `/converter`, `/hijri-archive`, `/isbat-accuracy` | What date is it, and why? |
| `/langit` | `/prayer-times`, `/qibla` | Where is the sun, and which way is the Kaaba? |

All old paths keep a `page.tsx` that client-side redirects to the new route
with query params preserved, using the same pattern as the existing retired
`/method-divergence`, with `robots: { index: false }` and a canonical pointing
at the new path. Static hosting cannot issue a 302, so this is the mechanism.
Existing permalinks must not break.

### 4.2 The sweep principle

Hilal visibility, the Indonesia map, and the twelve-month calendar are not
three features. They are **one computation swept along three dimensions**:

- fix place, fix date → one evening's reading
- fix date, sweep place → the Indonesia grid
- fix place, sweep date → the twelve-month view

They therefore share one page, one code path, and one drawing that changes
form. The sweep selector is the primary control on `/hilal`. This is the single
most important structural idea in this document.

### 4.3 The context bar

A persistent bar sits directly below the nav on every route: **place** and
**date**.

```
┌──────────────────────────────────────────────────────────────┐
│  ◐ Falak      Hilal    Kalender    Langit            ☾ / ☀  │
├──────────────────────────────────────────────────────────────┤
│  📍 Balikpapan  ⌄        📅 16 Agustus 2026 · 2 Rabiulawal 1448│
└──────────────────────────────────────────────────────────────┘
```

- Place: the existing `LocationPicker` logic, lifted to a React context
  provider. City listbox, "Lokasi saya" geolocation, custom lat/lon.
- Date: Gregorian picker; the Hijri equivalent is displayed live beside it, not
  behind a submit button.
- State lives in the URL query string (`?lat=&lon=&tz=&d=`) so permalinks,
  copy-link and print all keep working, mirrored to `localStorage` for return
  visits.
- Changing place or date recomputes the current page immediately. **Delete
  every per-page location form and every submit button that only existed to
  gate a calculation.** Computation is fast and local; there is nothing to
  submit to.
- Exception: the Indonesia sweep on `/hilal` is expensive (~3,255 grid points,
  Web Workers). Keep an explicit "Hitung se-Indonesia" trigger for that sweep
  only, with the existing progress bar.

Nav is three items. Delete the "Analysis" dropdown.

---

## 5. Signature components

These three drawings are the design. Build them first; the pages are
arrangements around them.

### 5.1 `HorizonInstrument` — the signature

A wide schematic of the western horizon at sunset, driven directly by engine
output. Replaces the six-stat grid as the headline of `/hilal`, and is the hero
of `/`.

Elements, all as one inline SVG:

- Sky: the one gradient, warm at the horizon.
- Horizon line: 1px, `--text-body` at 60% opacity, spanning the drawing.
- Sun: a disc below the horizon line, dimmed, positioned at its true depression
  angle at the moment of evaluation.
- Moon: a crescent above the horizon, at true altitude and true azimuth offset
  from the sun, with the illuminated limb facing the sun and its **thickness
  drawn from the actual illumination fraction**. A 0.4% crescent must look like
  a 0.4% crescent.
- Threshold band: a shaded band from the horizon up to the active criterion's
  minimum altitude. Labelled. When comparing criteria, draw all three bands
  stacked with distinct hatching, not three separate cards.
- Elongation: a dashed arc between the sight lines to sun and moon, centred on
  the observer mark at the left.
- Lag time: a bracket along the horizon between the sun's set point and the
  moon's, labelled in minutes.

Interaction:

- Hovering or focusing a row in the numeric readout highlights the corresponding
  element in the drawing, and vice versa. This is what makes the verdict
  inspectable in the sense `CLAUDE.md` requires — the numbers and the geometry
  are the same object seen two ways.
- The drawing carries `role="img"` with a `<desc>` that states the verdict and
  the four governing numbers in a sentence.
- The numeric readout beside it is a real `<dl>`, fully keyboard accessible.

Scale: on desktop the instrument occupies the full content column and at least
40% of viewport height. On mobile it is full-bleed edge to edge — it is the
first thing on the page and it should not sit inside a card with 16px of
padding around it.

### 5.2 `BoundaryRibbon` — for `/kalender`

Twelve Hijri months laid left to right as a horizontal ribbon. Each method
(wujudul hilal, MABIMS 2021, Odeh) is a **lane** within the ribbon.

- Where methods agree on a month boundary, the lanes merge into one solid band.
- Where they disagree, the lanes visibly split, offset by the number of days
  they differ by. Divergence becomes a shape you see, not a table of badges you
  diff by eye.
- The sidang isbat outcome, where recorded, is a fourth marker lane — this is
  what `/isbat-accuracy` becomes.
- Clicking any boundary opens that evening on `/hilal`. This link between the
  two pages is the point: the ribbon shows *that* methods diverge, the
  instrument shows *why*.

The existing month × method table stays, below the ribbon, as the accessible
and printable equivalent. Do not delete it.

### 5.3 `DayArc` — for `/langit`

A half-dome showing the sun's path for the selected date at the selected place.

- The five prayer moments are the points where the sun crosses their defining
  altitudes; draw them on the arc, with the defining angle visible.
- Fajr and Isha sit below the horizon; draw the depression zone below the
  horizon line rather than pretending they are on the arc.
- The qibla bearing is a line across the compass ring at the base of the dome,
  sharing the same horizon. Prayer times and qibla are the same geometry — the
  drawing should make that obvious.
- Monthly jadwal imsakiyah remains a table. A table is the correct form for a
  month of times, and it prints. Improve its typography; do not visualise it.

---

## 6. Page specifications

### `/` — home

Kill the hero-and-feature-grid entirely. The home page is the instrument,
live, for the user's place, tonight, computed on load with a sensible default
location before geolocation resolves.

```
┌──────────────────────────────────────────────────────────────┐
│  context bar                                                 │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│         [ HorizonInstrument — full width, live ]             │
│                                                              │
│   Malam ini di Balikpapan, hilal berada 4°12' di atas        │
│   ufuk saat matahari terbenam.            ← Newsreader       │
│                                                              │
│   [ four-value readout: altitude · elongasi · umur · lag ]   │
│                                                              │
│   → Lihat perhitungan lengkap    → Kalender    → Langit      │
├──────────────────────────────────────────────────────────────┤
│  disclaimer, quiet, one line, expandable                     │
└──────────────────────────────────────────────────────────────┘
```

No feature cards. No CTAs pretending to be a landing page. The three links are
plain text links. Delete `SampleResult` — the page shows real computed data now,
so a fictional example is a liability on a tool whose whole claim is
verifiability.

### `/hilal`

Sweep selector at the top — three options, presented as what they are:

- **Petang ini** — one place, one evening. The instrument at full size,
  numeric readout, criteria comparison as stacked threshold bands, derivation
  detail in a disclosure.
- **Se-Indonesia** — one evening, every place. The existing D3 grid, restyled
  to the new palette, with the explicit compute trigger and progress bar. Add
  the instrument at reduced size beside it, showing the hovered cell's sky.
  That is the connection the current map is missing: a cell is not a colour, it
  is a horizon.
- **Setahun** — one place, twelve evenings. **Twelve miniature instruments in a
  grid**, not twelve cards of numbers. Each is the same drawing at ~120px wide.
  You scan twelve small skies and see instantly which months are marginal. This
  replaces `/visibility-calendar` and is worth building carefully.

`CriterionHistory`, `CitationList`, and the caveats disclosure all survive
unchanged in behaviour, restyled.

### `/kalender`

`BoundaryRibbon` at the top, at full width. Beneath it, in order: the
conversion control (inline, not a form card — typing a date scrolls the ribbon
and marks it), the month × method table, the isbat comparison, `DerivationTrace`
in a disclosure.

`DerivationTrace` is one of the best things in the current build and is
under-displayed. Give it its own section with real typographic hierarchy: each
search step numbered, the failing condition in `--verdict-dark`, the passing one
in `--verdict-lit`, values in Plex Mono.

### `/langit`

`DayArc` at the top. Below it, the daily prayer times as a single readout row —
not six separate cards, which is six containers for six numbers. Convention
selector and `ConventionNote` beneath. The monthly toggle swaps the readout for
the table and keeps the arc.

Rashdul Qibla keeps its own section at the bottom with its own year input.

---

## 7. Language and copy

**The interface becomes Indonesian.** The primary audience is Indonesian
Muslims; the domain vocabulary is already Indonesian (hilal, ijtimak, hisab,
rukyat, ufuk, sidang isbat); and "warmer and more human" for this audience
means Bahasa. Set `<html lang="id">`. Keep the code, comments, variable names
and this document in English.

Copy rules:

- Sentence case everywhere. No title case, no all caps.
- Name things by what the user recognises, not by how the system works:
  "Hitung se-Indonesia", not "Load grid".
- A button says what happens: "Hitung", and the result says "Dihitung".
- Errors state what happened and what to do, in the interface's voice, without
  apologising: "Tanggal di luar rentang efemeris (1900–2100). Pilih tanggal
  lain." Not "Maaf, terjadi kesalahan."
- Empty states invite an action rather than describing a void.
- The hisab disclaimer stays on every page that produces a month-start
  conclusion — this is a `CLAUDE.md` non-negotiable. But it is one quiet line
  with a disclosure, not a bordered amber box that competes with the drawing.
  Reduce its visual weight; do not reduce its presence.

---

## 8. Deletions

Removing these is part of the work, not a side effect:

- Recharts and `TrajectoryChart` (replaced by an SVG trajectory that shares the
  instrument's coordinate system and tokens)
- `SampleResult`
- The `night-sky` hero gradient and the gradient headline span
- The `HilalMoon` pulsing glow loop
- The "Analysis" nav dropdown
- Every per-page `LocationPicker` form and its submit button (except the
  Indonesia sweep trigger)
- All `night-*`, `gold-*`, `moon-*`, `land-*`, `lattice-*` Tailwind ramps once
  migration is complete
- The stale `create-next-app` boilerplate in `frontend/README.md` — replace it
  with a real description of the static-export deployment

---

## 9. Migration order

Do not start at the pages. Build the drawing first, then the shell, then move
the pages onto it.

1. **Tokens.** New palette and role tokens in `globals.css`; rewire
   `tailwind.config.ts`. `darkMode: "class"` plus a theme toggle. Global
   `:focus-visible` rule. Verify contrast pairs.
2. **Fonts.** Add the three families via `next/font/local`; map to
   `display` / `sans` / `mono`; narrow `font-mono` usage to genuinely technical
   values.
3. **`HorizonInstrument`.** Build standalone with fixture data from
   `__fixtures__/golden-vectors.json` before wiring it to anything. Get the
   crescent geometry, the threshold band, and the hover-linking right.
4. **Context provider and bar.** Lift place and date to a provider, wire to URL
   query params and `localStorage`, render the bar in the root layout.
5. **`/hilal`** with all three sweeps, absorbing the three old routes.
6. **`BoundaryRibbon`** and `/kalender`.
7. **`DayArc`** and `/langit`.
8. **`/`** rebuilt as the live instrument.
9. **Redirect stubs** for all nine old paths, query params preserved.
10. **Deletions** from §8, then a full pass for stray old token names.

After each of steps 5–8, check the page on a 375px viewport before moving on.
The instrument at mobile width is the hardest part of this design and finding
out late is expensive.

---

## 10. Do not

- Do not add a second signature element. One drawing carries the app.
- Do not reach for a chart library. Every visual here is engine output drawn
  directly; a chart library will fight the tokens and lose, which is exactly
  what happened with Recharts.
- Do not use colour as the only carrier of a verdict.
- Do not soften an out-of-tolerance result into a friendly message. The
  no-silent-fallback rule in `CLAUDE.md` outranks any tone goal in this file.
- Do not turn the hisab disclaimer into a modal, a toast, or a dismissible
  banner. Quiet and permanent, not loud and dismissible.
- Do not restore the feature-card grid on the home page under any framing.
