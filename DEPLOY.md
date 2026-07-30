# Deploying Falak

Falak deploys as static files to **GitHub Pages**, and costs nothing to run.

There is no backend in the request path. The astronomy engine runs in the
visitor's browser:

```
https://andifathulms.github.io/falak-visualizer/   (static, GitHub Pages, $0)
                    │
                    └── everything computed in-page — no API, no database
```

## Why this works

Nothing the product does needs a server:

- Every endpoint the Django API exposed was a **pure function of its query
  parameters** — conversion, hilal visibility, prayer times, qibla.
- The Postgres tables were a **cache of deterministic output**
  (`ConjunctionEvent`, `VisibilityResult`) plus one **static reference table**
  (`IsbatRecord`), not a source of truth.
- There are **no accounts and no writes** — rukyat submission is explicitly out
  of scope for the MVP.
- The engine has **no third-party dependencies at all**. It imports only `math`
  and `datetime`, which is a direct consequence of the CLAUDE.md rule against
  runtime astronomy APIs.

So the engine was ported to TypeScript and moved into the page.

## The two engines, and what keeps them honest

`backend/falak/` (Python) is still in the repo and is still **the oracle**. It is
the implementation cross-checked against JPL DE440 via Skyfield and against
Meeus' worked examples. It is no longer deployed.

`frontend/src/lib/falak/` (TypeScript) is a line-by-line port of it, and is what
users actually run.

Two implementations of a religious-calendar engine would normally be an
invitation to silent drift, so they are pinned to each other:

1. `backend/scripts/generate_golden_vectors.py` runs a fixed set of ~2,000 inputs
   through the Python engine and writes the results to
   `frontend/src/lib/falak/__fixtures__/golden-vectors.json`.
2. `frontend/src/lib/falak/__tests__/golden.test.ts` replays those same inputs
   through the TypeScript engine and fails on any deviation. In practice the two
   agree to the last digit; the tolerance that remains exists only so a
   different `libm` cannot fail the build over a last-ulp `sin` difference.
3. CI runs the Python suite, **regenerates the fixture and diffs it**, then runs
   the conformance suite — and blocks the deploy if any of that fails. The diff
   step is what stops someone changing the oracle and leaving the port pinned to
   stale numbers, which would let both be wrong while the tests stayed green.

After any change to the Python engine:

```bash
cd backend && python3 scripts/generate_golden_vectors.py   # then commit the fixture
cd ../frontend && npm test
```

The generator is deliberately stdlib-only — no Django, no Celery — so it runs
with a bare `python3`.

---

## Deploying

### One-time repo setup

**Settings → Pages → Build and deployment → Source: GitHub Actions.**

That is the whole setup. There is no `NEXT_PUBLIC_API_BASE_URL` to configure any
more; leaving it unset is what tells the build there is no backend (it only
controls whether the nav shows an "API Docs" link).

Pages is free for public repositories. A private repo needs GitHub Pro.

### Deploy

Push to `main` with changes under `frontend/` or `backend/`, or run the
**Verify engines and deploy to GitHub Pages** workflow manually. It publishes to
`https://andifathulms.github.io/falak-visualizer/`.

`backend/**` is in the trigger paths on purpose: a change to the oracle has to
re-prove that the browser port still agrees with it, even though the backend
itself is never deployed.

### The visibility map

The Indonesia grid is ~3,255 hilal observations, each bracketing and bisecting
both a sunset and a moonset. That was the one thing the Django version could not
do in-request, which is why it went to Celery.

In the browser the equivalent move is `frontend/src/lib/falak/gridRunner.ts`,
which shards the grid across Web Workers (one per core, capped at 8) and reports
real progress rather than an indefinite spinner. It falls back to a chunked
main-thread run if Workers are unavailable. There is no longer a `"computing"`
state to poll — the promise simply resolves when the grid is done.

---

## Running the backend anyway

You do not need to, but `docker-compose up` still brings up the full Django +
Celery + Redis + Postgres stack, and `backend/fly.toml` is still valid if you
ever want the API hosted. Two reasons you might:

- **Validation.** The Skyfield/DE440 cross-check and the rest of the Python
  suite are what make the browser engine trustworthy. `cd backend && pytest`.
- **The API as a product.** If you want other people's tools to call Falak, an
  HTTP API is the interface for that, and DRF already generates its OpenAPI
  schema. Set `NEXT_PUBLIC_API_BASE_URL` at build time and the "API Docs" link
  reappears in the nav.

Hosting it is not free — a Fly deployment of `web` + `worker` + Postgres + Redis
runs roughly $6–11/month, and the Celery worker cannot scale to zero because it
holds an open broker connection.

---

## Troubleshooting

**A page shows the error banner.** Open the browser console. Errors are now
calculation errors, not network errors — the message comes from the engine
itself (for example "no sunset found for …", which is a real astronomical
condition at extreme latitudes, deliberately surfaced rather than papered over
with a placeholder).

**Assets 404 under `/falak-visualizer/`.** `NEXT_PUBLIC_BASE_PATH` in the
workflow must match the repo name exactly. If you rename the repo, update it.

**The visibility map is slow.** It is doing several thousand real observations on
the visitor's device; expect a few seconds on a laptop and longer on a phone. If
it is unusably slow, check the console for a worker-loading failure — the
main-thread fallback is correct but several times slower.

**`golden-vectors.json is stale` in CI.** The Python engine changed and the
fixture was not regenerated. Run the generator and commit the result. Do not
"fix" this by editing the fixture: it is generated output, and hand-editing it
would break the guarantee it exists to provide.
