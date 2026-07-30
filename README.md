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
historical months (rolling window ending on the current year, e.g.
2002-2026 as of this run) matched JPL DE440 within a 5-minute tolerance.
Everything else has been validated against Meeus' own worked examples and
cross-checked against publicly documented Kemenag dates (see commit history
in `backend/falak/astronomy/` and `backend/falak/calendar_engine/` for
specifics).

The engine now also exists as a TypeScript port that runs in the browser, so the
whole product deploys as static files with no backend. The Python engine remains
the validated oracle, and the two are pinned to each other by a generated
golden-vector suite that gates every deploy — see
[Two engines, one source of truth](#two-engines-one-source-of-truth).

## Running it

Just the frontend — this is the whole app, no services needed:

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
npm test           # golden-vector conformance: browser engine vs Python oracle
```

The full Django stack still runs, and is worth having for validation and for the
HTTP API, but is no longer required to use the app:

```bash
docker compose up -d --build
# backend:  http://localhost:8000/api/
# frontend: http://localhost:3000  (override with FRONTEND_PORT=xxxx if taken)
```

To run the astronomy engine's own validation suite (no Docker needed):

```bash
cd backend
pip install -r requirements-dev.txt   # adds pytest-django + skyfield for the JPL cross-check
python -m pytest -q
```

## Two engines, one source of truth

`backend/falak/` (Python) is the **oracle** — the implementation cross-checked
against JPL DE440. `frontend/src/lib/falak/` (TypeScript) is a line-by-line port
of it and is what users run.

They cannot drift apart silently:

- `backend/scripts/generate_golden_vectors.py` freezes the oracle's output for
  ~2,000 fixed inputs into `frontend/src/lib/falak/__fixtures__/`.
- `frontend/src/lib/falak/__tests__/golden.test.ts` replays them through the port
  and fails on any deviation. The two agree to the last digit.
- CI runs the Python suite, regenerates the fixture and re-checks it numerically, then runs the
  conformance suite — and blocks the deploy on any failure.

After changing the Python engine, regenerate the fixture and commit it.

## Deploying

Static files on GitHub Pages, free, with no backend in the request path. See
[DEPLOY.md](DEPLOY.md).

## Structure

```
backend/            Django 5 + DRF + Celery — the validated oracle, not deployed
  config/            Django project settings, urls, celery app
  falak/
    astronomy/       Solar/lunar position, conjunction, visibility, qibla, prayer times
    calendar_engine/  Hijri <-> Gregorian conversion, historical archive
    api/              DRF views/serializers/urls
    tasks.py          Celery visibility-grid precomputation
    tests/            Validation suite against Meeus + JPL DE440
  scripts/
    generate_golden_vectors.py   Freezes oracle output for the browser port to match
frontend/           Next.js 14 + Tailwind + D3 + Recharts — the deployed product
  src/lib/falak/      TypeScript port of the engine; runs in the browser
    grid.worker.ts    One shard of the Indonesia visibility grid
    gridRunner.ts     Fans the grid across Web Workers
    __fixtures__/     Generated golden vectors (do not hand-edit)
    __tests__/        Conformance suite: port vs oracle
  src/lib/api.ts      Same shapes the HTTP API had, computed locally
  src/app/            converter, hilal-visibility, visibility-map, prayer-times, qibla
docker-compose.yml   web, worker, redis, postgres, frontend (optional, dev only)
```

## Non-negotiable rules (see CLAUDE.md)

- No third-party astronomy API at runtime (Skyfield/JPL ephemeris: test-only,
  kept out of `requirements.txt`/the production image, only in
  `requirements-dev.txt`)
- No silent fallback values — errors surface explicitly (`ApiError` in
  `frontend/src/lib/api.ts`, mirroring the 400/422 responses in
  `falak/api/views.py`; a grid point with no sunset is counted, never given a
  fabricated verdict)
- Every computed verdict must expose its underlying numbers (see
  `HilalObservationSerializer` and the `CalculationPanel` frontend component)
- No ML/AI anywhere in the calculation path
