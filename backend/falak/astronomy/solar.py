"""
Apparent geocentric solar position, per Jean Meeus, *Astronomical Algorithms*,
2nd ed., Chapter 25 ("Solar Coordinates" - lower-precision method, accurate
to about 0.01 degree in longitude, which is well within the tolerance needed
for hilal visibility, prayer time and qibla-adjacent solar calculations).

This is a truncated series (the full VSOP87 has ~2000 periodic terms across
its higher-order series); Meeus' Ch. 25 method keeps only the dominant terms
of that expansion and is the well-tested reference implementation CLAUDE.md
calls for.
"""
from __future__ import annotations

import datetime as _dt
import math
from dataclasses import dataclass

from .timescale import julian_centuries, julian_day

_DEG = math.pi / 180.0


def _norm_degrees(deg: float) -> float:
    d = deg % 360.0
    return d + 360.0 if d < 0 else d


def geometric_mean_longitude(t: float) -> float:
    """L0, degrees (Meeus eq. 25.2)."""
    return _norm_degrees(280.46646 + 36000.76983 * t + 0.0003032 * t * t)


def mean_anomaly(t: float) -> float:
    """M, degrees (Meeus eq. 25.3)."""
    return _norm_degrees(357.52911 + 35999.05029 * t - 0.0001537 * t * t)


def eccentricity(t: float) -> float:
    """Eccentricity of Earth's orbit, e (Meeus eq. 25.4)."""
    return 0.016708634 - 0.000042037 * t - 0.0000001267 * t * t


def equation_of_center(t: float, m_deg: float) -> float:
    """C, degrees (Meeus, Ch. 25)."""
    m = m_deg * _DEG
    return (
        (1.914602 - 0.004817 * t - 0.000014 * t * t) * math.sin(m)
        + (0.019993 - 0.000101 * t) * math.sin(2 * m)
        + 0.000289 * math.sin(3 * m)
    )


def obliquity_of_ecliptic(t: float) -> float:
    """Mean obliquity of the ecliptic, epsilon0, degrees (Meeus eq. 22.2)."""
    seconds = (
        21.448
        - 46.8150 * t
        - 0.00059 * t * t
        + 0.001813 * t * t * t
    )
    return 23.0 + 26.0 / 60.0 + seconds / 3600.0


@dataclass(frozen=True)
class SolarPosition:
    jd: float
    t: float
    geometric_mean_longitude_deg: float
    mean_anomaly_deg: float
    true_anomaly_deg: float
    true_longitude_deg: float
    apparent_longitude_deg: float
    radius_vector_au: float
    apparent_right_ascension_deg: float
    apparent_declination_deg: float
    apparent_obliquity_deg: float


def solar_position(dt: _dt.datetime) -> SolarPosition:
    """Apparent geocentric solar position for a UTC datetime."""
    jd = julian_day(dt)
    t = julian_centuries(jd)

    l0 = geometric_mean_longitude(t)
    m = mean_anomaly(t)
    e = eccentricity(t)
    c = equation_of_center(t, m)

    true_longitude = l0 + c
    true_anomaly = m + c

    radius_vector = (1.000001018 * (1 - e * e)) / (
        1 + e * math.cos(true_anomaly * _DEG)
    )

    omega = _norm_degrees(125.04 - 1934.136 * t)
    apparent_longitude = true_longitude - 0.00569 - 0.00478 * math.sin(omega * _DEG)

    epsilon0 = obliquity_of_ecliptic(t)
    epsilon_corrected = epsilon0 + 0.00256 * math.cos(omega * _DEG)

    lam = apparent_longitude * _DEG
    eps = epsilon_corrected * _DEG

    alpha = math.atan2(math.cos(eps) * math.sin(lam), math.cos(lam))
    alpha_deg = _norm_degrees(alpha / _DEG)

    delta = math.asin(math.sin(eps) * math.sin(lam))
    delta_deg = delta / _DEG

    return SolarPosition(
        jd=jd,
        t=t,
        geometric_mean_longitude_deg=l0,
        mean_anomaly_deg=m,
        true_anomaly_deg=_norm_degrees(true_anomaly),
        true_longitude_deg=_norm_degrees(true_longitude),
        apparent_longitude_deg=_norm_degrees(apparent_longitude),
        radius_vector_au=radius_vector,
        apparent_right_ascension_deg=alpha_deg,
        apparent_declination_deg=delta_deg,
        apparent_obliquity_deg=epsilon_corrected,
    )


def equation_of_time_minutes(dt: _dt.datetime) -> float:
    """
    Equation of time E, in minutes (Meeus Ch. 28, eq. 28.3), using the
    apparent RA already computed. E = L0 - 0.0057183 - alpha + delta_psi*cos(eps)
    simplified here via the low-precision variant Meeus gives as acceptable
    to ~0.1 minute for this purpose (nutation-in-longitude term dropped,
    since its contribution is sub-second here relative to the arcminute
    tolerances this product targets).
    """
    pos = solar_position(dt)
    l0 = pos.geometric_mean_longitude_deg
    alpha = pos.apparent_right_ascension_deg

    diff = _norm_degrees(l0 - alpha)
    if diff > 180:
        diff -= 360

    return diff * 4.0  # 1 degree = 4 minutes of time
