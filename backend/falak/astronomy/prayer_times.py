"""
Daily prayer times from solar position: fajr/isya (configurable depression
angle), dhuhr (solar transit + correction), asr (shadow-length method),
maghrib (sunset), plus sunrise. All times are refraction-corrected the same
way solar rise/set already is in _horizon.py (-0.8333 deg apparent altitude).
"""
from __future__ import annotations

import datetime as _dt
import math
from dataclasses import dataclass

from . import solar
from ._horizon import altitude_deg, apparent_sidereal_time_deg, find_horizon_crossing
from .timescale import julian_day


def _sun_ra_dec(dt: _dt.datetime) -> tuple[float, float]:
    p = solar.solar_position(dt)
    return p.apparent_right_ascension_deg, p.apparent_declination_deg


@dataclass(frozen=True)
class PrayerConvention:
    name: str
    fajr_angle_deg: float
    isha_angle_deg: float
    asr_shadow_factor: float = 1.0  # 1 = Shafi'i/Kemenag RI default, 2 = Hanafi
    dhuhr_correction_minutes: float = 2.0


KEMENAG_RI = PrayerConvention(name="Kemenag RI", fajr_angle_deg=20.0, isha_angle_deg=18.0)
MWL = PrayerConvention(name="Muslim World League", fajr_angle_deg=18.0, isha_angle_deg=17.0)
ISNA = PrayerConvention(name="ISNA", fajr_angle_deg=15.0, isha_angle_deg=15.0)

CONVENTIONS = {c.name: c for c in (KEMENAG_RI, MWL, ISNA)}


def _wrap180(deg: float) -> float:
    d = deg % 360.0
    return d - 360.0 if d > 180 else d


def solar_transit(date: _dt.date, lon_east_deg: float) -> _dt.datetime:
    """
    Local solar noon (Dhuhr instant before convention correction): the UTC
    time the Sun's hour angle is zero, found by bisecting the wrapped
    LST - RA difference around an initial UTC-noon-minus-longitude guess.
    """
    guess = _dt.datetime(date.year, date.month, date.day, 12, 0, 0) - _dt.timedelta(
        hours=lon_east_deg / 15.0
    )

    def f(dt: _dt.datetime) -> float:
        ra, _ = _sun_ra_dec(dt)
        jd = julian_day(dt)
        lst = (apparent_sidereal_time_deg(jd) + lon_east_deg) % 360.0
        return _wrap180(lst - ra)

    lo = guess - _dt.timedelta(hours=1)
    hi = guess + _dt.timedelta(hours=1)
    f_lo, f_hi = f(lo), f(hi)
    if (f_lo > 0) == (f_hi > 0):
        lo, hi = guess - _dt.timedelta(hours=6), guess + _dt.timedelta(hours=6)
        f_lo, f_hi = f(lo), f(hi)

    while (hi - lo).total_seconds() > 1.0:
        mid = lo + (hi - lo) / 2
        f_mid = f(mid)
        if (f_mid > 0) == (f_lo > 0):
            lo, f_lo = mid, f_mid
        else:
            hi, f_hi = mid, f_mid

    return lo + (hi - lo) / 2


def _asr_target_altitude_deg(dt: _dt.datetime, lat_deg: float, shadow_factor: float) -> float:
    _, dec = _sun_ra_dec(dt)
    phi_minus_dec = abs(lat_deg - dec)
    return math.degrees(math.atan(1.0 / (shadow_factor + math.tan(math.radians(phi_minus_dec)))))


@dataclass(frozen=True)
class DailyPrayerTimes:
    date: _dt.date
    latitude_deg: float
    longitude_deg: float
    convention: str
    fajr: "_dt.datetime | None"
    sunrise: "_dt.datetime | None"
    dhuhr: _dt.datetime
    asr: "_dt.datetime | None"
    maghrib: "_dt.datetime | None"
    isha: "_dt.datetime | None"


def daily_prayer_times(
    date: _dt.date, lat_deg: float, lon_deg: float, convention: PrayerConvention = KEMENAG_RI
) -> DailyPrayerTimes:
    dhuhr = solar_transit(date, lon_deg) + _dt.timedelta(minutes=convention.dhuhr_correction_minutes)

    sunrise = find_horizon_crossing(date, lat_deg, lon_deg, _sun_ra_dec, -0.8333, rising=True)
    maghrib = find_horizon_crossing(date, lat_deg, lon_deg, _sun_ra_dec, -0.8333, rising=False)
    fajr = find_horizon_crossing(
        date, lat_deg, lon_deg, _sun_ra_dec, -convention.fajr_angle_deg, rising=True
    )
    isha = find_horizon_crossing(
        date, lat_deg, lon_deg, _sun_ra_dec, -convention.isha_angle_deg, rising=False
    )

    asr_target = _asr_target_altitude_deg(dhuhr, lat_deg, convention.asr_shadow_factor)
    asr = find_horizon_crossing(date, lat_deg, lon_deg, _sun_ra_dec, asr_target, rising=False)

    return DailyPrayerTimes(
        date=date,
        latitude_deg=lat_deg,
        longitude_deg=lon_deg,
        convention=convention.name,
        fajr=fajr,
        sunrise=sunrise,
        dhuhr=dhuhr,
        asr=asr,
        maghrib=maghrib,
        isha=isha,
    )
