"""
Hilal (new crescent) visibility: observational quantities at sunset on the
29th of a Hijri month, and the three classification criteria named in the
PRD - wujudul hilal, MABIMS 2021 (imkanur rukyat), and Odeh (2004).

Every criterion function here is a pure function of already-computed
observational numbers (altitude, elongation, etc.) - never a black box - so
the UI can always show the inputs that produced a verdict (CLAUDE.md
"every verdict must be inspectable").
"""
from __future__ import annotations

import datetime as _dt
import math
from dataclasses import dataclass

from . import conjunction, lunar, solar
from ._horizon import (
    altitude_deg,
    equatorial_from_ecliptic,
    find_horizon_crossing,
    moon_standard_altitude_deg,
    topocentric_altitude_deg,
)
from .timescale import julian_day


def _sun_ra_dec(dt: _dt.datetime) -> tuple[float, float]:
    p = solar.solar_position(dt)
    return p.apparent_right_ascension_deg, p.apparent_declination_deg


def _moon_ra_dec(dt: _dt.datetime) -> tuple[float, float]:
    moon = lunar.lunar_position(dt)
    eps = solar.obliquity_of_ecliptic(moon.t)
    return equatorial_from_ecliptic(moon.apparent_longitude_deg, moon.ecliptic_latitude_deg, eps)


def _elongation_deg(sun_ra: float, sun_dec: float, moon_ra: float, moon_dec: float) -> float:
    """Angular separation between Sun and Moon, via the spherical law of cosines."""
    cos_elong = math.sin(math.radians(sun_dec)) * math.sin(math.radians(moon_dec)) + math.cos(
        math.radians(sun_dec)
    ) * math.cos(math.radians(moon_dec)) * math.cos(math.radians(moon_ra - sun_ra))
    return math.degrees(math.acos(max(-1.0, min(1.0, cos_elong))))


@dataclass(frozen=True)
class HilalObservation:
    date: _dt.date
    latitude_deg: float
    longitude_deg: float
    conjunction_time: _dt.datetime
    sunset_time: _dt.datetime
    moonset_time: "_dt.datetime | None"
    moon_altitude_deg: float
    sun_altitude_deg: float
    elongation_deg: float
    moon_age_hours: float
    illumination_fraction: float
    lag_time_minutes: "float | None"
    crescent_width_arcmin: float


def compute_hilal_observation(date: _dt.date, lat_deg: float, lon_deg: float) -> HilalObservation:
    """
    All raw numbers needed to evaluate hilal visibility criteria at sunset
    on the given (Gregorian) evening.
    """
    sunset = find_horizon_crossing(date, lat_deg, lon_deg, _sun_ra_dec, -0.8333, rising=False)
    if sunset is None:
        raise ValueError(f"no sunset found for {date} at ({lat_deg}, {lon_deg})")

    # Moonset uses the Moon's own standard altitude, not the Sun's -0.8333.
    # Parallax varies by ~1e-4 deg/hour, so evaluating it at sunset rather than
    # iterating to the crossing instant is accurate to far better than the
    # bisection tolerance.
    moon_parallax_at_sunset = lunar.lunar_position(sunset).horizontal_parallax_deg
    moonset = find_horizon_crossing(
        date,
        lat_deg,
        lon_deg,
        _moon_ra_dec,
        moon_standard_altitude_deg(moon_parallax_at_sunset),
        rising=False,
    )

    conj = conjunction.previous_conjunction(sunset)

    sun_ra, sun_dec = _sun_ra_dec(sunset)
    moon = lunar.lunar_position(sunset)
    moon_ra, moon_dec = _moon_ra_dec(sunset)

    jd = julian_day(sunset)
    # Topocentric, because that is what every criterion below is defined
    # against: MABIMS 2021's 3 deg is a topocentric altitude, and Odeh's ARCV
    # is explicitly a topocentric arc of vision. Feeding either a geocentric
    # altitude overstates it by close to a degree - an order of magnitude more
    # than the margins these thresholds are decided by.
    moon_alt = topocentric_altitude_deg(
        altitude_deg(moon_ra, moon_dec, lat_deg, lon_deg, jd),
        moon.horizontal_parallax_deg,
    )
    sun_alt = altitude_deg(sun_ra, sun_dec, lat_deg, lon_deg, jd)

    # Geocentric, and deliberately so. Whether MABIMS' 6.4 deg elongation is
    # topocentric or geocentric is genuinely unsettled - PBNU has argued for the
    # topocentric reading, and practice differs across MABIMS members - so this
    # keeps the conventional geocentric value and states the choice in the UI
    # rather than silently picking a side. The difference is ~0.1-0.2 deg.
    elongation = _elongation_deg(sun_ra, sun_dec, moon_ra, moon_dec)

    moon_age_hours = (sunset - conj).total_seconds() / 3600.0

    sun_lon = solar.solar_position(sunset).apparent_longitude_deg
    illumination = lunar.illuminated_fraction(sun_lon, moon)

    lag_time = (moonset - sunset).total_seconds() / 60.0 if moonset else None

    moon_sd_arcmin = 358473400.0 / moon.distance_km / 60.0  # angular semidiameter, arcmin
    crescent_width = moon_sd_arcmin * (1 - math.cos(math.radians(elongation)))

    return HilalObservation(
        date=date,
        latitude_deg=lat_deg,
        longitude_deg=lon_deg,
        conjunction_time=conj,
        sunset_time=sunset,
        moonset_time=moonset,
        moon_altitude_deg=moon_alt,
        sun_altitude_deg=sun_alt,
        elongation_deg=elongation,
        moon_age_hours=moon_age_hours,
        illumination_fraction=illumination,
        lag_time_minutes=lag_time,
        crescent_width_arcmin=crescent_width,
    )


