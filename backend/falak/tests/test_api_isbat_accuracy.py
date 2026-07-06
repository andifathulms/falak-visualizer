import datetime

import pytest
from rest_framework.test import APIClient

from falak.models import IsbatRecord


@pytest.mark.django_db
def test_isbat_accuracy_returns_empty_list_when_no_records_seeded():
    client = APIClient()
    response = client.get("/api/isbat-accuracy/")
    assert response.status_code == 200
    assert response.json() == {"count": 0, "records": []}


@pytest.mark.django_db
def test_isbat_accuracy_compares_a_seeded_record():
    IsbatRecord.objects.create(
        hijri_year=1445,
        hijri_month=9,
        gregorian_start_date=datetime.date(2024, 3, 12),
        source_note="Anchor date already hardcoded in calendar_engine/converter.py",
        verified=True,
    )

    client = APIClient()
    response = client.get("/api/isbat-accuracy/", {"hijri_year": 1445})
    assert response.status_code == 200

    data = response.json()
    assert data["count"] == 1
    record = data["records"][0]
    assert record["actual_start_date"] == "2024-03-12"
    assert record["matches"]["mabims_2021"] is True
    assert record["verified"] is True


@pytest.mark.django_db
def test_isbat_accuracy_invalid_hijri_year_is_a_400():
    client = APIClient()
    response = client.get("/api/isbat-accuracy/", {"hijri_year": "not-a-year"})
    assert response.status_code == 400
