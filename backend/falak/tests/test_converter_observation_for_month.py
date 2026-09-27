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


def test_observation_for_month_is_first_sunset_after_conjunction():
    for hijri_year, hijri_month in ((1445, 9), (1445, 10), (1446, 1), (1448, 5), (1448, 9)):
        obs = converter.observation_for_month(hijri_year, hijri_month, *JAKARTA)
        conj = converter._conjunction_for_index(converter._absolute_month_index(hijri_year, hijri_month))
        assert obs.sunset_time > conj
        previous = obs.date - datetime.timedelta(days=1)
        from falak.astronomy import visibility
        assert visibility.compute_hilal_observation(previous, *JAKARTA).sunset_time <= conj


def test_a_calendar_year_is_not_uniformly_met_under_mabims():
    """
    Regression: anchored to the evening before the MABIMS start, every month
    came back "met" under MABIMS. On the deciding evening, 1448H at Jakarta
    has months that need a second evening (e.g. Muharram, Rabiul Akhir).
    """
    from falak.astronomy import visibility

    verdicts = []
    for month in range(1, 13):
        obs = converter.observation_for_month(1448, month, *JAKARTA)
        verdicts.append(visibility.mabims_2021(obs.moon_altitude_deg, obs.elongation_deg))
    assert any(verdicts) and not all(verdicts)


def test_month_start_gate_uses_this_months_conjunction():
    """
    Regression: the gate compared against obs.conjunction_time, which on an
    evening before this month's ijtimak is the previous month's conjunction,
    so it always passed. Jumadilawal 1448's ijtimak is after sunset on
    10 Oct 2026 in Jakarta; that evening must not be able to start the month.
    """
    conj = converter._conjunction_for_index(converter._absolute_month_index(1448, 5))
    from falak.astronomy import visibility

    obs = visibility.compute_hilal_observation(datetime.date(2026, 10, 10), *JAKARTA)
    assert obs.sunset_time < conj
    assert obs.conjunction_time < conj  # the previous month's - what the old gate compared
    for method in converter.MONTH_START_METHODS:
        assert converter.month_start_date_for_method(1448, 5, method, *JAKARTA) >= datetime.date(2026, 10, 12)


def test_wujudul_hilal_needs_this_months_ijtimak_ramadan_1439():
    """
    With the old gate, Wujudul Hilal accepted the evening of 15 May 2018 in
    Jakarta - moonset after sunset, but BEFORE Ramadan 1439's ijtimak - and put
    1 Ramadan on 16 May. Ijtimak before sunset is half the criterion's own
    definition, so the first qualifying evening is 16 May and the month starts
    17 May 2018. A sweep of 1400-1470 H at three Indonesian cities found 28
    such evenings, all Wujudul Hilal; MABIMS and Odeh were never affected.
    """
    start = converter.month_start_date_for_method(1439, 9, "wujudul_hilal", -6.2088, 106.8456)
    assert start == datetime.date(2018, 5, 17)
