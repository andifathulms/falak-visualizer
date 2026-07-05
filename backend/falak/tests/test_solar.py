import datetime

import pytest

from falak.astronomy import solar


def test_meeus_example_25a():
    """Meeus, Astronomical Algorithms 2nd ed., Example 25.a: 1992-10-13.0 TD."""
    pos = solar.solar_position(datetime.datetime(1992, 10, 13, 0, 0, 0))

    assert pos.t == pytest.approx(-0.072183436, abs=1e-9)
    assert pos.geometric_mean_longitude_deg == pytest.approx(201.80720, abs=1e-4)
    assert pos.mean_anomaly_deg == pytest.approx(278.99397, abs=1e-4)
    assert pos.true_longitude_deg == pytest.approx(199.90987, abs=1e-4)
    assert pos.apparent_longitude_deg == pytest.approx(199.90895, abs=1e-4)
    assert pos.radius_vector_au == pytest.approx(0.99766, abs=1e-5)
    assert pos.apparent_right_ascension_deg == pytest.approx(198.38083, abs=1e-4)
    assert pos.apparent_declination_deg == pytest.approx(-7.78507, abs=1e-4)


def test_equation_of_time_is_within_known_bounds():
    """The equation of time never exceeds ~16.5 minutes in magnitude."""
    for month in range(1, 13):
        dt = datetime.datetime(2024, month, 15, 12, 0, 0)
        e = solar.equation_of_time_minutes(dt)
        assert -17.0 < e < 17.0
