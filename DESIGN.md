# DESIGN.md — Falak (v2)

Design specification for what the user sees and how the app is organised.
`PRD.md` governs *what* is computed; `CLAUDE.md` governs the engine rules and
always wins on anything it marks non-negotiable. Where this file and an
implementation detail disagree, this file wins.

v2 replaces v1's information architecture (§4), palette (§3.1) and typeface
set (§3.2). v1's portable house layer (§2) and its signature-drawing idea
survive. `MIGRATION.md` records how v1 was reached and is now historical.

---

## 0. The thesis

**Falak is organised around the moments people open it, not around how the
engine works.**

People arrive with three questions, at very different frequencies:

| Moment | Question | Frequency | Destination |
|---|---|---|---|
| Every day, five times | When is the next prayer, and which way do I face? | daily | Hari ini, Salat, Kiblat |
| A few evenings a year | When does the month start, and will the criteria agree? | seasonal | Awal Bulan, Kalender |
| When teaching or explaining | Why is the answer what it is? | deep | Belajar |

Frequency decides prominence. The daily answer is readable on a phone in under
a second; the seasonal answer is two taps from anywhere; the explanation is
one tap from every verdict.

v1's insight still holds inside the engine: hilal visibility, the Indonesia
map and the twelve-month view are one computation swept along three
dimensions. That idea now lives *inside* Awal Bulan as its three views. It no
longer names the navigation.

The register is calm, precise and devotional — a well-made instrument about
the sky, not a telemetry dashboard and not a landing page.

---

## 1. Decisions — do not relitigate without updating this file

1. Five destinations plus a learning space (§4.1). Bottom tab bar on phones.
2. Place is global (a chip in the header). Date is owned by the page that
   needs it: Hari ini is always *now*, Salat steps by day, Kalender by month,
   Awal Bulan by Hijri month.
3. Palette: **Malam** (dark) and **Fajar** (light). The theme follows the
   operating system by default; a three-state control (Sistem / Terang /
   Gelap) overrides it.
4. Sky drawings use a fixed sky palette in both themes (§3.1) — the sky at
   maghrib is dusk-coloured whatever the page theme is.
5. Sun and Moon have one colour each, everywhere, forever (§3.1).
6. Interface language is Indonesian (`<html lang="id">`). Code, comments and
   this file stay in English.
7. All data drawing is hand-written SVG driven by engine output. No chart
   library.
8. Each criterion names who uses it, worded to the evidence in
   `lib/falak/citations.ts` (§7.3).

---

## 2. House layer — portable across the portfolio

Deliberately free of colour and typeface; copy verbatim into other projects.

### 2.1 Core-object dominance
Every app has one core object. In Falak it is the sky at a horizon. The core
object is the largest element on the screen and is rendered first. A page that
can be described as "a form that produces a result card" is wrong.

### 2.2 Spacing rhythm
One 4px-based scale (`--space-1`…`--space-10` → `s1`…`s10`). Between major
sections `--space-8`; within a section `--space-5`.

### 2.3 Type scale
16px body floor. `text-sm` *is* 16px in this codebase — nothing carrying prose
goes below it. `2xs`/`xs` exist for labels and dense tabular figures only.

### 2.4 Motion timing
`--duration-fast` 120ms (state), `--duration-base` 240ms (entrances),
`--duration-slow` 900ms (one orchestrated moment per app). Entrances ease
`cubic-bezier(0.22, 0.61, 0.36, 1)`. `MotionConfig reducedMotion="user"` and
the `prefers-reduced-motion` CSS blocks stay.

### 2.5 Quality floor
- One global `:focus-visible` rule: 2px accent ring, 2px offset.
- A theme control exists and the OS preference is the default.
- Every colour that encodes meaning has a second cue: icon, shape, word, or
  position.
- Every drawing has a keyboard- and screen-reader-reachable equivalent (a real
  `<dl>` or `<table>`).
- Every colour comes from a token. The one documented exception is the sky
  palette (§3.1), which is itself a set of tokens that do not vary by theme.

---

## 3. Falak identity

### 3.1 Palette

**Malam** (dark) — the sky after isya. **Fajar** (light) — a cool dawn, not
beige paper, so it reads crisply in daylight and on a projector.

Role tokens live in `globals.css`; components only ever use role tokens.

| Role | Fajar | Malam |
|---|---|---|
| `--surface-page` | `#F4F5FA` | `#0B0D1F` |
| `--surface-card` | `#FFFFFF` | `#131631` |
| `--surface-raised` | `#ECEEF6` | `#1B1F40` |
| `--border` | `#DDE0EE` | `#262B55` |
| `--text-body` | `#15183A` | `#ECEAF4` |
| `--text-muted` | `#555A7C` | `#A3A6CB` |
| `--accent-text` | `#A34A12` | `#F4A259` |
| `--accent-solid` | `#B4531A` | `#F4A259` |
| `--accent-on-solid` | `#FFFFFF` | `#1A1330` |
| `--verdict-lit` | `#8A6400` | `#F6D78B` |
| `--verdict-margin` | `#5645C0` | `#A594F9` |
| `--verdict-dark` | `#5F6488` | `#8C90B8` |

