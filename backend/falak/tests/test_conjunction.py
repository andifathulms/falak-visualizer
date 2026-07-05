import datetime

from falak.astronomy import conjunction


def test_meeus_example_49a_within_delta_t():
    """
    Meeus Example 49.a: new moon nearest 1977 Feb gives JDE 2443192.94102,
    i.e. 1977-02-18 03:37:42 Dynamical Time. We don't apply a Delta T
    correction (see timescale.py), so treat our UTC-based result as
    matching if it's within the era's ~48s TD-UT offset plus solver
    tolerance.
    """
    dt = conjunction.conjunction_near(datetime.datetime(1977, 2, 15))
    expected = datetime.datetime(1977, 2, 18, 3, 37, 42)
    assert abs((dt - expected).total_seconds()) < 90


def test_next_and_previous_are_consistent():
    anchor = datetime.datetime(2024, 6, 15)
    nxt = conjunction.next_conjunction(anchor)
    prev = conjunction.previous_conjunction(anchor)

    assert prev < anchor < nxt
    # Synodic month is ~29.53 days; consecutive conjunctions should be close to that.
    assert 29.2 < (nxt - prev).total_seconds() / 86400 < 29.9


def test_known_2024_new_moon_times():
    """Spot-check against publicly published 2024 new moon UTC times."""
    cases = [
        (datetime.datetime(2024, 1, 11, 11, 57), datetime.datetime(2024, 1, 1)),
        (datetime.datetime(2024, 3, 10, 9, 0), datetime.datetime(2024, 3, 1)),
        (datetime.datetime(2024, 4, 8, 18, 21), datetime.datetime(2024, 4, 1)),
    ]
    for expected, near in cases:
        dt = conjunction.conjunction_near(near)
        assert abs((dt - expected).total_seconds()) < 300
