import datetime

import pytest

from falak.astronomy import lunar


def test_meeus_example_47a():
    """Meeus, Astronomical Algorithms 2nd ed., Example 47.a: 1992-04-12.0 TD."""
    pos = lunar.lunar_position(datetime.datetime(1992, 4, 12, 0, 0, 0))

    assert pos.t == pytest.approx(-0.077221081, abs=1e-9)
    assert pos.apparent_longitude_deg == pytest.approx(133.162655, abs=1e-4)
    assert pos.ecliptic_latitude_deg == pytest.approx(-3.229126, abs=1e-4)
    assert pos.distance_km == pytest.approx(368409.7, abs=1.0)
    assert pos.horizontal_parallax_deg == pytest.approx(0.991990, abs=1e-4)


def test_illuminated_fraction_is_near_zero_at_new_moon_and_one_at_full_moon():
    from falak.astronomy import conjunction, solar

    new_moon = conjunction.conjunction_near(datetime.datetime(2024, 3, 10))
    moon = lunar.lunar_position(new_moon)
    sun_lon = solar.solar_position(new_moon).apparent_longitude_deg
    assert lunar.illuminated_fraction(sun_lon, moon) < 0.01

    full_moon_guess = new_moon + datetime.timedelta(days=14.77)  # half a synodic month
    moon_full = lunar.lunar_position(full_moon_guess)
    sun_lon_full = solar.solar_position(full_moon_guess).apparent_longitude_deg
    assert lunar.illuminated_fraction(sun_lon_full, moon_full) > 0.9
