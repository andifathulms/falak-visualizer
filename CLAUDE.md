# CLAUDE.md — Falak: Hijri Calendar & Islamic Astronomy Visualizer

## Project context

Read `PRD.md` in full before writing any code. This is a religious-calendar
tool — accuracy and transparency matter more than feature velocity. Do not ship
a calculation feature without the corresponding validation described in PRD §5.

## Stack

- Django 5 + DRF (backend/API)
- Celery + Redis (async precomputation of visibility grids)
- PostgreSQL (persistence)
- Next.js 14 + Tailwind (frontend)
- D3.js (visibility map), Recharts (comparison tables/charts)
- Docker Compose (web, worker, redis, postgres, all four services)

## Build order (do not skip ahead)

### Phase 0 — Astronomy engine core (build and validate FIRST, before any UI)
1. Implement solar position (VSOP87, truncated to arcsecond-level terms is
   acceptable — full VSOP87 has hundreds of terms, use a well-tested truncated
   implementation, e.g. based on Jean Meeus' *Astronomical Algorithms* Ch. 25)
2. Implement lunar position (ELP2000/Meeus Ch. 47)
3. Implement conjunction (ijtimak) time solver — find when moon and sun
   ecliptic longitudes are equal, per lunar month
4. Implement hilal visibility criteria as pure functions:
   - `wujudul_hilal(moonset, sunset, conjunction_time) -> bool`
   - `mabims_2021(altitude_deg, elongation_deg) -> bool` (threshold: altitude
     ≥ 3°, elongation ≥ 6.4°)
   - `odeh_criterion(altitude_deg, elongation_deg) -> str` (visible/marginal/
     not visible — this one has a continuous classification, not just bool)
5. Implement qibla bearing (great-circle formula, Kaaba at 21.4225°N, 39.8262°E)
6. Implement prayer time calculation (standard solar-angle method: fajr/isya
   angle configurable, dhuhr = solar noon + correction, asr = shadow-length
   method, maghrib = sunset, all with atmospheric refraction correction)
7. **Write the validation test suite before moving to Phase 1.** Pull at least
   50 historical conjunction times from a trusted reference (cross-check
   against Skyfield using JPL DE440 ephemeris — install as a dev/test-only
   dependency, never call it at runtime) and assert your VSOP87/Meeus
   implementation matches within tolerance. Do the same for at least 5 years
   of Kemenag sidang isbat hisab results if you can source them. If validation
   fails, fix the engine — do not proceed to API/UI work with an unvalidated
   engine.

### Phase 1 — Backend API (Django + DRF)
1. Models: `Location` (lat/lon/name/timezone), `ConjunctionEvent` (cached
   ijtimak calculations per month), `VisibilityResult` (cached per location/
   date/method), `PrayerTimeConvention` (angle presets: Kemenag RI, MWL, ISNA,
   etc.)
2. DRF endpoints:
   - `GET /api/convert/?date=&direction=hijri_to_gregorian|gregorian_to_hijri&method=`
   - `GET /api/hilal-visibility/?date=&lat=&lon=&method=`
   - `GET /api/prayer-times/?date=&lat=&lon=&convention=`
   - `GET /api/qibla/?lat=&lon=`
   - `GET /api/visibility-grid/?date=&method=` (returns precomputed grid,
     triggers Celery task if not cached)
3. Celery task: `precompute_visibility_grid(date, method)` — computes hilal
   visibility across an Indonesia-bounded lat/lon grid (reasonable resolution,
   e.g. 0.5° steps) and caches to Postgres. Do not compute this synchronously
   in the request path.

### Phase 2 — Frontend (Next.js)
1. Converter page: date picker, method selector, converted result with
   expandable "show calculation" panel (raw altitude/elongation/lag-time
   numbers — never just a verdict with no way to inspect it)
2. Hilal visibility page: location picker (map or search), date picker,
   numeric results + verdict per method, side-by-side method comparison table
   (Recharts table or plain styled table, comparison is tabular not chart-y)
3. Visibility map page: D3 choropleth over Indonesia, shaded by calculated
   visibility for selected date/method
4. Prayer times page: location + date + convention selector, daily table +
   monthly export
5. Qibla page: compass visual (SVG) + map with bearing line + distance

## Non-negotiable rules

- **No third-party astronomy API at runtime.** Skyfield/PyEphem/JPL ephemeris
  may be used in the test/validation suite only, never imported by the
  production request path. The whole point of this product is a self-contained,
  auditable engine.
- **No silent fallback values.** If a calculation is out of expected tolerance
  or fails, return an explicit error state to the frontend — never substitute
  a placeholder date or "approximately" value without flagging it as such.
- **Every verdict must be inspectable.** Any UI element that shows a
  computed conclusion (hilal visible/not visible, prayer time, qibla bearing)
  must have a way for the user to see the underlying numbers that produced it.
- **Explicit religious-sensitivity framing in the UI itself** (not just docs):
  the app must state, near any month-start or Ramadan-related output, that
  this is hisab calculation only and does not replace official sidang isbat
  determination.
- **No ML/AI anywhere in the calculation path.** Pure deterministic formulas,
  same as Faraid's engine philosophy.

## Testing requirements

- Unit tests for every astronomy function against known reference values
  (Meeus' textbook worked examples are a good starting source for solar/lunar
  position sanity checks)
- Integration test: full conjunction → visibility → verdict pipeline for at
  least the last 10 years of Ramadan/Syawal/Dzulhijjah transitions, compared
  against publicly documented Kemenag hisab results where available
- Do not mark Phase 0 complete until these pass

## What NOT to build in MVP

- Adhan audio playback
- Rukyat report submission/crowdsourcing (this is hisab-only, explicitly)
- Global (non-Indonesia) visibility map — Indonesia-only for MVP
- Multiple prayer time conventions — Kemenag RI only for MVP, others in phase 2
- User accounts/auth — this is a public calculation tool, no login needed for
  MVP
