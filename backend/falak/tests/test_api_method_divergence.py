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


def test_method_divergence_syawal_1445h_odeh_lands_a_day_later():
    """
    The API-level twin of test_converter_method_divergence's version of this.

    Until moon altitude became topocentric, all three criteria agreed on
    2024-04-10 for 1 Syawal 1445H. The geocentric altitude this engine used
    before overstated the arc of vision by ~1 deg, which pushed Odeh's v-value
    over its optical-aid boundary; against the topocentric altitude the
    criterion is actually defined for, Odeh classifies the deciding evening as
    marginal and resolves a day later.

    Kemenag's announced date, 2024-04-10, is still reproduced by MABIMS - the
    criterion it uses - and by wujudul hilal. The divergence is pinned rather
    than smoothed over: this endpoint exists to report it.
    """
    client = APIClient()
    response = client.get(
        "/api/method-divergence/", {"hijri_year": 1445, "lat": -6.2, "lon": 106.8}
    )
    syawal = next(m for m in response.json()["months"] if m["hijri_month"] == 10)

    assert syawal["diverges"] is True
    assert syawal["start_dates"]["wujudul_hilal"] == "2024-04-10"
    assert syawal["start_dates"]["mabims_2021"] == "2024-04-10"
    assert syawal["start_dates"]["odeh"] == "2024-04-11"
