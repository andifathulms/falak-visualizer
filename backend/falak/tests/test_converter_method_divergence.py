import datetime

import pytest

from falak.calendar_engine import converter

JAKARTA = (converter.JAKARTA_LATITUDE_DEG, converter.JAKARTA_LONGITUDE_DEG)


def test_month_start_date_for_method_matches_mabims_baseline():
    """Refactoring _month_start_from_conjunction into the method-parameterized
    helper must not change existing MABIMS-2021 behavior."""
    for hijri_year, hijri_month in ((1445, 9), (1445, 10), (1446, 1)):
        assert converter.month_start_date_for_method(
            hijri_year, hijri_month, "mabims_2021", *JAKARTA
        ) == converter.month_start_date(hijri_year, hijri_month, *JAKARTA)


def test_syawal_1445h_odeh_diverges_from_kemenag_by_one_day():
    """
    Kemenag declared 1 Syawal 1445H on 2024-04-10, on the MABIMS criterion.
    Wujudul hilal and MABIMS both reproduce that date. Odeh does not - it
    classifies the 2024-04-09 evening as marginal (see test_visibility.py) and
    so lands a day later.

    This test previously asserted that all three methods agreed on 2024-04-10.
    That was true only while moon altitude was computed geocentrically, which
    overstated it by ~1 deg and pushed Odeh's v-value over its optical-aid
    boundary. With the topocentric altitude the criteria are actually defined
    against, the divergence is real and is pinned here deliberately: a criterion
    disagreeing with the official determination is the product's subject matter,
    not a regression.
    """
    for method in ("wujudul_hilal", "mabims_2021"):
        assert converter.month_start_date_for_method(
            1445, 10, method, *JAKARTA
        ) == datetime.date(2024, 4, 10)

    assert converter.month_start_date_for_method(
        1445, 10, "odeh", *JAKARTA
    ) == datetime.date(2024, 4, 11)


def test_odeh_visible_optical_aid_still_counts_as_month_start():
    """Eve of 1 Ramadhan 1444H, which Odeh classifies as visible_optical_aid -
    a positive verdict short of naked-eye visibility, which must still start
    the month."""
    obs = converter.visibility.compute_hilal_observation(datetime.date(2023, 3, 22), *JAKARTA)
    assert (
        converter.visibility.odeh_criterion(
            obs.moon_altitude_deg, obs.elongation_deg, obs.crescent_width_arcmin
        )
        == "visible_optical_aid"
    )
    assert converter._is_visible_for_method(obs, "odeh") is True


def test_unsupported_method_raises_value_error():
    with pytest.raises(ValueError):
        converter.month_start_date_for_method(1445, 9, "not_a_real_method", *JAKARTA)

    obs = converter.visibility.compute_hilal_observation(datetime.date(2024, 4, 9), *JAKARTA)
    with pytest.raises(ValueError):
        converter._is_visible_for_method(obs, "not_a_real_method")