Every text pair is measured at ≥ 4.5:1 against both page and card surfaces,
UI strokes at ≥ 3:1; the measured ratio is recorded beside each token. If a
pair fails, move its lightness, never its hue.

**Celestial identity.** `--sun` is ember (`#F4A259` in both themes on sky
drawings; `#C4611C` where it sits on a light surface). `--moon` is pearl
(`#F3E9CF`). The sun is never purple, the moon is never brown, in any view.

**Verdicts are warm, twilight, or cool** — lit (gold) = criterion met /
terlihat, margin (violet) = marginal / needs optical aid, dark (slate) = not
met. Always paired with an icon shape (filled disc + check, half disc, dashed
ring) and the word.

**The sky palette** (`--sky-*`, identical in both themes): `--sky-zenith
#0B0D1F`, `--sky-high #2A2350`, `--sky-low #7A4A6B`, `--sky-horizon #E0875A`,
`--sky-ground #07081A`, `--sky-ink #EEECF6`. Sky drawings may recompute their
gradient from the Sun's real depression angle (bright dusk at sunset, deep
night past −12°). This is the one gradient family in the app.

### 3.2 Typography

| Role | Family | Use |
|---|---|---|
| Interface & numbers | **Plus Jakarta Sans** (variable 400–800) | Everything by default, including large answer numerals (tabular) |
| Reading voice | **Newsreader** | Verdict sentences, the Hijri date on Hari ini, Belajar body text |
| Arabic | **Amiri** (Arabic subset) | Hijri month names beside their Latin form, decorative only, `lang="ar" dir="rtl"` |
| Data | **IBM Plex Mono** | Raw engine values inside "Lihat perhitungan" only |

Plus Jakarta Sans was drawn by Tokotype, an Indonesian foundry, for Jakarta's
city identity. All four families are self-hosted via `next/font/local`. No
network font requests.

### 3.3 Shape and depth
Radius: 12px controls, 20px cards, 28px hero panels, full pills for chips.
Depth in Malam comes from surface luminance, not shadows. In Fajar, cards get
one soft shadow. Cards are used by role, not by default — a page is not a
stack of identical boxes.

### 3.4 Motion
- **One orchestrated moment:** the sky settles on first load (gradient fades
  up, horizon draws, bodies rise). 900ms, once per session.
- **Sunset scrub** on Awal Bulan: drag from sunset to moonset using the
  engine's trajectory samples; the sky darkens by the real solar depression.
- **Living now:** countdowns and the "now" marker update every 60s.
- **Stars** appear only when the drawn Sun is below −6° (the decoration is
  itself true).
- **Never** animate a computed number through values the engine did not
  produce (no count-ups). Values cross-fade.
- Everything renders at rest under `prefers-reduced-motion`.

---

## 4. Information architecture

### 4.1 Routes

| Route | Nav label | Answers | Absorbs |
|---|---|---|---|
| `/` | Hari ini | What does today look like, and what's next? | v1 home |
| `/salat` | Salat | Prayer times for a day, and for a month | `/langit` (times), `/prayer-times` |
| `/kiblat` | Kiblat | Which way, how far, and how to check with the Sun | `/langit` (qibla), `/qibla` |
| `/awal-bulan` | Awal Bulan | When does a Hijri month start, per criterion, and why? | `/hilal`, `/hilal-visibility`, `/visibility-map`, `/visibility-calendar` |
| `/kalender` | Kalender | A real calendar with both dates, holidays, conversion | `/kalender` v1, `/converter`, `/hijri-archive`, `/isbat-accuracy`, `/method-divergence` |
| `/belajar` | Belajar | Definitions, the criteria explained, how the engine is validated | explanatory prose formerly inside tool pages |

Every retired path keeps a static redirect stub that preserves intent
(place, date, view, method). Existing permalinks must not break.

### 4.2 Navigation
- Desktop: header with logo, five tabs, place chip, Belajar link, theme control.
- Phone (< md): slim header (logo, place chip, theme control) and a fixed
  bottom tab bar with the five destinations, icon + label, safe-area aware.
  Belajar is in the header menu and the footer.

### 4.3 Three layers of depth
Every computed answer is presented in three layers:
1. **Jawaban** — one sentence and one date or time, large. Always visible.
2. **Bukti** — the drawing and its numbers, hover/focus-linked. One glance
   down. This is CLAUDE.md's inspectability rule and it stays on the page.
3. **Pelajaran** — why the rule exists, who uses it, citations, model limits.
   In Belajar, linked with "Kenapa?" from the verdict.

