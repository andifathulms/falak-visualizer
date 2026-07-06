import datetime

from falak.calendar_engine import converter

JAKARTA = (converter.JAKARTA_LATITUDE_DEG, converter.JAKARTA_LONGITUDE_DEG)


def test_observation_for_syawal_1445h_matches_known_good_evening():
    """The evening that decides Syawal 1445H's start is 2024-04-09, whose
    numbers are already validated in test_visibility.py."""
    obs = converter.observation_for_month(1445, 10, *JAKARTA)
    assert obs.date == datetime.date(2024, 4, 9)
    assert 5.0 < obs.moon_altitude_deg < 9.0
    assert 7.0 < obs.elongation_deg < 11.0


def test_observation_for_month_is_evening_before_mabims_month_start():
    for hijri_year, hijri_month in ((1445, 9), (1445, 10), (1446, 1)):
        obs = converter.observation_for_month(hijri_year, hijri_month, *JAKARTA)
        start = converter.month_start_date(hijri_year, hijri_month, *JAKARTA)
        assert obs.date == start - datetime.timedelta(days=1)
