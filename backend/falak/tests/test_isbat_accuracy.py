import datetime

import pytest

from falak.calendar_engine import converter
from falak.calendar_engine.isbat_accuracy import compare_record
from falak.models import IsbatRecord

JAKARTA = (converter.JAKARTA_LATITUDE_DEG, converter.JAKARTA_LONGITUDE_DEG)


@pytest.mark.django_db
def test_compare_record_matches_the_already_trusted_anchor_date():
    """1 Ramadhan 1445H = 2024-03-12 is the anchor date converter.py already
    treats as ground truth (Kemenag sidang isbat), so MABIMS-2021 must
    reproduce it exactly - this is the one date safe to use as a fixture
    without inventing new historical claims."""
    record = IsbatRecord.objects.create(
        hijri_year=1445,
        hijri_month=9,
        gregorian_start_date=datetime.date(2024, 3, 12),
        source_note="Anchor date already hardcoded in calendar_engine/converter.py",
        verified=True,
    )

    result = compare_record(record, *JAKARTA)

    assert result.matches["mabims_2021"] is True
    assert result.predicted["mabims_2021"] == "2024-03-12"
    assert result.errors == {}


@pytest.mark.django_db
def test_compare_record_does_not_crash_when_a_method_disagrees():
    record = IsbatRecord.objects.create(
        hijri_year=1445,
        hijri_month=9,
        gregorian_start_date=datetime.date(1999, 1, 1),
        source_note="Deliberately wrong date, for mismatch-handling test only",
        verified=False,
    )

    result = compare_record(record, *JAKARTA)

    assert result.matches["mabims_2021"] is False
    assert result.verified is False