@dataclass(frozen=True)
class TrajectoryPoint:
    time: _dt.datetime
    minutes_from_sunset: float
    moon_altitude_deg: float
    sun_altitude_deg: float
    elongation_deg: float


def hilal_trajectory(
    date: _dt.date,
    lat_deg: float,
    lon_deg: float,
    window_minutes: float = 30.0,
    step_minutes: float = 5.0,
) -> list[TrajectoryPoint]:
    """
    Moon/Sun altitude and elongation sampled every `step_minutes` across a
    window centered on sunset (+/- window_minutes) - lets a UI plot how
    conditions evolve around the moment of interest, rather than showing
    only the single-instant sunset numbers (CLAUDE.md: every verdict must
    be inspectable, not just as a snapshot).
    """
    sunset = find_horizon_crossing(date, lat_deg, lon_deg, _sun_ra_dec, -0.8333, rising=False)
    if sunset is None:
        raise ValueError(f"no sunset found for {date} at ({lat_deg}, {lon_deg})")

    points = []
    offset = -window_minutes
    while offset <= window_minutes + 1e-9:
        t = sunset + _dt.timedelta(minutes=offset)
        sun_ra, sun_dec = _sun_ra_dec(t)
        moon_ra, moon_dec = _moon_ra_dec(t)
        moon_parallax = lunar.lunar_position(t).horizontal_parallax_deg
        jd = julian_day(t)
        points.append(
            TrajectoryPoint(
                time=t,
                minutes_from_sunset=offset,
                moon_altitude_deg=topocentric_altitude_deg(
                    altitude_deg(moon_ra, moon_dec, lat_deg, lon_deg, jd), moon_parallax
                ),
                sun_altitude_deg=altitude_deg(sun_ra, sun_dec, lat_deg, lon_deg, jd),
                elongation_deg=_elongation_deg(sun_ra, sun_dec, moon_ra, moon_dec),
            )
        )
        offset += step_minutes

    return points


def wujudul_hilal(moonset: "_dt.datetime | None", sunset: _dt.datetime, conjunction_time: _dt.datetime) -> bool:
    """
    Wujudul hilal: the hilal is deemed "present" if, on the day of the 29th,
    (1) conjunction has already occurred before sunset, and (2) the Moon
    sets after the Sun (positive lag time) - regardless of whether the
    crescent would actually be visible to an observer.
    """
    if moonset is None:
        return False
    return conjunction_time < sunset and moonset > sunset


MABIMS_MIN_ALTITUDE_DEG = 3.0
MABIMS_MIN_ELONGATION_DEG = 6.4


def mabims_2021(altitude_deg: float, elongation_deg: float) -> bool:
    """
    MABIMS 2021 imkanur rukyat (neo-MABIMS) criterion: visible if the Moon's
    altitude is at least 3 degrees AND elongation is at least 6.4 degrees.
    """
    return altitude_deg >= MABIMS_MIN_ALTITUDE_DEG and elongation_deg >= MABIMS_MIN_ELONGATION_DEG


def odeh_v_value(altitude_deg: float, crescent_width_arcmin: "float | None") -> float:
    """
    Odeh's continuous v-value, extracted so callers can report how far a
    classification sat from its nearest boundary rather than discarding the
    number at the comparison chain below. Same expression as before - a
    refactor, not a change - so the existing golden vectors still pin it
    through the classification they already assert.
    """
    arcv = altitude_deg + 0.8333
    w = 0.0 if crescent_width_arcmin is None else crescent_width_arcmin
    return arcv - (-0.1018 * w**3 + 0.7319 * w**2 - 6.3226 * w + 7.1651)


def odeh_criterion(altitude_deg: float, elongation_deg: float, crescent_width_arcmin: "float | None" = None) -> str:
    """
    Odeh (2004) criterion, classifying visibility on a continuous scale
    rather than a bare boolean. ARCV (topocentric arc of vision) is taken
    here as the Moon's altitude above the horizon at the moment of sunset
    (sun altitude is -0.8333 deg by definition at that instant) - a
    documented simplification of Yallop/Odeh's "best time" (Sun at roughly
    -4.5 deg), which would require re-evaluating altitude/elongation at a
    slightly later moment. Good enough for a first-pass classification;
    revisit if validation against published Odeh tables shows drift.

    Returns one of: "visible", "visible_optical_aid", "marginal", "not_visible".
    """
    v = odeh_v_value(altitude_deg, crescent_width_arcmin)

    if v >= 5.65:
        return "visible"
    if v >= 2.0:
        return "visible_optical_aid"
    if v >= -0.96:
        return "marginal"
    return "not_visible"