---

## 5. Signature drawings

### 5.1 `HorizonInstrument`
The western horizon at sunset, driven by engine output: sky gradient from the
Sun's depression, ground silhouette, Sun (ember) below the horizon, Moon
(pearl) with a faint earthshine disc, glow, and an illuminated limb whose
thickness follows the illumination fraction through the documented perceptual
curve. Threshold bands labelled per criterion. Elongation and lag drawn and
labelled. The numeric readout is a real `<dl>` in Indonesian, linked to the
drawing on hover and focus. Supports a `minutesAfterSunset` prop driven by the
scrubber.

### 5.2 `SkyNow`
The whole sky right now as an east→west panorama (Hari ini): Sun and Moon at
their real altitude and azimuth, the Moon at its real phase, stars when dark.

### 5.3 `DayArc`
The Sun's path for a day with the six prayer moments at their defining
altitudes and a "now" marker. Fajr and Isya in the depression zone below the
horizon.

### 5.4 `QiblaCompass`
Compass rose, qibla needle, and — when the Sun is up — the Sun's azimuth and
the turn angle from the Sun to the qibla.

### 5.5 `IndonesiaMap`
Continuous altitude shading with 1° contour lines (the BMKG altitude-map
convention falak teachers already know), the criterion's threshold contour,
and met/not-met cells marked by shape as well as colour. Computed on entry
with a progress indicator; no compute button.

---

## 6. Page specifications

### `/` Hari ini
`SkyNow` hero → today's Hijri date (Newsreader, with Arabic month) and
Gregorian date → next prayer with countdown and the day's six times → next
month start with each criterion's date → Ramadan (or the next of Ramadan,
Syawal, Dzulhijjah) countdown → qibla bearing. The hisab disclaimer sits next
to the month-start cards.

### `/salat`
Date stepper (‹ today ›) → `DayArc` → the six times as one list with the next
prayer highlighted and a countdown when the date is today → convention and
its note → "Lihat perhitungan" → monthly jadwal imsakiyah table with print.

### `/kiblat`
`QiblaCompass` → bearing and distance → "Pakai matahari" guidance for the
current minute (face the Sun, turn N° left/right), or the reason it is
unavailable (Sun below the horizon) → Rashdul Qibla dates for the year, in
local time, with the declination instant under "Lihat perhitungan".

### `/awal-bulan`
Month chips (next month, then Ramadan, Syawal, Dzulhijjah of the relevant
year, and "bulan lain…") → the answer sentence → timeline (ijtimak → deciding
evening → day 1) → views: **Petang penentu** (instrument + scrubber + verdict
cards + readout), **Se-Indonesia** (`IndonesiaMap`), **Setahun** (twelve
mini instruments on each month's deciding evening). Criterion comparison,
CriterionHistory and model caveats below; trajectory table in a disclosure.

### `/kalender`
Month grid with Gregorian and Hijri day in every cell, day 1 of each Hijri
month highlighted, disagreeing criteria's day 1 hatched → converter (both
directions) → Islamic holidays for the Hijri year → year ribbon (twelve month
blocks, divergence dots, each linking to Awal Bulan) → month × criterion
table → isbat comparison → derivation trace.

### `/belajar`
Glossary; the three criteria (rule, why, who uses it, citations); how a month
start is decided; how the engine is validated (JPL DE440 cross-checks, golden
vectors); model limits; sources.

---

## 7. Language and copy

### 7.1 Rules
Sentence case. Name things by what the reader recognises. A button says what
happens. Errors say what happened and what to do, without apologising, in
Indonesian; a technical detail may follow in a disclosure. Empty states invite
an action.

### 7.2 The hisab disclaimer
Required near any month-start or Ramadan-related output (CLAUDE.md
non-negotiable). One quiet line with a disclosure: never a modal, toast or
dismissible banner. Not repeated in English in the footer.

### 7.3 Naming who uses each criterion
- MABIMS 2021 — "dipakai Kemenag RI (sidang isbat)". Sourced.
- Wujudul Hilal — "dikenal sebagai kriteria Muhammadiyah", always shown with
  the existing "rujukan belum diverifikasi" marker, and a note that
  Muhammadiyah has announced a move to the Kalender Hijriah Global Tunggal
  (KHGT), which Falak does not compute, with a pointer to Muhammadiyah's
  official maklumat. Update this wording only from a primary source.
- Odeh — "kriteria visibilitas astronomi (rujukan internasional)".

---

## 8. Do not

- Do not add a chart library.
- Do not use colour as the only carrier of a verdict.
- Do not soften an out-of-tolerance result into a friendly message; the
  no-silent-fallback rule outranks any tone goal here.
- Do not show a feature-card grid on the home page.
- Do not state an institution's practice without a source; mark it unsourced
  in the UI instead.
