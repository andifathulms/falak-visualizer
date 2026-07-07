from rest_framework.test import APIClient


def test_prayer_times_month_returns_all_days():
    client = APIClient()
    response = client.get(
        "/api/prayer-times-month/", {"year": 2024, "month": 4, "lat": -6.2, "lon": 106.8}
    )
    assert response.status_code == 200

    data = response.json()
    assert data["year"] == 2024
    assert data["month"] == 4
    assert len(data["days"]) == 30  # April has 30 days
    for day in data["days"]:
        assert day["convention"] == "Kemenag RI"
        assert "dhuhr" in day


def test_prayer_times_month_february_leap_year():
    client = APIClient()
    response = client.get(
        "/api/prayer-times-month/", {"year": 2024, "month": 2, "lat": -6.2, "lon": 106.8}
    )
    assert len(response.json()["days"]) == 29


def test_prayer_times_month_invalid_month_is_a_400():
    client = APIClient()
    response = client.get(
        "/api/prayer-times-month/", {"year": 2024, "month": 13, "lat": -6.2, "lon": 106.8}
    )
    assert response.status_code == 400


def test_prayer_times_month_missing_params_is_a_400():
    client = APIClient()
    response = client.get("/api/prayer-times-month/")
    assert response.status_code == 400
