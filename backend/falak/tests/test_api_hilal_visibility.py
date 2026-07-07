from rest_framework.test import APIClient


def test_hilal_visibility_includes_trajectory():
    client = APIClient()
    response = client.get(
        "/api/hilal-visibility/", {"date": "2024-04-09", "lat": -6.2, "lon": 106.8, "method": "mabims_2021"}
    )
    assert response.status_code == 200

    data = response.json()
    assert "trajectory" in data
    assert len(data["trajectory"]) == 13
    assert data["trajectory"][6]["minutes_from_sunset"] == 0

    for point in data["trajectory"]:
        for field in ("time_utc", "minutes_from_sunset", "moon_altitude_deg", "sun_altitude_deg", "elongation_deg"):
            assert field in point


def test_hilal_visibility_missing_params_is_a_400():
    client = APIClient()
    response = client.get("/api/hilal-visibility/")
    assert response.status_code == 400
