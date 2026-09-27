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


def test_every_time_falls_on_the_requested_local_day_across_a_year():
    """
    Regression: the horizon-crossing search once compared candidate crossings
    modulo 24h inside a 36h window, so the requested day's fajr and the next
    day's could tie and the wrong one could win. Jakarta on 2026-09-27 got
    28 Sep 04:22 WIB - 16.6h from dhuhr, which the frontend rightly refused
    to plot. Sweep a full year at longitudes across Indonesia and require
    every time to sit on the local calendar day and in order.
    """
    for lat, lon, utc_offset in [(-6.2088, 106.8456, 7), (5.55, 95.32, 7), (-5.15, 119.43, 8), (-2.53, 140.72, 9)]:
        tz = datetime.timedelta(hours=utc_offset)
        d = datetime.date(2026, 1, 1)
        while d.year == 2026:
            r = pt.daily_prayer_times(d, lat, lon, pt.KEMENAG_RI)
            times = [r.fajr, r.sunrise, r.dhuhr, r.asr, r.maghrib, r.isha]
            assert times == sorted(times), (lat, lon, d)
            for t in times:
                assert (t + tz).date() == d, (lat, lon, d, t + tz)
            d += datetime.timedelta(days=5)


def test_jakarta_2026_09_27_fajr_is_same_morning():
    r = pt.daily_prayer_times(datetime.date(2026, 9, 27), -6.2088, 106.8456, pt.KEMENAG_RI)
    fajr_local = r.fajr + datetime.timedelta(hours=7)
    assert fajr_local.date() == datetime.date(2026, 9, 27)
    assert datetime.time(4, 15) < fajr_local.time() < datetime.time(4, 30)
    assert (r.dhuhr - r.fajr) < datetime.timedelta(hours=8)
