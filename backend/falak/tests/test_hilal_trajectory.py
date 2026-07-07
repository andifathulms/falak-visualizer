import datetime

from falak.astronomy import visibility

JAKARTA = (-6.2, 106.8)


def test_trajectory_midpoint_matches_compute_hilal_observation():
    """The offset=0 sample (at sunset itself) must reproduce the same
    altitude/elongation numbers as compute_hilal_observation, since both
    are evaluated at the same instant with the same formulas."""
    obs = visibility.compute_hilal_observation(datetime.date(2024, 4, 9), *JAKARTA)
    points = visibility.hilal_trajectory(datetime.date(2024, 4, 9), *JAKARTA, window_minutes=30, step_minutes=5)

    midpoint = next(p for p in points if p.minutes_from_sunset == 0)
    assert midpoint.moon_altitude_deg == obs.moon_altitude_deg
    assert midpoint.sun_altitude_deg == obs.sun_altitude_deg
    assert midpoint.elongation_deg == obs.elongation_deg


def test_trajectory_spans_the_requested_window():
    points = visibility.hilal_trajectory(datetime.date(2024, 4, 9), *JAKARTA, window_minutes=30, step_minutes=5)
    offsets = [p.minutes_from_sunset for p in points]
    assert offsets[0] == -30
    assert offsets[-1] == 30
    assert len(points) == 13


def test_trajectory_moon_altitude_increases_as_time_passes_after_sunset():
    """Physically, right after sunset the Moon (already above the horizon
    at this stage of the lunar month) should be rising in altitude while
    the Sun descends further below the horizon."""
    points = visibility.hilal_trajectory(datetime.date(2024, 4, 9), *JAKARTA, window_minutes=30, step_minutes=10)
    sun_altitudes = [p.sun_altitude_deg for p in points]
    assert sun_altitudes == sorted(sun_altitudes, reverse=True)
