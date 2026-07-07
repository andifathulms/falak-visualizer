"""Qibla direction: great-circle initial bearing and distance to the Kaaba."""
from __future__ import annotations

import datetime as _dt
import math
from dataclasses import dataclass

from . import solar

KAABA_LATITUDE_DEG = 21.4225
KAABA_LONGITUDE_DEG = 39.8262

EARTH_MEAN_RADIUS_KM = 6371.0088


@dataclass(frozen=True)
class QiblaResult:
    bearing_deg: float  # clockwise from true north, 0-360
    distance_km: float


def qibla_direction(lat_deg: float, lon_deg: float) -> QiblaResult:
    """
    Initial great-circle bearing from (lat_deg, lon_deg) to the Kaaba, and
    the great-circle distance, via the standard spherical bearing/haversine
    formulas.
    """
    lat1 = math.radians(lat_deg)
    lat2 = math.radians(KAABA_LATITUDE_DEG)
    delta_lon = math.radians(KAABA_LONGITUDE_DEG - lon_deg)

    y = math.sin(delta_lon) * math.cos(lat2)
    x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(delta_lon)
    bearing = (math.degrees(math.atan2(y, x))) % 360.0

    a = (
        math.sin((lat2 - lat1) / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(delta_lon / 2) ** 2
    )
    central_angle = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance = EARTH_MEAN_RADIUS_KM * central_angle

    return QiblaResult(bearing_deg=bearing, distance_km=distance)


def _declination_diff(dt: _dt.datetime) -> float:
    return solar.solar_position(dt).apparent_declination_deg - KAABA_LATITUDE_DEG


@dataclass(frozen=True)
class RashdulQiblaEvent:
    utc_time: _dt.datetime
    direction: str  # "ascending" (~ May) or "descending" (~ July)


def rashdul_qibla_events(year: int, tolerance_seconds: float = 1.0) -> list[RashdulQiblaEvent]:
    """
    "Rashdul Qibla" / Istiwa'ul A'zham: the two moments each year when the
    Sun is directly overhead the Kaaba (solar declination == Kaaba's
    latitude). At that exact instant, the Sun's azimuth as seen from any
    location where it is above the horizon coincides with that location's
    great-circle bearing to the Kaaba - the same spherical-triangle relation
    that qibla_direction() uses - so a plumb line's shadow there points
    exactly opposite the qibla direction. Typically ~27/28 May (ascending)
    and ~15/16 July (descending).

    Found by daily-sampling then bisecting on declination crossing the
    Kaaba's latitude, mirroring the horizon-crossing bisection in
    astronomy/_horizon.py.
    """
    start = _dt.datetime(year, 1, 1)
    end = _dt.datetime(year + 1, 1, 1)
    step = _dt.timedelta(days=1)

    samples = []
    t = start
    while t <= end:
        samples.append((t, _declination_diff(t)))
        t += step

    events = []
    for (t0, f0), (t1, f1) in zip(samples, samples[1:]):
        crosses_up = f0 <= 0 < f1
        crosses_down = f0 > 0 >= f1
        if not (crosses_up or crosses_down):
            continue

        lo, f_lo, hi = t0, f0, t1
        while (hi - lo).total_seconds() > tolerance_seconds:
            mid = lo + (hi - lo) / 2
            f_mid = _declination_diff(mid)
            if (f_mid > 0) == (f_lo > 0):
                lo, f_lo = mid, f_mid
            else:
                hi = mid

        events.append(
            RashdulQiblaEvent(
                utc_time=lo + (hi - lo) / 2,
                direction="ascending" if crosses_up else "descending",
            )
        )

    return events
