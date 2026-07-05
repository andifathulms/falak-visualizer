"""
Celery tasks (PRD Sec. 5 / CLAUDE.md Phase 1.3). Precomputes hilal
visibility across an Indonesia-bounded lat/lon grid so the frontend map
renders from cache rather than computing per-pixel on request.
"""
import datetime as _dt

from celery import shared_task

# Indonesia bounding box, 0.5 deg steps (PRD 4.2 / 10: Indonesia-only for MVP).
_LAT_RANGE = (-11.0, 6.0)
_LON_RANGE = (95.0, 141.0)
_STEP_DEG = 0.5


def _grid_points():
    lat = _LAT_RANGE[0]
    while lat <= _LAT_RANGE[1]:
        lon = _LON_RANGE[0]
        while lon <= _LON_RANGE[1]:
            yield round(lat, 2), round(lon, 2)
            lon += _STEP_DEG
        lat += _STEP_DEG


@shared_task
def precompute_visibility_grid(date_iso: str, method: str) -> dict:
    from falak.astronomy import visibility
    from falak.models import Location, VisibilityResult

    date = _dt.date.fromisoformat(date_iso)
    written = 0
    failed = 0

    for lat, lon in _grid_points():
        location, _ = Location.objects.get_or_create(
            name=f"grid:{lat},{lon}",
            latitude_deg=lat,
            longitude_deg=lon,
            defaults={"timezone": "Asia/Jakarta"},
        )

        try:
            obs = visibility.compute_hilal_observation(date, lat, lon)
        except ValueError:
            # No silent fallback: skip and count, don't fabricate a verdict.
            failed += 1
            continue

        if method == "wujudul_hilal":
            verdict = str(visibility.wujudul_hilal(obs.moonset_time, obs.sunset_time, obs.conjunction_time))
        elif method == "mabims_2021":
            verdict = str(visibility.mabims_2021(obs.moon_altitude_deg, obs.elongation_deg))
        elif method == "odeh":
            verdict = visibility.odeh_criterion(obs.moon_altitude_deg, obs.elongation_deg, obs.crescent_width_arcmin)
        else:
            raise ValueError(f"unsupported method: {method}")

        VisibilityResult.objects.update_or_create(
            location=location,
            date=date,
            method=method,
            defaults={
                "moon_altitude_deg": obs.moon_altitude_deg,
                "sun_altitude_deg": obs.sun_altitude_deg,
                "elongation_deg": obs.elongation_deg,
                "moon_age_hours": obs.moon_age_hours,
                "illumination_fraction": obs.illumination_fraction,
                "lag_time_minutes": obs.lag_time_minutes,
                "verdict": verdict,
            },
        )
        written += 1

    return {"date": date_iso, "method": method, "points_written": written, "points_failed": failed}
