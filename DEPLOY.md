# Deploying Falak

The app splits cleanly in two:

- **Frontend** — `frontend/`, exported as static files, hosted free on **GitHub Pages**.
- **Backend** — `backend/`, the Django astronomy engine, hosted on **Fly.io**.

GitHub Pages cannot run Python, and the engine is the whole product, so Pages
hosts only the UI. The browser calls the API directly at runtime.

```
https://andifathulms.github.io/falak-visualizer/   (static, GitHub Pages)
                    │
                    └── fetch ──> https://falak-api.fly.dev/api/…   (Django + Celery, Fly.io)
```

Deploy the backend first — the frontend build needs its URL.

---

## 1. Backend → Fly.io

### 1.1 Provision

```bash
cd backend
fly launch --no-deploy --name falak-api --region sin
```

Say **no** when it offers to overwrite `fly.toml` — the one in this repo already
defines the `web` and `worker` process groups.

Postgres and Redis are both required. Postgres caches engine output
(`ConjunctionEvent`, `VisibilityResult`) and holds the hand-curated
`IsbatRecord` reference data; Redis is the Celery broker for
`precompute_visibility_grid`.

```bash
fly postgres create --name falak-db --region sin   # sets DATABASE_URL for you
fly postgres attach falak-db --app falak-api
```

For Redis, either `fly redis create` or a free Upstash database. Note that
Celery needs the TLS mode spelled out explicitly on an `rediss://` URL:

```
CELERY_BROKER_URL=rediss://default:<password>@<host>:6379?ssl_cert_reqs=required
```

Without `?ssl_cert_reqs=required`, the worker fails to connect with an SSL error.

### 1.2 Secrets

```bash
fly secrets set --app falak-api \
  DJANGO_SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(50))')" \
  DJANGO_DEBUG=false \
  DJANGO_ALLOWED_HOSTS="falak-api.fly.dev" \
  CORS_ALLOWED_ORIGINS="https://andifathulms.github.io" \
  CSRF_TRUSTED_ORIGINS="https://falak-api.fly.dev" \
  CELERY_BROKER_URL="rediss://…?ssl_cert_reqs=required"
```

`CORS_ALLOWED_ORIGINS` takes an **origin**, not a URL — scheme and host only. A
Pages project site lives at `https://andifathulms.github.io/falak-visualizer/`
but its origin is `https://andifathulms.github.io`. Including the `/falak-visualizer`
path makes django-cors-headers reject every request.

### 1.3 Deploy and seed

```bash
fly deploy
fly scale count web=1 worker=1 --app falak-api
```

Migrations run automatically via `release_command`. The seeded `IsbatRecord`
rows arrive with migration `0003_seed_isbat_records`; they stay
`verified=False` until a maintainer confirms each date against a primary
Kemenag source, so `/api/isbat-accuracy/` will flag them as unverified.

Verify:

```bash
curl https://falak-api.fly.dev/healthz
curl "https://falak-api.fly.dev/api/qibla/?lat=-6.2&lon=106.8"
```

### 1.4 Cost and cold starts

The `web` group is configured with `auto_stop_machines = "suspend"` and
`min_machines_running = 0`, so it scales to zero when idle and wakes in about a
second. The `worker` group does **not** auto-stop — a Celery worker holds an
open broker connection, so it runs continuously and is the only always-on cost.

If you want strictly zero always-on compute, scale `worker=0`. The tradeoff is
real: `/api/visibility-grid/` will then return `status: "computing"` forever and
the visibility map page never fills in. Every other page is computed in-request
and keeps working.

---

## 2. Frontend → GitHub Pages

### 2.1 One-time repo setup

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. **Settings → Secrets and variables → Actions → Variables → New variable:**
   - Name: `NEXT_PUBLIC_API_BASE_URL`
   - Value: `https://falak-api.fly.dev/api`

It is a *variable*, not a secret — it is baked into the published JavaScript and
is not confidential. The workflow fails fast if it is missing or not `https://`,
because both cases would ship a site where every page errors and neither is
recoverable at runtime.

### 2.2 Deploy

Push to `main` with changes under `frontend/`, or run the
**Deploy frontend to GitHub Pages** workflow manually. It publishes to
`https://andifathulms.github.io/falak-visualizer/`.

### 2.3 What changed to make the export work

- [next.config.mjs](frontend/next.config.mjs) emits a static `out/` directory
  when `STATIC_EXPORT=1`, with `basePath` set to the repo subpath.
- The flag is conditional so `docker-compose` keeps working: Next 14 refuses to
  `next start` an exported build.
- No code changes were needed. Every page under `frontend/src/app/` is already
  a client component, and [lib/permalink.ts](frontend/src/lib/permalink.ts)
  already reads the query string from `window.location` rather than
  `useSearchParams`.

---

## Troubleshooting

**Every page shows the error banner.** Open the browser console.

- `CORS policy: No 'Access-Control-Allow-Origin'` → `CORS_ALLOWED_ORIGINS` is
  wrong. Check it is the bare origin with no trailing path or slash.
- `Mixed Content: blocked` → `NEXT_PUBLIC_API_BASE_URL` is `http://`. Pages is
  https-only.
- `net::ERR_CONNECTION_REFUSED` to `localhost:8000` → the repo variable was
  unset at build time and the default in `lib/api.ts` was baked in. Set the
  variable and re-run the workflow; editing it does not retroactively change a
  published build.
- `DisallowedHost` in `fly logs` → add the hostname to `DJANGO_ALLOWED_HOSTS`.

**Assets 404 under `/falak-visualizer/`.** `NEXT_PUBLIC_BASE_PATH` in the
workflow must match the repo name exactly. If you rename the repo, update it.

**The visibility map stays on "computing".** The `worker` process group is at
zero, or the broker URL is missing `?ssl_cert_reqs=required`. Check
`fly logs --app falak-api`.
