# PRD: Falak — Hijri Calendar & Islamic Astronomy Visualizer

## 1. Overview

**Falak** is a deterministic, astronomically-grounded platform for Hijri calendar
conversion, hilal (new crescent moon) visibility analysis, prayer time calculation,
and qibla direction — built for transparency and auditability rather than opaque
lookup tables. Every output is traceable to a verifiable formula (solar/lunar
position algorithms), never to a black-box model or third-party API dependency.

This is the sister product to **Faraid** (inheritance calculator) in a broader
"Islamic knowledge infrastructure" suite: both share the philosophy that complex
fiqh/astronomical domain knowledge should be computed transparently, with every
intermediate step inspectable by the user.

### Problem statement
Indonesian Muslims (and the broader ummah) rely on Kemenag/MABIMS announcements
for the start of Ramadan, Syawal, and Dzulhijjah — announcements that come from
hisab (calculation) + rukyat (observation) processes most people never see.
Existing hijri converter apps are either: (a) simple offset-based converters with
no astronomical basis, or (b) government tools with no visibility into the
underlying math or method comparisons. There is no accessible tool that lets a
person see *why* a given month started on a given day, compare methods, and
verify it themselves.

### Goals
- Compute Hijri dates from real solar/lunar ephemeris data, not tabular offsets
- Visualize hilal visibility (is the crescent observable, from where, under which
  criteria) for any date and location
- Compare hisab methods side by side (wujudul hilal vs. imkanur rukyat/MABIMS-2021)
- Provide accurate prayer times and qibla direction as natural extensions of the
  same solar-position engine
- Zero external API dependency for core astronomical calculation — fully
  self-contained and reproducible

### Non-goals
- Not a replacement for official government/Kemenag sidang isbat announcements —
  this is an analysis/education tool, framed clearly as such
- Not doing rukyat (actual observation) — this is hisab (calculation) only;
  the tool should be explicit that real crescent sighting can differ from
  calculated visibility
- No ML/AI in the calculation path — pure deterministic astronomical formulas
- No prayer app features unrelated to the astronomy engine (no adhan audio,
  qibla compass hardware integration, etc. — MVP is data/visualization only)

## 2. Users

- **Primary**: Indonesian Muslims wanting to understand/verify Hijri dates,
  prayer times, and the reasoning behind Ramadan/Idul Fitri/Idul Adha date
  announcements
- **Secondary**: Da'wah content creators, madrasah/pesantren educators teaching
  ilmu falak, hobbyist astronomers interested in Islamic applications
- **Tertiary**: Developers/researchers wanting an open, auditable hisab
  implementation to build on

## 3. Core concepts (glossary)

| Term | Meaning |
|---|---|
| Hisab | Astronomical calculation to determine month start |
| Rukyat | Physical observation of the crescent moon |
| Hilal | The new crescent moon, visible shortly after sunset near conjunction |
| Ijtimak (conjunction) | Moment when moon and sun share the same ecliptic longitude |
| Wujudul hilal | Criterion: hilal is "present" if moon sets after sun on conjunction day, regardless of visibility |
| Imkanur rukyat (MABIMS 2021) | Criterion: hilal must meet minimum altitude (3°) AND elongation (6.4°) to be considered visible |
| Elongation | Angular separation between moon and sun as seen from Earth |
| Qibla | Direction to the Kaaba (Mecca) from a given location |

## 4. Feature scope

### 4.1 Hijri ↔ Gregorian Converter
- Bidirectional date conversion using real astronomical month boundaries
  (calculated conjunction + criteria), not the tabular Umm al-Qura approximation
- Toggle between calculation methods to see how the same Gregorian date can map
  to different Hijri dates depending on criteria used
- Historical lookback (any date, no artificial range limit within ephemeris
  validity)

### 4.2 Hilal Visibility Engine
- For any evening (specifically the 29th of a Hijri month), calculate at sunset:
  - Moon altitude above horizon
  - Elongation (moon-sun angular separation)
  - Moon age (hours since conjunction)
  - Illumination fraction
  - Lag time (moonset minus sunset)
- Classify visibility per criterion (wujudul hilal / MABIMS-2021 imkanur rukyat /
  Odeh criterion) and show them side-by-side with a clear "these can disagree"
  framing
- **Visibility map**: world/Indonesia map shaded by calculated visibility
  likelihood for the given evening, computed per-location, not just one point

### 4.3 Method Comparison View
- Given a specific month transition (e.g. start of Ramadan), show a comparison
  table: each method's criteria, whether they're met, and the resulting
  predicted start date
- Explicit framing that this is calculation, not official determination —
  actual Kemenag sidang isbat can incorporate rukyat reports this tool cannot

### 4.4 Prayer Time Calculator
- Standard 5 daily prayers + sunrise, computed from solar position for any
  coordinate and date
