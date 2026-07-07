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
        dec = solar.solar_position(event.utc_time).apparent_declination_deg
        assert abs(dec - qibla.KAABA_LATITUDE_DEG) < 0.001
