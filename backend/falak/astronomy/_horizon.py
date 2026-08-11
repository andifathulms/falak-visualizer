"""
Shared topocentric-altitude / rise-set machinery used by both visibility.py
(sunset/moonset for hilal observation) and prayer_times.py (sunrise/sunset/
solar-angle events). Not one of the CLAUDE.md-enumerated public modules -
this is internal plumbing shared to avoid duplicating the same horizon-
crossing root finder twice.

Rise/set times are found by direct bisection on the altitude function rather
than Meeus' interpolated three-point method (Ch. 15): our solar/lunar
position functions are cheap enough to evaluate at arbitrary times that a
bisection search converges to sub-second precision without needing the
interpolation shortcut, and is easier to reason about / test.
"""
from __future__ import annotations

import datetime as _dt
import math
from typing import Callable, Optional

from .timescale import datetime_from_julian_day, julian_centuries, julian_day

_DEG = math.pi / 180.0


def apparent_sidereal_time_deg(jd: float) -> float:
    """Mean sidereal time at Greenwich, degrees (Meeus eq. 12.4)."""
    t = julian_centuries(jd)
    theta0 = (
        280.46061837
        + 360.98564736629 * (jd - 2451545.0)
        + 0.000387933 * t * t
        - t**3 / 38710000
    )
    return theta0 % 360.0


def equatorial_from_ecliptic(
    lon_deg: float, lat_deg: float, obliquity_deg: float
) -> tuple[float, float]:
    """Ecliptic (lambda, beta) -> equatorial (RA, Dec), degrees (Meeus eq. 13.3/13.4)."""
    lam = lon_deg * _DEG
    bet = lat_deg * _DEG
    eps = obliquity_deg * _DEG

    ra = math.atan2(
        math.sin(lam) * math.cos(eps) - math.tan(bet) * math.sin(eps),
        math.cos(lam),
    )
    dec = math.asin(math.sin(bet) * math.cos(eps) + math.cos(bet) * math.sin(eps) * math.sin(lam))
    return (ra / _DEG) % 360.0, dec / _DEG


def altitude_deg(ra_deg: float, dec_deg: float, lat_deg: float, lon_east_deg: float, jd: float) -> float:
    """Geocentric apparent altitude of a body above the astronomical horizon."""
    lst = (apparent_sidereal_time_deg(jd) + lon_east_deg) % 360.0
    h = (lst - ra_deg) % 360.0
    if h > 180:
        h -= 360.0

    lat = lat_deg * _DEG
    dec = dec_deg * _DEG
    h_rad = h * _DEG

    sin_alt = math.sin(lat) * math.sin(dec) + math.cos(lat) * math.cos(dec) * math.cos(h_rad)
    return math.asin(max(-1.0, min(1.0, sin_alt))) / _DEG


def topocentric_altitude_deg(geocentric_altitude_deg: float, horizontal_parallax_deg: float) -> float:
    """
    Geocentric altitude -> topocentric altitude, i.e. what an observer on the
    Earth's surface sees rather than what a hypothetical observer at the
    Earth's centre would (Meeus Ch. 40).

    This matters for exactly one body: the Moon. Its horizontal parallax is
    about 0.95-1.02 deg, so a geocentric altitude overstates what anyone can
    actually see by nearly a degree near the horizon - which is the entire
    range hilal criteria operate in. For the Sun the same correction is 8.8
    arcsec and is left unapplied.

    The shift is `asin(sin(pi) * cos(alt))`, which depends on the topocentric
    altitude it is solving for; one refinement pass is enough, since the
    residual after it is well under an arcsecond for lunar parallax.

    Deliberately omitted: the observer's height above sea level and the
    Earth's flattening (Meeus' rho*sin(phi') / rho*cos(phi') terms). Both
    change the result by well under an arcminute at hilal altitudes, and
    including them would require an elevation input the app does not collect.
    """
    pi_rad = horizontal_parallax_deg * _DEG
    alt = geocentric_altitude_deg * _DEG
    for _ in range(2):
        shift = math.asin(max(-1.0, min(1.0, math.sin(pi_rad) * math.cos(alt))))
        alt = geocentric_altitude_deg * _DEG - shift
    return alt / _DEG


def moon_standard_altitude_deg(horizontal_parallax_deg: float) -> float:
    """
    The geocentric altitude at which the Moon's upper limb appears to touch the
    horizon: Meeus' h0 = 0.7275 * pi - 0.5667 deg (Ch. 15).

    The -0.8333 deg constant used for the Sun is wrong for the Moon on two
    counts - it assumes a body with no meaningful parallax, and it bakes in the
    Sun's semidiameter. For the Moon the parallax term dominates and flips the
    sign: h0 lands around +0.12 deg, so moonset happens measurably earlier than
    a solar-style threshold would place it. That difference propagates straight
    into lag time and into the wujudul hilal verdict, which is a comparison of
    moonset against sunset.
    """
    return 0.7275 * horizontal_parallax_deg - 0.5667


PositionFunc = Callable[[_dt.datetime], tuple[float, float]]  # dt -> (ra_deg, dec_deg)


def _local_noon_utc(date: _dt.date, lon_east_deg: float) -> _dt.datetime:
    """Rough UTC instant of local mean noon, used only as a search-window anchor."""
    offset_hours = lon_east_deg / 15.0
    naive_noon = _dt.datetime(date.year, date.month, date.day, 12, 0, 0)
    return naive_noon - _dt.timedelta(hours=offset_hours)


def find_horizon_crossing(
    date: _dt.date,
    lat_deg: float,
    lon_east_deg: float,
    position_func: PositionFunc,
    target_altitude_deg: float,
    rising: bool,
    tolerance_seconds: float = 1.0,
) -> Optional[_dt.datetime]:
    """
    Find the UTC instant the body crosses target_altitude_deg (ascending for
    rising=True i.e. sunrise/moonrise, descending for rising=False i.e.
    sunset/moonset) within the local calendar day `date`. Returns None if no
    such crossing exists that day (e.g. polar conditions).
    """
    window_start = _local_noon_utc(date, lon_east_deg) - _dt.timedelta(hours=12)
    window_end = window_start + _dt.timedelta(hours=36)

    def alt_diff(dt: _dt.datetime) -> float:
        ra, dec = position_func(dt)
        jd = julian_day(dt)
        return altitude_deg(ra, dec, lat_deg, lon_east_deg, jd) - target_altitude_deg

    step = _dt.timedelta(minutes=10)
    samples = []
    t = window_start
    while t <= window_end:
        samples.append((t, alt_diff(t)))
        t += step

    target_local_hour = 6 if rising else 18
    best_bracket = None
    best_distance = None
    for (t0, f0), (t1, f1) in zip(samples, samples[1:]):
        crosses_up = f0 <= 0 < f1
        crosses_down = f0 > 0 >= f1
        if (rising and crosses_up) or (not rising and crosses_down):
            local_hour = ((t0 - window_start).total_seconds() / 3600.0 + 12) % 24
            distance = min(abs(local_hour - target_local_hour), 24 - abs(local_hour - target_local_hour))
            if best_distance is None or distance < best_distance:
                best_distance = distance
                best_bracket = (t0, f0, t1, f1)

    if best_bracket is None:
        return None

    lo, f_lo, hi, f_hi = best_bracket
    while (hi - lo).total_seconds() > tolerance_seconds:
        mid = lo + (hi - lo) / 2
        f_mid = alt_diff(mid)
        if (f_mid > 0) == (f_lo > 0):
            lo, f_lo = mid, f_mid
        else:
            hi, f_hi = mid, f_mid

    return lo + (hi - lo) / 2