- Selectable calculation conventions (angle for fajr/isya — Kemenag RI default,
  MWL, ISNA, etc.) since these vary by organization, not by astronomy
- Monthly prayer time table (jadwal imsakiyah) generation, exportable

### 4.5 Qibla Direction
- Great-circle bearing calculation from any coordinate to the Kaaba
  (21.4225°N, 39.8262°E)
- Visual compass + map line rendering
- Distance to Mecca

### 4.6 Historical Hijri Archive
- Given any Hijri year, generate the full 12-month calendar with Gregorian
  equivalents and the method used
- Useful for historical research (e.g. "what Gregorian date was 10 Muharram
  1400H")

## 5. Technical architecture

Consistent with established stack:

- **Backend**: Django 5 + DRF
- **Astronomical engine**: Python implementation of VSOP87 (solar position) and
  ELP2000/Meeus lunar algorithms (from Jean Meeus' *Astronomical Algorithms*) —
  no external ephemeris API call required at runtime; optionally cross-validate
  against Skyfield/PyEphem (JPL DE440 ephemeris) in a validation test suite only
- **Task queue**: Celery + Redis for pre-computing visibility maps (grid of
  lat/lon points × date) so the frontend map renders instantly rather than
  computing per-pixel on request
- **Database**: PostgreSQL — stores precomputed conjunction tables, calculated
  month-start results per method/year, and cached visibility grids
- **Frontend**: Next.js 14 + Tailwind
- **Visualization**: D3.js for the visibility map (choropleth/gradient over
  Indonesia + world), Recharts for comparison tables/charts
- **Containerization**: Docker Compose (web, worker, redis, postgres)

### Key backend modules
```
falak/
├── astronomy/
│   ├── solar.py          # VSOP87-based solar position
│   ├── lunar.py          # ELP2000/Meeus lunar position
│   ├── conjunction.py    # Ijtimak calculation
│   ├── visibility.py     # Hilal visibility criteria (wujudul hilal, MABIMS, Odeh)
│   ├── prayer_times.py   # Solar-position-based prayer time calc
│   └── qibla.py          # Great-circle bearing calc
├── calendar_engine/
│   ├── converter.py      # Hijri <-> Gregorian conversion logic
│   └── archive.py        # Historical calendar generation
├── api/                  # DRF viewsets/serializers
└── tasks.py              # Celery tasks for visibility grid precomputation
```

### Validation requirement
The astronomical engine must be validated against known reference data before
being trusted for output:
- Cross-check conjunction times against published astronomical almanacs for a
  sample of at least 50 historical months
- Cross-check hilal visibility classifications against published Kemenag sidang
  isbat results (hisab side) for at least 5 recent years
- This validation suite is a hard prerequisite before the "Method Comparison"
  feature is considered production-ready — inaccurate output on a religious
  calendar tool is a serious trust failure, not a cosmetic bug

## 6. Non-functional requirements

- **Accuracy**: astronomical calculations accurate to within published almanac
  tolerances (sub-arcminute for positions, sub-minute for times)
- **Transparency**: every calculated value in the UI should be inspectable —
  e.g. clicking a hilal visibility result shows the underlying altitude/
  elongation/lag-time numbers, not just a verdict
- **No silent fallback**: if ephemeris calculation fails or produces an
  out-of-tolerance result, surface an explicit error rather than guessing
- **Offline-capable core**: the astronomy engine has no runtime external API
  dependency; the app should function without internet once deployed (only
  the map tile layer, if used, needs network)

## 7. Explicit framing & disclaimers

Given the religious sensitivity of this domain, the product must clearly state:
- This tool performs **hisab** (calculation) only; it does not perform or
  substitute for **rukyat** (actual observation)
- Official determination of Ramadan/Syawal/Dzulhijjah start in Indonesia is made
  by Kemenag's sidang isbat, which this tool does not replace
- Method disagreement is expected and shown deliberately — the tool does not
  advocate for one madhab/method over another

## 8. MVP scope (phase 1)

1. Hijri ↔ Gregorian converter (single method: MABIMS-2021, since that's
   Indonesia's current standard)
2. Hilal visibility calculator for a single location + date (numeric output:
   altitude, elongation, lag time, verdict)
3. Prayer time calculator (Kemenag RI convention only)
4. Qibla direction calculator

## 9. Phase 2

1. Multi-method comparison view (wujudul hilal / MABIMS / Odeh side by side)
2. Indonesia-wide visibility map (D3 choropleth)
3. Multiple prayer time conventions
4. Historical Hijri archive generator
5. Monthly jadwal imsakiyah export (PDF)

## 10. Open questions

- Which ephemeris precision level is "enough"? VSOP87 (arcsecond-level) is
  likely sufficient for hilal visibility purposes vs. full JPL DE440, but this
  should be settled by the validation suite results, not assumed upfront
- World map hilal visibility (global) vs. Indonesia-only — scope for MVP is
  Indonesia-only to keep the precomputation grid small
