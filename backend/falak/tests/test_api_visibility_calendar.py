from rest_framework.test import APIClient


def test_visibility_calendar_returns_twelve_months_with_full_observation():
    client = APIClient()
    response = client.get("/api/visibility-calendar/", {"hijri_year": 1445, "method": "mabims_2021"})
    assert response.status_code == 200

    data = response.json()
    assert data["hijri_year"] == 1445
    assert data["method"] == "mabims_2021"
    assert len(data["months"]) == 12

    for month in data["months"]:
        if "error" in month:
            continue
        for field in ("moon_altitude_deg", "elongation_deg", "sun_altitude_deg", "lag_time_minutes"):
            assert field in month
        assert isinstance(month["verdict"], bool)


def test_visibility_calendar_missing_hijri_year_is_a_400():
    client = APIClient()
    response = client.get("/api/visibility-calendar/")
    assert response.status_code == 400


def test_visibility_calendar_unsupported_method_is_a_400():
    client = APIClient()
    response = client.get("/api/visibility-calendar/", {"hijri_year": 1445, "method": "not_a_method"})
    assert response.status_code == 400


def test_visibility_calendar_verdict_changes_with_method_for_a_divergent_month():
    """Month 1 of 1446H is already known (test_api_method_divergence.py-adjacent
    fixture) to have Odeh disagree with MABIMS/Wujudul on its resolved start
    date; the reference evening (MABIMS's 29th evening) should therefore not
    be called visible by Odeh even though MABIMS calls it visible."""
    client = APIClient()

    mabims_response = APIClient().get(
        "/api/visibility-calendar/", {"hijri_year": 1446, "method": "mabims_2021", "lat": -6.2, "lon": 106.8}
    )
    odeh_response = client.get(
        "/api/visibility-calendar/", {"hijri_year": 1446, "method": "odeh", "lat": -6.2, "lon": 106.8}
    )

    mabims_month_1 = next(m for m in mabims_response.json()["months"] if m["hijri_month"] == 1)
    odeh_month_1 = next(m for m in odeh_response.json()["months"] if m["hijri_month"] == 1)

    assert mabims_month_1["verdict"] is True
    assert odeh_month_1["verdict"] in ("visible", "visible_optical_aid", "marginal", "not_visible")
