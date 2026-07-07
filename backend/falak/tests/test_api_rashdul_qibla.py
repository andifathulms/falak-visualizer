from rest_framework.test import APIClient


def test_rashdul_qibla_returns_two_events():
    client = APIClient()
    response = client.get("/api/rashdul-qibla/", {"year": 2024})
    assert response.status_code == 200

    data = response.json()
    assert data["year"] == 2024
    assert len(data["events"]) == 2
    assert {e["direction"] for e in data["events"]} == {"ascending", "descending"}
    for event in data["events"]:
        assert "utc_time" in event
        assert "bearing_deg" not in event


def test_rashdul_qibla_includes_bearing_when_location_given():
    client = APIClient()
    response = client.get("/api/rashdul-qibla/", {"year": 2024, "lat": -6.2, "lon": 106.8})
    data = response.json()
    for event in data["events"]:
        assert isinstance(event["bearing_deg"], float)


def test_rashdul_qibla_missing_year_is_a_400():
    client = APIClient()
    response = client.get("/api/rashdul-qibla/")
    assert response.status_code == 400
