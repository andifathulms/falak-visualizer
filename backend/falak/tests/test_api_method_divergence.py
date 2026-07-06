from rest_framework.test import APIClient


def test_method_divergence_returns_twelve_months():
    client = APIClient()
    response = client.get("/api/method-divergence/", {"hijri_year": 1445})
    assert response.status_code == 200

    data = response.json()
    assert data["hijri_year"] == 1445
    assert len(data["months"]) == 12

    for month in data["months"]:
        assert set(month.keys()) == {
            "hijri_month",
            "hijri_month_name",
            "start_dates",
            "errors",
            "diverges",
        }
        if month["errors"] is None:
            assert set(month["start_dates"].keys()) == {"wujudul_hilal", "mabims_2021", "odeh"}
            assert isinstance(month["diverges"], bool)
        else:
            assert month["diverges"] is None


def test_method_divergence_missing_hijri_year_is_a_400():
    client = APIClient()
    response = client.get("/api/method-divergence/")
    assert response.status_code == 400
    assert "hijri_year" in response.json()["error"]


def test_method_divergence_syawal_1445h_all_methods_agree():
    client = APIClient()
    response = client.get(
        "/api/method-divergence/", {"hijri_year": 1445, "lat": -6.2, "lon": 106.8}
    )
    syawal = next(m for m in response.json()["months"] if m["hijri_month"] == 10)
    assert syawal["diverges"] is False
    assert len(set(syawal["start_dates"].values())) == 1
