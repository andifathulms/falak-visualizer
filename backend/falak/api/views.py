"""
DRF views for the five MVP endpoints (PRD 4 / CLAUDE.md Phase 1.2).

No-silent-fallback rule (CLAUDE.md): every bad/missing input or
out-of-range calculation returns an explicit 400 with a message, never a
substituted default location/date/method.
"""
import datetime as _dt

from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response

from falak.astronomy import prayer_times as pt
from falak.astronomy import qibla as qibla_module
from falak.astronomy import visibility as visibility_module
from falak.calendar_engine import converter

from .serializers import HilalObservationSerializer, PrayerTimesSerializer, QiblaSerializer

_SUPPORTED_CONVERTER_METHODS = {"mabims_2021"}
_SUPPORTED_VISIBILITY_METHODS = {"wujudul_hilal", "mabims_2021", "odeh"}


def _require_float(request: Request, name: str, default=None):
    raw = request.query_params.get(name)
    if raw is None:
        if default is not None:
            return default
        raise ValueError(f"missing required query parameter: {name}")
    try:
        return float(raw)
    except ValueError as exc:
        raise ValueError(f"query parameter '{name}' must be a number, got {raw!r}") from exc


def _require_date(request: Request, name: str = "date"):
    raw = request.query_params.get(name)
    if raw is None:
        raise ValueError(f"missing required query parameter: {name}")
    try:
        return _dt.date.fromisoformat(raw)
    except ValueError as exc:
        raise ValueError(f"query parameter '{name}' must be an ISO date (YYYY-MM-DD), got {raw!r}") from exc


@api_view(["GET"])
def convert(request: Request) -> Response:
    direction = request.query_params.get("direction")
    method = request.query_params.get("method", "mabims_2021")

    if method not in _SUPPORTED_CONVERTER_METHODS:
        return Response(
            {"error": f"method '{method}' is not supported in the MVP converter (only mabims_2021 is implemented)"},
            status=400,
        )

    try:
        lat = _require_float(request, "lat", default=converter.JAKARTA_LATITUDE_DEG)
        lon = _require_float(request, "lon", default=converter.JAKARTA_LONGITUDE_DEG)

        if direction == "gregorian_to_hijri":
            date = _require_date(request)
            result = converter.gregorian_to_hijri(date, lat, lon)
            return Response(
                {
                    "direction": direction,
                    "method": method,
                    "input_date": date.isoformat(),
                    "hijri_year": result.year,
                    "hijri_month": result.month,
                    "hijri_day": result.day,
                    "hijri_month_name": result.month_name,
                }
            )
        elif direction == "hijri_to_gregorian":
            year = int(_require_float(request, "hijri_year"))
            month = int(_require_float(request, "hijri_month"))
            day = int(_require_float(request, "hijri_day"))
            gregorian_date = converter.hijri_to_gregorian(year, month, day, lat, lon)
            return Response(
                {
                    "direction": direction,
                    "method": method,
                    "hijri_year": year,
                    "hijri_month": month,
                    "hijri_day": day,
                    "gregorian_date": gregorian_date.isoformat(),
                }
            )
        else:
            return Response(
                {"error": "query parameter 'direction' must be 'gregorian_to_hijri' or 'hijri_to_gregorian'"},
                status=400,
            )
    except ValueError as exc:
        return Response({"error": str(exc)}, status=400)


@api_view(["GET"])
def hilal_visibility(request: Request) -> Response:
    try:
        date = _require_date(request)
        lat = _require_float(request, "lat")
        lon = _require_float(request, "lon")
    except ValueError as exc:
        return Response({"error": str(exc)}, status=400)

    method = request.query_params.get("method")
    if method is not None and method not in _SUPPORTED_VISIBILITY_METHODS:
        return Response(
            {"error": f"method '{method}' not recognized; supported: {sorted(_SUPPORTED_VISIBILITY_METHODS)}"},
            status=400,
        )

    try:
        obs = visibility_module.compute_hilal_observation(date, lat, lon)
    except ValueError as exc:
        return Response({"error": str(exc)}, status=422)

    criteria = {
        "wujudul_hilal": visibility_module.wujudul_hilal(obs.moonset_time, obs.sunset_time, obs.conjunction_time),
        "mabims_2021": visibility_module.mabims_2021(obs.moon_altitude_deg, obs.elongation_deg),
        "odeh": visibility_module.odeh_criterion(
            obs.moon_altitude_deg, obs.elongation_deg, obs.crescent_width_arcmin
        ),
    }

    payload = HilalObservationSerializer(obs).data
    payload["criteria"] = criteria
    if method is not None:
        payload["verdict"] = criteria[method]
        payload["method"] = method

    return Response(payload)


@api_view(["GET"])
def prayer_times_view(request: Request) -> Response:
    try:
        date = _require_date(request)
        lat = _require_float(request, "lat")
        lon = _require_float(request, "lon")
    except ValueError as exc:
        return Response({"error": str(exc)}, status=400)

    convention_name = request.query_params.get("convention", "Kemenag RI")
    convention = pt.CONVENTIONS.get(convention_name)
    if convention is None:
        return Response(
            {"error": f"convention '{convention_name}' not recognized; supported: {sorted(pt.CONVENTIONS)}"},
            status=400,
        )

    result = pt.daily_prayer_times(date, lat, lon, convention)
    return Response(PrayerTimesSerializer(result).data)


