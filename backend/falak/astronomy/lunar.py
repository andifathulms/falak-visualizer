"""
Geocentric lunar position, per Jean Meeus, *Astronomical Algorithms*, 2nd ed.,
Chapter 47 ("Position of the Moon") - the truncated ELP2000-82B series Meeus
publishes (60 periodic terms each for longitude/distance and for latitude).
This is the standard "well-tested truncated implementation" CLAUDE.md calls
for in place of a full multi-thousand-term ELP2000 evaluation.

IMPORTANT: the 120 numeric coefficients below were transcribed from memory
of the published table, not machine-copied from the source. They are
validated inline against Meeus' own worked Example 47.a (1992-04-12 TD) in
this module's test coverage, which matches to within the book's quoted
precision - but per PRD Sec. 5 / CLAUDE.md Phase 0 Step 7, an independent
cross-check against Skyfield + JPL DE440 over >=50 historical months is
still required before this table is trusted for production hilal-visibility
verdicts. That cross-check needs network access to install Skyfield/fetch
the ephemeris and has not been run in this environment - do not mark Phase 0
validation complete until it has.
"""
from __future__ import annotations

import datetime as _dt
import math
from dataclasses import dataclass

from .timescale import julian_centuries, julian_day

_DEG = math.pi / 180.0
EARTH_EQUATORIAL_RADIUS_KM = 6378.14

# Table 47.A: D, M, M', F, coeff_l (1e-6 deg), coeff_r (1e-3 km)
_TABLE_A = [
    (0, 0, 1, 0, 6288774, -20905355),
    (2, 0, -1, 0, 1274027, -3699111),
    (2, 0, 0, 0, 658314, -2955968),
    (0, 0, 2, 0, 213618, -569925),
    (0, 1, 0, 0, -185116, 48888),
    (0, 0, 0, 2, -114332, -3149),
    (2, 0, -2, 0, 58793, 246158),
    (2, -1, -1, 0, 57066, -152138),
    (2, 0, 1, 0, 53322, -170733),
    (2, -1, 0, 0, 45758, -204586),
    (0, 1, -1, 0, -40923, -129620),
    (1, 0, 0, 0, -34720, 108743),
    (0, 1, 1, 0, -30383, 104755),
    (2, 0, 0, -2, 15327, 10321),
    (0, 0, 1, 2, -12528, 0),
    (0, 0, 1, -2, 10980, 79661),
    (4, 0, -1, 0, 10675, -34782),
    (0, 0, 3, 0, 10034, -23210),
    (4, 0, -2, 0, 8548, -21636),
    (2, 1, -1, 0, -7888, 24208),
    (2, 1, 0, 0, -6766, 30824),
    (1, 0, -1, 0, -5163, -8379),
    (1, 1, 0, 0, 4987, -16675),
    (2, -1, 1, 0, 4036, -12831),
    (2, 0, 2, 0, 3994, -10445),
    (4, 0, 0, 0, 3861, -11650),
    (2, 0, -3, 0, 3665, 14403),
    (0, 1, -2, 0, -2689, -7003),
    (2, 0, -1, 2, -2602, 0),
    (2, -1, -2, 0, 2390, 10056),
    (1, 0, 1, 0, -2348, 6322),
    (2, -2, 0, 0, 2236, -9884),
    (0, 1, 2, 0, -2120, 5751),
    (0, 2, 0, 0, -2069, 0),
    (2, -2, -1, 0, 2048, -4950),
    (2, 0, 1, -2, -1773, 4130),
    (2, 0, 0, 2, -1595, 0),
    (4, -1, -1, 0, 1215, -3958),
    (0, 0, 2, 2, -1110, 0),
    (3, 0, -1, 0, -892, 3258),
    (2, 1, 1, 0, -810, 2616),
    (4, -1, -2, 0, 759, -1897),
    (0, 2, -1, 0, -713, -2117),
    (2, 2, -1, 0, -700, 2354),
    (2, 1, -2, 0, 691, 0),
    (2, -1, 0, -2, 596, 0),
    (4, 0, 1, 0, 549, -1423),
    (0, 0, 4, 0, 537, -1117),
    (4, -1, 0, 0, 520, -1571),
    (1, 0, -2, 0, -487, -1739),
    (2, 1, 0, -2, -399, 0),
    (0, 0, 2, -2, -381, -4421),
    (1, 1, 1, 0, 351, 0),
    (3, 0, -2, 0, -340, 0),
    (4, 0, -3, 0, 330, 0),
    (2, -1, 2, 0, 327, 0),
    (0, 2, 1, 0, -323, 1165),
    (1, 1, -1, 0, 299, 0),
    (2, 0, 3, 0, 294, 0),
    (2, 0, -1, -2, 0, 8752),
]

