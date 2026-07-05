"""
Independent cross-check of the conjunction solver against Skyfield + a JPL
ephemeris, per PRD Sec. 5 / CLAUDE.md Phase 0 Step 7: >=50 historical months,
tolerance to be set once results are in.

Skyfield/JPL ephemeris is a TEST-ONLY dependency (`pip install skyfield`,
downloads de440s.bsp on first run) - it must never be imported by production
code (astronomy/*.py, api/*, tasks.py). This test module is the one place
it is allowed.

This module is skipped automatically if skyfield/the ephemeris file aren't
available. In that state, Phase 0 validation per CLAUDE.md is NOT complete -
whoever runs this suite next (with network access) must let this test
actually execute and pass before treating the engine as production-ready.
"""
import datetime

import pytest

skyfield = pytest.importorskip("skyfield.api", reason="skyfield is a test-only cross-validation dependency")

from falak.astronomy import conjunction  # noqa: E402

HISTORICAL_MONTHS = [
    datetime.datetime(2000 + year_offset, month, 1)
    for year_offset in range(0, 25)
    for month in (1, 6)
][:50]


@pytest.fixture(scope="module")
def skyfield_timescale_and_ephemeris():
    from skyfield.api import load

    ts = load.timescale()
    eph = load("de440s.bsp")
    return ts, eph


def _skyfield_conjunction_longitude_diff(ts, eph, dt: datetime.datetime) -> float:
    t = ts.from_datetime(dt.replace(tzinfo=datetime.timezone.utc))
    earth, sun, moon = eph["earth"], eph["sun"], eph["moon"]
    astrometric_sun = earth.at(t).observe(sun).apparent()
    astrometric_moon = earth.at(t).observe(moon).apparent()
    _, sun_lon, _ = astrometric_sun.ecliptic_latlon()
    _, moon_lon, _ = astrometric_moon.ecliptic_latlon()
    diff = (moon_lon.degrees - sun_lon.degrees) % 360.0
    return diff - 360.0 if diff > 180 else diff


@pytest.mark.parametrize("near", HISTORICAL_MONTHS)
def test_conjunction_matches_skyfield_jpl_de440(skyfield_timescale_and_ephemeris, near):
    ts, eph = skyfield_timescale_and_ephemeris
    our_dt = conjunction.conjunction_near(near)

    diff_deg = _skyfield_conjunction_longitude_diff(ts, eph, our_dt)
    # At true conjunction the longitude difference is ~0; converting the
    # residual longitude offset (moon moves ~0.55 deg/hour relative to sun)
    # to a time error gives our accuracy against JPL DE440.
    time_error_minutes = abs(diff_deg) / 0.55 * 60
    assert time_error_minutes < 5.0
