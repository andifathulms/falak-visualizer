"""
Independent cross-check of azimuth_deg against Skyfield + JPL DE440, the same
test-only arrangement as test_conjunction_skyfield_crosscheck.py. Skyfield
must never be imported by production code; this module is skipped when it
or the ephemeris file is unavailable.

Azimuth is used by the Kiblat page ("face the Sun, then turn N deg") and the
live sky on Hari ini, so it is held to the same standard as every other
number the app shows.
"""
import datetime

import pytest

pytest.importorskip("skyfield.api", reason="skyfield is a test-only cross-validation dependency")

from falak.astronomy import _horizon, solar  # noqa: E402
from falak.astronomy.timescale import julian_day  # noqa: E402
from falak.astronomy.visibility import _moon_ra_dec  # noqa: E402

PLACES = [("Jakarta", -6.2088, 106.8456), ("Banda Aceh", 5.5483, 95.3238), ("Jayapura", -2.5337, 140.7181)]
INSTANTS = [datetime.datetime(2026, 1, 1, 0, 0) + datetime.timedelta(hours=37 * i + 5) for i in range(20)]


@pytest.fixture(scope="module")
def sky():
    from skyfield.api import load

    return load.timescale(), load("de440s.bsp")


def _angle_diff(a: float, b: float) -> float:
    return abs((a - b + 180.0) % 360.0 - 180.0)


def _skyfield_altaz(ts, eph, body: str, lat: float, lon: float, dt: datetime.datetime):
    from skyfield.api import wgs84

    t = ts.from_datetime(dt.replace(tzinfo=datetime.timezone.utc))
    observer = eph["earth"] + wgs84.latlon(lat, lon)
    alt, az, _ = observer.at(t).observe(eph[body]).apparent().altaz()
    return alt.degrees, az.degrees


@pytest.mark.parametrize("name,lat,lon", PLACES)
def test_sun_azimuth_matches_jpl(sky, name, lat, lon):
    ts, eph = sky
    for dt in INSTANTS:
        pos = solar.solar_position(dt)
        ours = _horizon.azimuth_deg(pos.apparent_right_ascension_deg, pos.apparent_declination_deg, lat, lon, julian_day(dt))
        alt, theirs = _skyfield_altaz(ts, eph, "sun", lat, lon, dt)
        if alt < -18:
            continue  # far below the horizon azimuth is never displayed
        assert _angle_diff(ours, theirs) < 0.05, (name, dt, ours, theirs)


@pytest.mark.parametrize("name,lat,lon", PLACES)
def test_moon_azimuth_matches_jpl(sky, name, lat, lon):
    """Geocentric vs topocentric: parallax moves the Moon almost purely along
    its vertical circle, so azimuth agrees to a few tenths of a degree while
    altitude would not (altitude is corrected separately in visibility.py)."""
    ts, eph = sky
    for dt in INSTANTS:
        ra, dec = _moon_ra_dec(dt)
        ours = _horizon.azimuth_deg(ra, dec, lat, lon, julian_day(dt))
        alt, theirs = _skyfield_altaz(ts, eph, "moon", lat, lon, dt)
        if alt < -5 or alt > 80:
            continue  # near the zenith azimuth is ill-conditioned; below the horizon it is not shown
        assert _angle_diff(ours, theirs) < 0.3, (name, dt, ours, theirs)