# Table 47.B: D, M, M', F, coeff_b (1e-6 deg)
_TABLE_B = [
    (0, 0, 0, 1, 5128122),
    (0, 0, 1, 1, 280602),
    (0, 0, 1, -1, 277693),
    (2, 0, 0, -1, 173237),
    (2, 0, -1, 1, 55413),
    (2, 0, -1, -1, 46271),
    (2, 0, 0, 1, 32573),
    (0, 0, 2, 1, 17198),
    (2, 0, 1, -1, 9266),
    (0, 0, 2, -1, 8822),
    (2, -1, 0, -1, 8216),
    (2, 0, -2, -1, 4324),
    (2, 0, 1, 1, 4200),
    (2, 1, 0, -1, -3359),
    (2, -1, -1, 1, 2463),
    (2, -1, 0, 1, 2211),
    (2, -1, -1, -1, 2065),
    (0, 1, -1, -1, -1870),
    (4, 0, -1, -1, 1828),
    (0, 1, 0, 1, -1794),
    (0, 0, 0, 3, -1749),
    (0, 1, -1, 1, -1565),
    (1, 0, 0, 1, -1491),
    (0, 1, 1, 1, -1475),
    (0, 1, 1, -1, -1410),
    (0, 1, 0, -1, -1344),
    (1, 0, 0, -1, -1335),
    (0, 0, 3, 1, 1107),
    (4, 0, 0, -1, 1021),
    (4, 0, -1, 1, 833),
    (0, 0, 1, -3, 777),
    (4, 0, -2, 1, 671),
    (2, 0, 0, -3, 607),
    (2, 0, 2, -1, 596),
    (2, -1, 1, -1, 491),
    (2, 0, -2, 1, -451),
    (0, 0, 3, -1, 439),
    (2, 0, 2, 1, 422),
    (2, 0, -3, -1, 421),
    (2, 1, -1, 1, -366),
    (2, 1, 0, 1, -351),
    (4, 0, 0, 1, 331),
    (2, -1, 1, 1, 315),
    (2, -2, 0, -1, 302),
    (0, 0, 1, 3, -283),
    (2, 1, 1, -1, -229),
    (1, 1, 0, -1, 223),
    (1, 1, 0, 1, 223),
    (0, 1, -2, -1, -220),
    (2, 1, -1, -1, -220),
    (1, 0, 1, 1, -185),
    (2, -1, -2, -1, 181),
    (0, 1, 2, 1, -177),
    (4, 0, -2, -1, 176),
    (4, -1, -1, -1, 166),
    (1, 0, 1, -1, -164),
    (4, 0, 1, -1, 132),
    (1, 0, -1, -1, -119),
    (4, -1, 0, -1, 115),
    (2, -2, 0, 1, 107),
]


def _norm_degrees(deg: float) -> float:
    d = deg % 360.0
    return d + 360.0 if d < 0 else d


def mean_longitude(t: float) -> float:
    return _norm_degrees(
        218.3164477
        + 481267.88123421 * t
        - 0.0015786 * t**2
        + t**3 / 538841
        - t**4 / 65194000
    )


def mean_elongation(t: float) -> float:
    return _norm_degrees(
        297.8501921
        + 445267.1114034 * t
        - 0.0018819 * t**2
        + t**3 / 545868
        - t**4 / 113065000
    )


def sun_mean_anomaly(t: float) -> float:
    return _norm_degrees(
        357.5291092 + 35999.0502909 * t - 0.0001536 * t**2 + t**3 / 24490000
    )


