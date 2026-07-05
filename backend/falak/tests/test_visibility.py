import datetime

from falak.astronomy import visibility


def test_syawal_1445h_jakarta_matches_reported_kemenag_figures():
    """
    Eve of 1 Syawal 1445H (2024-04-10), observed 2024-04-09 sunset, Jakarta.
    Publicly reported Kemenag hisab figures for that evening put Moon
    altitude around 6-8 deg and elongation around 8-10 deg across
    Indonesian cities - both criteria were met and Idul Fitri was declared
    for 2024-04-10.
    """
    obs = visibility.compute_hilal_observation(datetime.date(2024, 4, 9), -6.2, 106.8)

    assert 5.0 < obs.moon_altitude_deg < 9.0
    assert 7.0 < obs.elongation_deg < 11.0
    assert obs.moon_age_hours > 0
    assert 0 < obs.illumination_fraction < 0.05

    assert visibility.wujudul_hilal(obs.moonset_time, obs.sunset_time, obs.conjunction_time) is True
    assert visibility.mabims_2021(obs.moon_altitude_deg, obs.elongation_deg) is True
    assert visibility.odeh_criterion(obs.moon_altitude_deg, obs.elongation_deg, obs.crescent_width_arcmin) in (
        "visible",
        "visible_optical_aid",
    )


def test_conjunction_day_itself_is_not_visible():
    """On the evening of conjunction day, the Moon is far too close to the Sun."""
    obs = visibility.compute_hilal_observation(datetime.date(2024, 3, 10), -6.2, 106.8)
    assert visibility.mabims_2021(obs.moon_altitude_deg, obs.elongation_deg) is False


def test_wujudul_hilal_requires_conjunction_before_sunset():
    now = datetime.datetime(2024, 4, 9, 11, 0, 0)
    conj_after_sunset = now + datetime.timedelta(hours=1)
    moonset = now + datetime.timedelta(minutes=30)
    assert visibility.wujudul_hilal(moonset, now, conj_after_sunset) is False


def test_mabims_threshold_boundaries():
    assert visibility.mabims_2021(3.0, 6.4) is True
    assert visibility.mabims_2021(2.99, 6.4) is False
    assert visibility.mabims_2021(3.0, 6.39) is False
