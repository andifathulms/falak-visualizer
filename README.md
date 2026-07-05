# Falak — Hijri Calendar & Islamic Astronomy Visualizer

A deterministic, astronomically-grounded platform for Hijri calendar conversion,
hilal (new crescent moon) visibility analysis, prayer time calculation, and
qibla direction. See `PRD.md` for product scope and `CLAUDE.md` for build order
and non-negotiable engineering rules.

## Status

Phase 0 (astronomy engine core) is being built and validated first, per the
mandated build order, before any API or UI work begins.

## Structure

```
backend/            Django 5 + DRF + Celery
  falak/
    astronomy/       Solar/lunar position, conjunction, visibility, qibla, prayer times
    calendar_engine/  Hijri <-> Gregorian conversion, historical archive
    api/              DRF viewsets/serializers
    tests/            Validation suite against Meeus reference values
frontend/           Next.js 14 + Tailwind + D3 + Recharts
```

## Non-negotiable rules (see CLAUDE.md)

- No third-party astronomy API at runtime (Skyfield/JPL ephemeris: test-only)
- No silent fallback values — errors surface explicitly
- Every computed verdict must expose its underlying numbers
- No ML/AI anywhere in the calculation path
