import pytest

from falak.astronomy import qibla


def test_jakarta_qibla_bearing_and_distance():
    r = qibla.qibla_direction(-6.2, 106.8)
    assert r.bearing_deg == pytest.approx(295.0, abs=1.0)
    assert r.distance_km == pytest.approx(7915, abs=20)


def test_kaaba_itself_has_zero_distance():
    r = qibla.qibla_direction(qibla.KAABA_LATITUDE_DEG, qibla.KAABA_LONGITUDE_DEG)
    assert r.distance_km == pytest.approx(0.0, abs=1e-6)


def test_mecca_ka_bah_bearing_range_is_valid():
    for lat, lon in [(40.7, -74.0), (-33.9, 151.2), (55.75, 37.6)]:
        r = qibla.qibla_direction(lat, lon)
        assert 0.0 <= r.bearing_deg < 360.0
        assert r.distance_km > 0