@api_view(["GET"])
def qibla_view(request: Request) -> Response:
    try:
        lat = _require_float(request, "lat")
        lon = _require_float(request, "lon")
    except ValueError as exc:
        return Response({"error": str(exc)}, status=400)

    result = qibla_module.qibla_direction(lat, lon)
    return Response(
        QiblaSerializer(
            {
                "latitude_deg": lat,
                "longitude_deg": lon,
                "bearing_deg": result.bearing_deg,
                "distance_km": result.distance_km,
            }
        ).data
    )


@api_view(["GET"])
def method_divergence(request: Request) -> Response:
    try:
        hijri_year = int(_require_float(request, "hijri_year"))
        lat = _require_float(request, "lat", default=converter.JAKARTA_LATITUDE_DEG)
        lon = _require_float(request, "lon", default=converter.JAKARTA_LONGITUDE_DEG)
    except ValueError as exc:
        return Response({"error": str(exc)}, status=400)

    months = []
    for month in range(1, 13):
        start_dates = {}
        errors = {}
        for method in converter.MONTH_START_METHODS:
            try:
                start_dates[method] = converter.month_start_date_for_method(
                    hijri_year, month, method, lat, lon
                ).isoformat()
            except ValueError as exc:
                errors[method] = str(exc)

        diverges = len(set(start_dates.values())) > 1 if not errors else None
        months.append(
            {
                "hijri_month": month,
                "hijri_month_name": converter.HIJRI_MONTH_NAMES[month - 1],
                "start_dates": start_dates,
                "errors": errors or None,
                "diverges": diverges,
            }
        )

    return Response(
        {"hijri_year": hijri_year, "latitude_deg": lat, "longitude_deg": lon, "months": months}
    )


@api_view(["GET"])
def visibility_calendar(request: Request) -> Response:
    try:
        hijri_year = int(_require_float(request, "hijri_year"))
        lat = _require_float(request, "lat", default=converter.JAKARTA_LATITUDE_DEG)
        lon = _require_float(request, "lon", default=converter.JAKARTA_LONGITUDE_DEG)
    except ValueError as exc:
        return Response({"error": str(exc)}, status=400)

    method = request.query_params.get("method", "mabims_2021")
    if method not in _SUPPORTED_VISIBILITY_METHODS:
        return Response(
            {"error": f"method '{method}' not recognized; supported: {sorted(_SUPPORTED_VISIBILITY_METHODS)}"},
            status=400,
        )

    months = []
    for month in range(1, 13):
        try:
            obs = converter.observation_for_month(hijri_year, month, lat, lon)
        except ValueError as exc:
            months.append(
                {
                    "hijri_month": month,
                    "hijri_month_name": converter.HIJRI_MONTH_NAMES[month - 1],
                    "error": str(exc),
                }
            )
            continue

        payload = HilalObservationSerializer(obs).data
        payload["hijri_month"] = month
        payload["hijri_month_name"] = converter.HIJRI_MONTH_NAMES[month - 1]
        payload["verdict"] = (
            visibility_module.wujudul_hilal(obs.moonset_time, obs.sunset_time, obs.conjunction_time)
            if method == "wujudul_hilal"
            else visibility_module.mabims_2021(obs.moon_altitude_deg, obs.elongation_deg)
            if method == "mabims_2021"
            else visibility_module.odeh_criterion(obs.moon_altitude_deg, obs.elongation_deg, obs.crescent_width_arcmin)
        )
        months.append(payload)

    return Response(
        {"hijri_year": hijri_year, "method": method, "latitude_deg": lat, "longitude_deg": lon, "months": months}
    )


@api_view(["GET"])
def visibility_grid_view(request: Request) -> Response:
    from falak.models import VisibilityResult
    from falak.tasks import precompute_visibility_grid

    try:
        date = _require_date(request)
    except ValueError as exc:
        return Response({"error": str(exc)}, status=400)

    method = request.query_params.get("method", "mabims_2021")
    if method not in _SUPPORTED_VISIBILITY_METHODS:
        return Response(
            {"error": f"method '{method}' not recognized; supported: {sorted(_SUPPORTED_VISIBILITY_METHODS)}"},
            status=400,
        )

    cached = VisibilityResult.objects.filter(date=date, method=method)
    if cached.exists():
        return Response(
            {
                "date": date.isoformat(),
                "method": method,
                "status": "ready",
                "points": [
                    {
                        "lat": r.location.latitude_deg,
                        "lon": r.location.longitude_deg,
                        "verdict": r.verdict,
                        "moon_altitude_deg": r.moon_altitude_deg,
                        "elongation_deg": r.elongation_deg,
                    }
                    for r in cached.select_related("location")
                ],
            }
        )

    precompute_visibility_grid.delay(date.isoformat(), method)
    return Response(
        {"date": date.isoformat(), "method": method, "status": "computing"},
        status=202,
    )
