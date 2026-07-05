"""
Ijtimak (lunar conjunction) solver: the moment the Moon's and Sun's apparent
geocentric ecliptic longitudes coincide.

We seed the search with Meeus' mean new-moon polynomial (Ch. 49, eq. 49.1),
which is accurate to a few hours, then refine to sub-minute precision by
root-finding the actual longitude difference produced by this package's
solar.py / lunar.py implementations. The mean-new-moon formula is only ever
used as a starting guess - the returned time is always the true instant
where our own solar/lunar engine reports equal longitudes, not the mean-moon
approximation itself.
"""
from __future__ import annotations

import datetime as _dt
import math

from . import lunar, solar
from .timescale import datetime_from_julian_day, julian_centuries, julian_day

SYNODIC_MONTH_DAYS = 29.530588861


def _wrap180(deg: float) -> float:
    d = deg % 360.0
    if d > 180:
        d -= 360.0
    return d


def _mean_new_moon_jd(k: float) -> float:
    """Meeus eq. 49.1: mean new moon JDE for lunation number k."""
    t = k / 1236.85
    return (
        2451550.09766
        + SYNODIC_MONTH_DAYS * k
        + 0.00015437 * t * t
        - 0.000000150 * t**3
        + 0.00000000073 * t**4
    )


def _lunation_estimate(dt: _dt.datetime) -> float:
    """Approximate lunation number k for the new moon nearest dt (Meeus 49)."""
    year_fraction = dt.year + (dt.timetuple().tm_yday - 1) / 365.25
    return (year_fraction - 2000.0) * 12.3685


def _longitude_diff_deg(jd: float) -> float:
    """Moon apparent longitude minus Sun apparent longitude, wrapped to [-180, 180]."""
    dt = datetime_from_julian_day(jd)
    sun_lon = solar.solar_position(dt).apparent_longitude_deg
    moon_lon = lunar.lunar_position(dt).apparent_longitude_deg
    return _wrap180(moon_lon - sun_lon)


def _refine_conjunction_jd(jd_guess: float, tolerance_days: float = 1e-6) -> float:
    """
    Bisection refinement of the JD at which longitude_diff crosses zero,
    bracketing jd_guess with a half-day window (the longitude difference
    moves ~13 deg/day near conjunction, so a half-day window comfortably
    brackets a single root around a mean-new-moon estimate accurate to a
    few hours).
    """
    lo = jd_guess - 0.5
    hi = jd_guess + 0.5
    f_lo = _longitude_diff_deg(lo)
    f_hi = _longitude_diff_deg(hi)

    if f_lo == 0.0:
        return lo
    if f_hi == 0.0:
        return hi
    if (f_lo > 0) == (f_hi > 0):
        # Guess wasn't close enough to bracket the root; widen once.
        lo, hi = jd_guess - 2.0, jd_guess + 2.0
        f_lo, f_hi = _longitude_diff_deg(lo), _longitude_diff_deg(hi)

    while hi - lo > tolerance_days:
        mid = (lo + hi) / 2
        f_mid = _longitude_diff_deg(mid)
        if (f_mid > 0) == (f_lo > 0):
            lo, f_lo = mid, f_mid
        else:
            hi, f_hi = mid, f_mid

    return (lo + hi) / 2


def conjunction_near(dt: _dt.datetime) -> _dt.datetime:
    """The ijtimak whose mean estimate is closest to dt (may be before or after)."""
    k = round(_lunation_estimate(dt))
    jd_guess = _mean_new_moon_jd(k)
    jd_exact = _refine_conjunction_jd(jd_guess)
    return datetime_from_julian_day(jd_exact)


def next_conjunction(after: _dt.datetime) -> _dt.datetime:
    """First ijtimak strictly after `after`."""
    k = math.floor(_lunation_estimate(after))
    for candidate_k in (k, k + 1, k + 2):
        jd_guess = _mean_new_moon_jd(candidate_k)
        jd_exact = _refine_conjunction_jd(jd_guess)
        candidate_dt = datetime_from_julian_day(jd_exact)
        if candidate_dt > after:
            return candidate_dt
    raise RuntimeError("failed to bracket next conjunction")  # pragma: no cover


def previous_conjunction(before: _dt.datetime) -> _dt.datetime:
    """Last ijtimak strictly before `before`."""
    k = math.ceil(_lunation_estimate(before))
    for candidate_k in (k, k - 1, k - 2):
        jd_guess = _mean_new_moon_jd(candidate_k)
        jd_exact = _refine_conjunction_jd(jd_guess)
        candidate_dt = datetime_from_julian_day(jd_exact)
        if candidate_dt < before:
            return candidate_dt
    raise RuntimeError("failed to bracket previous conjunction")  # pragma: no cover
