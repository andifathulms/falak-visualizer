"""
Time-scale utilities shared by the astronomy engine.

All position algorithms in this package (solar.py, lunar.py) are expressed
in Julian centuries of Dynamical Time (TD) since epoch J2000.0, following
Meeus, *Astronomical Algorithms*, 2nd ed., Ch. 7 and 10.

We approximate TD ~= UTC for the purposes of this engine (Delta T is on the
order of ~70s in the modern era, negligible for hilal visibility / prayer
time purposes at day resolution) but expose `delta_t_seconds` so callers
needing sub-minute timing precision can apply the correction explicitly
rather than have it silently ignored.
"""
from __future__ import annotations

import datetime as _dt
import math

J2000 = 2451545.0


def julian_day(dt: _dt.datetime) -> float:
    """Julian Day Number for a timezone-aware or naive UTC datetime."""
    if dt.tzinfo is not None:
        dt = dt.astimezone(_dt.timezone.utc).replace(tzinfo=None)

    year, month = dt.year, dt.month
    day = (
        dt.day
        + dt.hour / 24.0
        + dt.minute / 1440.0
        + (dt.second + dt.microsecond / 1e6) / 86400.0
    )

    if month <= 2:
        year -= 1
        month += 12

    a = math.floor(year / 100)
    b = 2 - a + math.floor(a / 4)  # Gregorian calendar correction (Meeus 7.1)

    jd = (
        math.floor(365.25 * (year + 4716))
        + math.floor(30.6001 * (month + 1))
        + day
        + b
        - 1524.5
    )
    return jd


def julian_centuries(jd: float) -> float:
    """Julian centuries (T) since J2000.0, per Meeus eq. 25.1 / 22.1."""
    return (jd - J2000) / 36525.0


def datetime_from_julian_day(jd: float) -> _dt.datetime:
    """Inverse of julian_day: JD -> naive UTC datetime (Meeus Ch. 7)."""
    jd = jd + 0.5
    z = math.floor(jd)
    f = jd - z

    if z < 2299161:
        a = z
    else:
        alpha = math.floor((z - 1867216.25) / 36524.25)
        a = z + 1 + alpha - math.floor(alpha / 4)

    b = a + 1524
    c = math.floor((b - 122.1) / 365.25)
    d = math.floor(365.25 * c)
    e = math.floor((b - d) / 30.6001)

    day_frac = b - d - math.floor(30.6001 * e) + f
    day = math.floor(day_frac)
    frac = day_frac - day

    month = e - 1 if e < 14 else e - 13
    year = c - 4716 if month > 2 else c - 4715

    total_seconds = round(frac * 86400.0)
    hour, remainder = divmod(total_seconds, 3600)
    minute, second = divmod(remainder, 60)

    return _dt.datetime(int(year), int(month), int(day), int(hour), int(minute), int(second))


def delta_t_seconds(year: float) -> float:
    """
    Approximate Delta T (TD - UT) in seconds, per Espenak & Meeus (2006)
    polynomial fit. Good to a few seconds in the 1900-2100 range, which is
    the practically relevant range for this product.
    """
    if 2005 <= year <= 2050:
        t = year - 2005
        return 62.92 + 0.32217 * t + 0.005589 * t * t
    if 1986 <= year < 2005:
        t = year - 2000
        return (
            63.86
            + 0.3345 * t
            - 0.060374 * t**2
            + 0.0017275 * t**3
            + 0.000651814 * t**4
            + 0.00002373599 * t**5
        )
    if 1961 <= year < 1986:
        t = year - 1975
        return 45.45 + 1.067 * t - t**2 / 260 - t**3 / 718
    # Outside the tightly-fit ranges: fall back to the long-term parabola.
    # This is explicitly a rough estimate; callers needing sub-minute
    # accuracy far from the present should not rely on it.
    u = (year - 1820) / 100
    return -20 + 32 * u * u
