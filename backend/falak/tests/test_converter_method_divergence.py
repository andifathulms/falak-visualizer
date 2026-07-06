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


def test_all_methods_agree_on_syawal_1445h():
    """Publicly reported Kemenag hisab figures for 2024-04-09 evening
    (eve of 1 Syawal 1445H) show all three criteria met (test_visibility.py).
    The month-start search should therefore land on 2024-04-10 for every
    method, not just MABIMS."""
    for method in converter.MONTH_START_METHODS:
        assert converter.month_start_date_for_method(
            1445, 10, method, *JAKARTA
        ) == datetime.date(2024, 4, 10)


def test_odeh_visible_optical_aid_still_counts_as_month_start():
    obs = converter.visibility.compute_hilal_observation(datetime.date(2024, 4, 9), *JAKARTA)
    assert converter._is_visible_for_method(obs, "odeh") is True


def test_unsupported_method_raises_value_error():
    with pytest.raises(ValueError):
        converter.month_start_date_for_method(1445, 9, "not_a_real_method", *JAKARTA)

    obs = converter.visibility.compute_hilal_observation(datetime.date(2024, 4, 9), *JAKARTA)
    with pytest.raises(ValueError):
        converter._is_visible_for_method(obs, "not_a_real_method")
