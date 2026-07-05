# Falak — Hijri Calendar & Islamic Astronomy Visualizer

A deterministic, astronomically-grounded platform for Hijri calendar conversion,
hilal (new crescent moon) visibility analysis, prayer time calculation, and
qibla direction. See `PRD.md` for product scope and `CLAUDE.md` for build order
and non-negotiable engineering rules.

## Status

MVP is built end-to-end and verified via Docker Compose (real Postgres/Redis,
migrations, all 5 API endpoints, Celery grid precomputation, and every
frontend page all confirmed working over HTTP).

Phase 0 validation is complete per CLAUDE.md's gate: 66/66 tests pass,
including the mandated independent Skyfield + JPL DE440 cross-check
(`backend/falak/tests/test_conjunction_skyfield_crosscheck.py`) — 50/50
historical months (2000-2024) matched JPL DE440 within a 5-minute tolerance.
Everything else has been validated against Meeus' own worked examples and
cross-checked against publicly documented Kemenag dates (see commit history
in `backend/falak/astronomy/` and `backend/falak/calendar_engine/` for
specifics).

## Running it

```bash
docker compose up -d --build
# backend:  http://localhost:8000/api/
# frontend: http://localhost:3000  (override with FRONTEND_PORT=xxxx if taken)
```

To run the astronomy engine's own validation suite (no Docker needed):

```bash
cd backend
pip install -r requirements-dev.txt   # adds pytest-django + skyfield for the JPL cross-check
python -m pytest -q                   # 66 passed
```

## Structure

```
backend/            Django 5 + DRF + Celery
  config/            Django project settings, urls, celery app
  falak/
    astronomy/       Solar/lunar position, conjunction, visibility, qibla, prayer times
    calendar_engine/  Hijri <-> Gregorian conversion, historical archive
    api/              DRF views/serializers/urls
    tasks.py          Celery visibility-grid precomputation
    tests/            Validation suite against Meeus reference values
frontend/           Next.js 14 + Tailwind + D3 + Recharts
  src/app/            converter, hilal-visibility, visibility-map, prayer-times, qibla
docker-compose.yml   web, worker, redis, postgres, frontend
```

## Non-negotiable rules (see CLAUDE.md)

- No third-party astronomy API at runtime (Skyfield/JPL ephemeris: test-only,
  kept out of `requirements.txt`/the production image, only in
  `requirements-dev.txt`)
- No silent fallback values — errors surface explicitly (see the 400/422
  responses in `falak/api/views.py`)
- Every computed verdict must expose its underlying numbers (see
  `HilalObservationSerializer` and the `CalculationPanel` frontend component)
- No ML/AI anywhere in the calculation path
