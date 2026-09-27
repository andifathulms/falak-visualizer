import datetime

from falak.astronomy import qibla


def test_rashdul_qibla_events_returns_two_events_per_year():
    events = qibla.rashdul_qibla_events(2024)
    assert len(events) == 2
    assert {e.direction for e in events} == {"ascending", "descending"}


def test_rashdul_qibla_ascending_event_is_in_late_may():
    events = qibla.rashdul_qibla_events(2024)
    ascending = next(e for e in events if e.direction == "ascending")
    assert ascending.utc_time.month == 5
    assert 25 <= ascending.utc_time.day <= 30


def test_rashdul_qibla_descending_event_is_in_mid_july():
    events = qibla.rashdul_qibla_events(2024)
    descending = next(e for e in events if e.direction == "descending")
    assert descending.utc_time.month == 7
    assert 13 <= descending.utc_time.day <= 18


def test_rashdul_qibla_event_declination_matches_kaaba_latitude():
    """Sanity check the actual physics: at the found instant, solar
    declination should equal the Kaaba's latitude to within the bisection
    tolerance."""
    from falak.astronomy import solar

    events = qibla.rashdul_qibla_events(2024)
    for event in events:
        dec = solar.solar_position(event.declination_crossing_utc).apparent_declination_deg
        assert abs(dec - qibla.KAABA_LATITUDE_DEG) < 0.001


def test_rashdul_qibla_event_is_makkah_solar_noon():
    """
    Regression: utc_time used to be the declination-equality instant, which
    in 2026 fell at 23:05 UTC (night in Makkah) - the page then told users in
    Jakarta to check a shadow at 06.05 WIB. The usable moment is Makkah's
    solar transit: the Sun must be near the zenith over the Kaaba itself.
    """
    from falak.astronomy._horizon import altitude_deg
    from falak.astronomy.prayer_times import _sun_ra_dec
    from falak.astronomy.timescale import julian_day

    for year in (2024, 2025, 2026, 2027):
        for event in qibla.rashdul_qibla_events(year):
            ra, dec = _sun_ra_dec(event.utc_time)
            alt = altitude_deg(ra, dec, qibla.KAABA_LATITUDE_DEG, qibla.KAABA_LONGITUDE_DEG,
                               julian_day(event.utc_time))
            assert alt > 89.5, (year, event, alt)
            # Makkah noon lands around 09:1x-09:2x UTC (≈16.1x-16.2x WIB).
            assert 9 <= event.utc_time.hour < 10, event
            assert abs(event.utc_time - event.declination_crossing_utc) <= datetime.timedelta(hours=12)
