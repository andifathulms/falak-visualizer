# Falak — Hijri Calendar & Islamic Astronomy Visualizer

**[→ Open the app](https://andifathulms.github.io/falak-visualizer/)**

Work out when an Islamic month actually begins — and see the numbers that decide
it, not just a verdict. Falak computes the Moon's and Sun's positions from first
principles to answer four questions: what Hijri date is this, is the new crescent
(*hilal*) visible tonight, when are the prayer times here, and which way is the
qibla.

Every calculation runs **in your browser**. There is no backend, no database, and
no API key — the astronomy engine is ~2,300 lines of TypeScript shipped with the
page, so the app works on a plane and costs nothing to host.

![The Indonesia visibility map on an evening when the crescent is visible across
Sumatra and Java but not further east](docs/visibility-map.jpg)

*The visibility map on 15 June 2026: the crescent clears the MABIMS threshold
across Sumatra and Java, and does not further east. This is the problem the app
exists to show — "has the month started?" can have a different answer depending
on where you stand.*

## Why it exists

In Indonesia the start of Ramadan, Syawal and Dzulhijjah is a recurring point of
public confusion, because different organisations use different *hisab*
(calculation) criteria for whether the hilal is visible. The public usually sees
only the announcement, never the arithmetic.

Existing converters are either lookup tables with no astronomy behind them, or
official tools that give a verdict with no way to inspect why. Falak implements
three real competing criteria — **Wujudul Hilal**, **MABIMS 2021**, and
**Odeh** — evaluates them independently, and shows where they disagree, because
the disagreement is the actual subject.

> **Hisab only.** This is calculation, not *rukyat* (observation). Indonesia's
> official month start is set by Kemenag's sidang isbat, which may incorporate
> sighting reports this tool cannot. The app says so on every page that reports a
> month boundary.

## What it does

| Page | What you get |
|---|---|
| **Converter** | Hijri ↔ Gregorian from real conjunction times and a visibility criterion, not an offset table |
| **Hilal Visibility** | Moon altitude, elongation, age, illumination and lag time for any date and place, judged against all three criteria at once |
| **Visibility Map** | The criterion evaluated at 3,255 points across Indonesia and drawn over the real coastline |
| **Prayer Times** | Daily times and a printable monthly *jadwal imsakiyah*, in the location's own timezone |
| **Qibla** | Great-circle bearing and distance, plus *Rashdul Qibla* — the moments the Sun sits directly over the Kaaba, so you can calibrate with a shadow and no instruments |
| **Method Divergence** | Where the three criteria disagree across a whole Hijri year |
| **Visibility Calendar** | A twelve-month view of the conditions behind each month start |
| **Isbat Accuracy** | Each method's predictions against historically announced Kemenag dates |

Every verdict is paired with the raw numbers that produced it — that was the
point.

## How it's built

The engine implements Meeus' *Astronomical Algorithms*: a truncated VSOP87 solar
model, the ELP2000 lunar series, a bisection solver for conjunction times, and
the visibility criteria as pure functions. No ephemeris API, no lookup tables, no
ML — deliberately, so that every number can be traced to a formula in this repo.

That self-containment is what later made the backend removable. Each endpoint was
a pure function of its inputs, the database held only cached deterministic output
plus one static reference table, and the engine imported nothing but `math` and
`datetime`. So the engine was ported to TypeScript and the server left the
request path entirely.

## Accuracy

Validated before being trusted, per the project's own build-order rule:

- **50/50 historical lunar conjunctions** match Skyfield with the JPL DE440
  ephemeris within a 5-minute tolerance
  ([test_conjunction_skyfield_crosscheck.py](backend/falak/tests/test_conjunction_skyfield_crosscheck.py)).
  Skyfield is a **test-only** dependency and is never imported by the shipped
  engine.
- Solar and lunar positions are checked against Meeus' own worked examples.
- **100 backend tests** and **51 frontend tests** run in CI and gate every
  deploy.

## Running it

Just the frontend — this is the whole app, no services needed:

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

Shipping a religious-calendar engine in two languages invites silent drift, so
they are pinned to each other.

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
  src/lib/geo/        Indonesian coastline, extracted from Natural Earth at build time
  scripts/            One-off generator for that coastline
  src/app/            The nine pages
docker-compose.yml   web, worker, redis, postgres, frontend (optional, dev only)
```

## Docs

- [DEPLOY.md](DEPLOY.md) — how it deploys, why no server is needed, and how the
  two engines are kept in agreement
- [PRD.md](PRD.md) — product scope
- [CLAUDE.md](CLAUDE.md) — build order and the engineering rules below

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
