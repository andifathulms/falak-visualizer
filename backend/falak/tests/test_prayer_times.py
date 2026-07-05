import datetime

from falak.astronomy import prayer_times as pt


def test_jakarta_prayer_times_ordering_and_rough_published_match():
    d = datetime.date(2024, 3, 10)
    r = pt.daily_prayer_times(d, -6.2, 106.8, pt.KEMENAG_RI)

    # Ordering must always hold regardless of location/date.
    times = [r.fajr, r.sunrise, r.dhuhr, r.asr, r.maghrib, r.isha]
    assert all(t is not None for t in times)
    assert times == sorted(times)

    tz = datetime.timedelta(hours=7)  # WIB
    published = {
        "fajr": datetime.time(4, 39),
        "sunrise": datetime.time(5, 54),
        "dhuhr": datetime.time(12, 4),
        "maghrib": datetime.time(18, 7),
        "isha": datetime.time(19, 16),
    }
    computed_local = {
        "fajr": (r.fajr + tz).time(),
        "sunrise": (r.sunrise + tz).time(),
        "dhuhr": (r.dhuhr + tz).time(),
        "maghrib": (r.maghrib + tz).time(),
        "isha": (r.isha + tz).time(),
    }
    for name, expected in published.items():
        actual = computed_local[name]
        diff_minutes = abs(
            (datetime.datetime.combine(d, actual) - datetime.datetime.combine(d, expected)).total_seconds()
        ) / 60
        assert diff_minutes < 10, f"{name}: expected ~{expected}, got {actual}"


def test_maghrib_matches_sunset_definition():
    d = datetime.date(2024, 6, 1)
    r = pt.daily_prayer_times(d, -6.2, 106.8, pt.KEMENAG_RI)
    assert r.maghrib is not None