def moon_mean_anomaly(t: float) -> float:
    return _norm_degrees(
        134.9633964
        + 477198.8675055 * t
        + 0.0087414 * t**2
        + t**3 / 69699
        - t**4 / 14712000
    )


def argument_of_latitude(t: float) -> float:
    return _norm_degrees(
        93.2720950
        - 0.0036539 * t**2
        + 483202.0175233 * t
        - t**3 / 3526000
        + t**4 / 863310000
    )


def eccentricity_correction(t: float) -> float:
    """E, correction factor applied when a term's |M| coefficient is nonzero."""
    return 1 - 0.002516 * t - 0.0000074 * t * t


@dataclass(frozen=True)
class LunarPosition:
    jd: float
    t: float
    apparent_longitude_deg: float
    ecliptic_latitude_deg: float
    distance_km: float
    horizontal_parallax_deg: float


def lunar_position(dt: _dt.datetime) -> LunarPosition:
    """Geocentric ecliptic longitude/latitude and Earth-Moon distance."""
    jd = julian_day(dt)
    t = julian_centuries(jd)

    l_ = mean_longitude(t)
    d = mean_elongation(t)
    m = sun_mean_anomaly(t)
    mp = moon_mean_anomaly(t)
    f = argument_of_latitude(t)
    e = eccentricity_correction(t)

    a1 = _norm_degrees(119.75 + 131.849 * t)
    a2 = _norm_degrees(53.09 + 479264.290 * t)
    a3 = _norm_degrees(313.45 + 481266.484 * t)

    sigma_l = 0.0
    sigma_r = 0.0
    for d_c, m_c, mp_c, f_c, coeff_l, coeff_r in _TABLE_A:
        arg = (d_c * d + m_c * m + mp_c * mp + f_c * f) * _DEG
        e_factor = e ** abs(m_c)
        sigma_l += coeff_l * e_factor * math.sin(arg)
        sigma_r += coeff_r * e_factor * math.cos(arg)

    sigma_b = 0.0
    for d_c, m_c, mp_c, f_c, coeff_b in _TABLE_B:
        arg = (d_c * d + m_c * m + mp_c * mp + f_c * f) * _DEG
        e_factor = e ** abs(m_c)
        sigma_b += coeff_b * e_factor * math.sin(arg)

    sigma_l += (
        3958 * math.sin(a1 * _DEG)
        + 1962 * math.sin((l_ - f) * _DEG)
        + 318 * math.sin(a2 * _DEG)
    )
    sigma_b += (
        -2235 * math.sin(l_ * _DEG)
        + 382 * math.sin(a3 * _DEG)
        + 175 * math.sin((a1 - f) * _DEG)
        + 175 * math.sin((a1 + f) * _DEG)
        + 127 * math.sin((l_ - mp) * _DEG)
        - 115 * math.sin((l_ + mp) * _DEG)
    )

    longitude = _norm_degrees(l_ + sigma_l / 1_000_000)
    latitude = sigma_b / 1_000_000
    distance_km = 385000.56 + sigma_r / 1000

    horizontal_parallax = math.asin(EARTH_EQUATORIAL_RADIUS_KM / distance_km) / _DEG

    return LunarPosition(
        jd=jd,
        t=t,
        apparent_longitude_deg=longitude,
        ecliptic_latitude_deg=latitude,
        distance_km=distance_km,
        horizontal_parallax_deg=horizontal_parallax,
    )


def illuminated_fraction(sun_apparent_longitude_deg: float, moon: LunarPosition) -> float:
    """
    k, the illuminated fraction of the Moon's disk (Meeus Ch. 48, eq. 48.1/48.2),
    using the geocentric elongation approximation (ignoring the small
    Earth-Sun-distance correction, negligible for illumination-fraction
    purposes at the precision this product needs).
    """
    elongation = math.acos(
        math.cos(moon.ecliptic_latitude_deg * _DEG)
        * math.cos((moon.apparent_longitude_deg - sun_apparent_longitude_deg) * _DEG)
    )
    phase_angle = math.pi - elongation
    return (1 + math.cos(phase_angle)) / 2
