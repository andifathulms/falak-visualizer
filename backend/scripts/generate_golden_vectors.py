"""
Emit golden vectors: the Python engine's exact output for a fixed, hand-chosen
set of inputs, written to a JSON file the TypeScript port is tested against.

Why this exists
---------------
The browser engine (frontend/src/lib/falak/*.ts) is a line-by-line port of
falak/astronomy + falak/calendar_engine so the app can run entirely on GitHub
Pages with no backend. Two implementations of a religious-calendar engine is
exactly the kind of thing that drifts silently, which CLAUDE.md's
"self-contained, auditable engine" rule cannot tolerate.

So the Python engine stays the oracle. It is the implementation validated
against JPL DE440 (falak/tests/test_conjunction_skyfield_crosscheck.py) and
against Meeus' worked examples. This script freezes its output; the TS suite
(frontend/src/lib/falak/__tests__/golden.test.ts) replays those inputs through
the port and fails CI on any deviation beyond tolerance.

Deliberately Django-free - the engine imports nothing but the stdlib, so CI can
run this with a bare `python3 scripts/generate_golden_vectors.py` without
installing the web stack.

Regenerate after ANY change to the Python engine, and commit the result:

    python3 scripts/generate_golden_vectors.py

Adding a case is always safe. Changing or removing one is a claim that the
engine's previous answer was wrong - say why in the commit message.
"""
from __future__ import annotations

import datetime as _dt
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from falak.astronomy import _horizon, conjunction, lunar, prayer_times, qibla, solar, timescale
from falak.astronomy import visibility as vis
from falak.calendar_engine import archive, converter

OUTPUT_PATH = (
    pathlib.Path(__file__).resolve().parent.parent.parent
    / "frontend"
    / "src"
    / "lib"
    / "falak"
    / "__fixtures__"
    / "golden-vectors.json"
)

# --------------------------------------------------------------------------
# Input sets
#
# Chosen for coverage, not volume: each list spans the range the product
# actually serves (Indonesian latitudes, modern dates) plus the boundaries
# where a port is most likely to diverge - sign changes, epoch crossings,
# equator/antimeridian, and the specific instants Meeus works through in the
# textbook chapters these modules cite.
# --------------------------------------------------------------------------

# Instants sampled across seasons, hemispheres of the orbit, and either side of
# the J2000 epoch (negative Julian centuries exercise the odd-power polynomial
# terms with the opposite sign, a classic porting trap).
INSTANTS = [
    "1992-04-12T00:00:00",  # Meeus Example 47.a (lunar position)
    "1992-10-13T00:00:00",  # Meeus Example 25.a (solar position)
    "1987-04-10T19:21:00",  # Meeus Example 12.a (sidereal time)
    "1988-03-20T00:00:00",
    "1995-07-04T12:34:56",
    "2000-01-01T12:00:00",  # J2000.0 exactly: T = 0
    "2000-01-01T00:00:00",
    "2005-06-15T06:00:00",
    "2010-12-31T23:59:59",
    "2015-02-28T18:45:30",
    "2020-02-29T00:00:00",  # leap day
    "2024-03-10T09:01:49",  # the converter's anchor conjunction
    "2024-06-21T21:00:00",  # solstice
    "2025-09-22T12:00:00",  # equinox
    "2026-01-01T00:00:00",
    "2026-07-30T10:15:00",
    "2030-11-05T03:30:00",
    "2035-08-19T15:20:00",
]

# Indonesian cities the app ships as presets, plus the archipelago's true
# corners (Sabang, Merauke) and three deliberate boundary cases: the equator,
# a southern-hemisphere high latitude, and a location west of Greenwich where
# the longitude sign flips the local-noon anchor in _horizon._local_noon_utc.
LOCATIONS = [
    ("Jakarta", -6.2, 106.8),
    ("Surabaya", -7.2575, 112.7521),
    ("Medan", 3.5952, 98.6722),
    ("Makassar", -5.1477, 119.4327),
    ("Banda Aceh", 5.5483, 95.3238),
    ("Jayapura", -2.5916, 140.6690),
    ("Sabang", 5.8933, 95.3214),
    ("Merauke", -8.4932, 140.4018),
    ("Pontianak (equator)", 0.0, 109.3333),
    ("Kupang", -10.1772, 123.6070),
    ("Mecca", 21.4225, 39.8262),  # bearing/distance degenerate case: zero
    ("London", 51.5074, -0.1278),  # negative longitude
    ("Cape Town", -33.9249, 18.4241),  # southern high latitude
]

# Evenings used for hilal observation and prayer times. Includes several known
# Ramadhan/Syawal boundary evenings, where the criteria functions sit closest
# to their thresholds and a small numeric drift would flip a verdict.
DATES = [
    "2021-04-12",
    "2022-04-01",
    "2023-03-22",
    "2023-04-20",
    "2024-03-10",
    "2024-03-11",
    "2024-04-08",
    "2024-04-09",
    "2025-02-28",
    "2025-03-29",
    "2026-02-17",
    "2026-03-19",
    "2026-06-15",
    "2026-12-21",
    "2027-01-08",
]

HIJRI_YEARS = [1443, 1444, 1445, 1446, 1447, 1448]

GREGORIAN_DATES_FOR_CONVERSION = [
    "2021-01-01",
    "2022-08-09",
    "2023-03-23",
    "2024-03-12",
    "2024-04-10",
    "2025-06-06",
    "2026-01-20",
    "2026-07-30",
    "2027-05-11",
]

# Criterion inputs swept across and exactly ON each published threshold
# (MABIMS altitude 3.0 / elongation 6.4; Odeh's v-value boundaries). Equality
# is the whole point here - `>=` ported as `>` is a real and silent bug.
CRITERION_INPUTS = [
    (0.0, 0.0),
    (2.99, 6.4),
    (3.0, 6.39),
    (3.0, 6.4),
    (3.0, 6.41),
    (3.01, 6.4),
    (5.0, 8.0),
    (-1.0, 12.0),
    (10.0, 15.0),
    (1.5, 3.2),
    (7.25, 11.75),
    (12.0, 20.0),
]

CRESCENT_WIDTHS = [None, 0.0, 0.05, 0.1, 0.25, 0.5, 0.8, 1.2]


def iso(value):
    """Serialize a datetime/date to ISO, passing through None."""
    return None if value is None else value.isoformat()


def parse_dt(text: str) -> _dt.datetime:
    return _dt.datetime.fromisoformat(text)


def parse_date(text: str) -> _dt.date:
    return _dt.date.fromisoformat(text)


def build_timescale():
    cases = []
    for text in INSTANTS:
        dt = parse_dt(text)
        jd = timescale.julian_day(dt)
        cases.append(
            {
                "datetime": text,
                "julian_day": jd,
                "julian_centuries": timescale.julian_centuries(jd),
                # Round-trips through JD are lossy by design (the inverse
                # rounds to whole seconds) - pin the actual result rather than
                # asserting exact equality with the input.
                "roundtrip": iso(timescale.datetime_from_julian_day(jd)),
            }
        )

    # Julian Day values covering the Gregorian/Julian calendar-reform branch in
    # datetime_from_julian_day (z < 2299161), which no modern date reaches.
    raw_jds = [2299160.0, 2299161.5, 2415020.5, 2451545.0, 2451544.5, 2460000.25, 2500000.0]
    inverse = [{"julian_day": jd, "datetime": iso(timescale.datetime_from_julian_day(jd))} for jd in raw_jds]

    delta_t = [
        {"year": year, "delta_t_seconds": timescale.delta_t_seconds(year)}
        # One per branch of the piecewise fit, including both sides of each
        # boundary year (1961/1986/2005/2050).
        for year in [1800, 1900, 1950, 1960, 1961, 1975, 1985, 1986, 2000, 2004, 2005, 2026, 2050, 2051, 2100]
    ]

    return {"cases": cases, "inverse": inverse, "delta_t": delta_t}


def build_solar():
    cases = []
    for text in INSTANTS:
        pos = solar.solar_position(parse_dt(text))
        cases.append(
            {
                "datetime": text,
                "jd": pos.jd,
                "t": pos.t,
                "geometric_mean_longitude_deg": pos.geometric_mean_longitude_deg,
                "mean_anomaly_deg": pos.mean_anomaly_deg,
                "true_anomaly_deg": pos.true_anomaly_deg,
                "true_longitude_deg": pos.true_longitude_deg,
                "apparent_longitude_deg": pos.apparent_longitude_deg,
                "radius_vector_au": pos.radius_vector_au,
                "apparent_right_ascension_deg": pos.apparent_right_ascension_deg,
                "apparent_declination_deg": pos.apparent_declination_deg,
                "apparent_obliquity_deg": pos.apparent_obliquity_deg,
                "equation_of_time_minutes": solar.equation_of_time_minutes(parse_dt(text)),
            }
        )

    # The individual series terms, pinned separately so a transcription error in
    # one polynomial is reported against that function rather than surfacing as
    # an unattributable drift in the assembled position.
    terms = []
    for text in INSTANTS:
        t = timescale.julian_centuries(timescale.julian_day(parse_dt(text)))
        m = solar.mean_anomaly(t)
        terms.append(
            {
                "datetime": text,
                "t": t,
                "geometric_mean_longitude": solar.geometric_mean_longitude(t),
                "mean_anomaly": m,
                "eccentricity": solar.eccentricity(t),
                "equation_of_center": solar.equation_of_center(t, m),
                "obliquity_of_ecliptic": solar.obliquity_of_ecliptic(t),
            }
        )

    return {"cases": cases, "terms": terms}


def build_lunar():
    cases = []
    for text in INSTANTS:
        dt = parse_dt(text)
        moon = lunar.lunar_position(dt)
        sun_lon = solar.solar_position(dt).apparent_longitude_deg
        cases.append(
            {
                "datetime": text,
                "jd": moon.jd,
                "t": moon.t,
                "apparent_longitude_deg": moon.apparent_longitude_deg,
                "ecliptic_latitude_deg": moon.ecliptic_latitude_deg,
                "distance_km": moon.distance_km,
                "horizontal_parallax_deg": moon.horizontal_parallax_deg,
                "illuminated_fraction": lunar.illuminated_fraction(sun_lon, moon),
            }
        )

    terms = []
    for text in INSTANTS:
        t = timescale.julian_centuries(timescale.julian_day(parse_dt(text)))
        terms.append(
            {
                "datetime": text,
                "t": t,
                "mean_longitude": lunar.mean_longitude(t),
                "mean_elongation": lunar.mean_elongation(t),
                "sun_mean_anomaly": lunar.sun_mean_anomaly(t),
                "moon_mean_anomaly": lunar.moon_mean_anomaly(t),
                "argument_of_latitude": lunar.argument_of_latitude(t),
                "eccentricity_correction": lunar.eccentricity_correction(t),
            }
        )

    return {"cases": cases, "terms": terms}


def build_horizon():
    sidereal = [
        {"datetime": text, "julian_day": timescale.julian_day(parse_dt(text)),
         "apparent_sidereal_time_deg": _horizon.apparent_sidereal_time_deg(timescale.julian_day(parse_dt(text)))}
        for text in INSTANTS
    ]

    # Ecliptic -> equatorial across all four quadrants and both latitude signs;
    # atan2 quadrant handling is the usual porting failure here.
    coords = []
    for lon in (0.0, 45.0, 90.0, 135.0, 180.0, 225.0, 270.0, 315.0, 359.9):
        for lat in (-5.2, 0.0, 1.7, 5.1):
            ra, dec = _horizon.equatorial_from_ecliptic(lon, lat, 23.4392911)
            coords.append({"lon_deg": lon, "lat_deg": lat, "obliquity_deg": 23.4392911, "ra_deg": ra, "dec_deg": dec})

    altitudes = []
    for name, lat, lon in LOCATIONS:
        for text in INSTANTS[:6]:
            dt = parse_dt(text)
            jd = timescale.julian_day(dt)
            pos = solar.solar_position(dt)
            altitudes.append(
                {
                    "location": name,
                    "datetime": text,
                    "lat_deg": lat,
                    "lon_deg": lon,
                    "ra_deg": pos.apparent_right_ascension_deg,
                    "dec_deg": pos.apparent_declination_deg,
                    "altitude_deg": _horizon.altitude_deg(
                        pos.apparent_right_ascension_deg, pos.apparent_declination_deg, lat, lon, jd
                    ),
                }
            )

    return {"sidereal": sidereal, "equatorial_from_ecliptic": coords, "altitudes": altitudes}


def build_conjunction():
    near = [{"datetime": text, "conjunction": iso(conjunction.conjunction_near(parse_dt(text)))} for text in INSTANTS]
    nxt = [{"datetime": text, "conjunction": iso(conjunction.next_conjunction(parse_dt(text)))} for text in INSTANTS]
    prev = [{"datetime": text, "conjunction": iso(conjunction.previous_conjunction(parse_dt(text)))} for text in INSTANTS]

    # A contiguous 36-month chain: catches an off-by-one in the lunation
    # number that single-point sampling would miss.
    chain = []
    cursor = _dt.datetime(2023, 1, 1)
    for _ in range(36):
        cursor = conjunction.next_conjunction(cursor)
        chain.append(iso(cursor))

    return {"near": near, "next": nxt, "previous": prev, "chain": chain}


def build_visibility():
    observations = []
    for date_text in DATES:
        for name, lat, lon in LOCATIONS:
            date = parse_date(date_text)
            try:
                obs = vis.compute_hilal_observation(date, lat, lon)
            except ValueError as exc:
                # Pinned deliberately: the port must raise in the same places,
                # not quietly return a placeholder (CLAUDE.md: no silent
                # fallback values).
                observations.append({"date": date_text, "location": name, "lat": lat, "lon": lon, "error": str(exc)})
                continue
            observations.append(
                {
                    "date": date_text,
                    "location": name,
                    "lat": lat,
                    "lon": lon,
                    "conjunction_time": iso(obs.conjunction_time),
                    "sunset_time": iso(obs.sunset_time),
                    "moonset_time": iso(obs.moonset_time),
                    "moon_altitude_deg": obs.moon_altitude_deg,
                    "sun_altitude_deg": obs.sun_altitude_deg,
                    "elongation_deg": obs.elongation_deg,
                    "moon_age_hours": obs.moon_age_hours,
                    "illumination_fraction": obs.illumination_fraction,
                    "lag_time_minutes": obs.lag_time_minutes,
                    "crescent_width_arcmin": obs.crescent_width_arcmin,
                    "criteria": {
                        "wujudul_hilal": vis.wujudul_hilal(obs.moonset_time, obs.sunset_time, obs.conjunction_time),
                        "mabims_2021": vis.mabims_2021(obs.moon_altitude_deg, obs.elongation_deg),
                        "odeh": vis.odeh_criterion(obs.moon_altitude_deg, obs.elongation_deg, obs.crescent_width_arcmin),
                    },
                }
            )

    mabims = [
        {"altitude_deg": alt, "elongation_deg": elong, "result": vis.mabims_2021(alt, elong)}
        for alt, elong in CRITERION_INPUTS
    ]

    odeh = [
        {"altitude_deg": alt, "elongation_deg": elong, "crescent_width_arcmin": w,
         "result": vis.odeh_criterion(alt, elong, w)}
        for alt, elong in CRITERION_INPUTS
        for w in CRESCENT_WIDTHS
    ]

    # wujudul_hilal is pure datetime ordering, including the None-moonset case
    # (no moonset that day => not present, never a crash).
    base = _dt.datetime(2024, 4, 8, 10, 0, 0)
    wujudul = []
    for moonset_offset in (None, -120.0, -1.0, 0.0, 1.0, 45.0):
        for conj_offset in (-600.0, -1.0, 0.0, 1.0, 600.0):
            sunset = base
            moonset = None if moonset_offset is None else base + _dt.timedelta(minutes=moonset_offset)
            conj = base + _dt.timedelta(minutes=conj_offset)
            wujudul.append(
                {
                    "sunset": iso(sunset),
                    "moonset": iso(moonset),
                    "conjunction": iso(conj),
                    "result": vis.wujudul_hilal(moonset, sunset, conj),
                }
            )

    trajectories = []
    for date_text in DATES[:6]:
        for name, lat, lon in LOCATIONS[:5]:
            try:
                points = vis.hilal_trajectory(parse_date(date_text), lat, lon)
            except ValueError as exc:
                trajectories.append({"date": date_text, "location": name, "lat": lat, "lon": lon, "error": str(exc)})
                continue
            trajectories.append(
                {
                    "date": date_text,
                    "location": name,
                    "lat": lat,
                    "lon": lon,
                    "points": [
                        {
                            "time": iso(p.time),
                            "minutes_from_sunset": p.minutes_from_sunset,
                            "moon_altitude_deg": p.moon_altitude_deg,
                            "sun_altitude_deg": p.sun_altitude_deg,
                            "elongation_deg": p.elongation_deg,
                        }
                        for p in points
                    ],
                }
            )

    return {
        "observations": observations,
        "mabims_2021": mabims,
        "odeh": odeh,
        "wujudul_hilal": wujudul,
        "trajectories": trajectories,
    }


def build_qibla():
    directions = []
    for name, lat, lon in LOCATIONS:
        result = qibla.qibla_direction(lat, lon)
        directions.append(
            {"location": name, "lat": lat, "lon": lon,
             "bearing_deg": result.bearing_deg, "distance_km": result.distance_km}
        )

    # A coarse global sweep, including the poles and the antimeridian, where
    # the bearing formula's atan2 branch and the modulo wrap are exercised.
    for lat in (-90.0, -60.0, -30.0, 0.0, 21.4225, 30.0, 60.0, 90.0):
        for lon in (-180.0, -120.0, -39.8262, 0.0, 39.8262, 120.0, 179.9):
            result = qibla.qibla_direction(lat, lon)
            directions.append(
                {"location": f"sweep {lat},{lon}", "lat": lat, "lon": lon,
                 "bearing_deg": result.bearing_deg, "distance_km": result.distance_km}
            )

    rashdul = []
    for year in (2020, 2024, 2025, 2026, 2027, 2030):
        events = qibla.rashdul_qibla_events(year)
        rashdul.append(
            {"year": year, "events": [{"utc_time": iso(e.utc_time), "direction": e.direction} for e in events]}
        )

    return {"directions": directions, "rashdul": rashdul}


def build_prayer_times():
    transits = []
    for date_text in DATES:
        for name, lat, lon in LOCATIONS:
            transits.append(
                {"date": date_text, "location": name, "lon": lon,
                 "solar_transit": iso(prayer_times.solar_transit(parse_date(date_text), lon))}
            )

    daily = []
    for date_text in DATES:
        for name, lat, lon in LOCATIONS:
            for convention_name, convention in prayer_times.CONVENTIONS.items():
                result = prayer_times.daily_prayer_times(parse_date(date_text), lat, lon, convention)
                daily.append(
                    {
                        "date": date_text,
                        "location": name,
                        "lat": lat,
                        "lon": lon,
                        "convention": convention_name,
                        "fajr": iso(result.fajr),
                        "sunrise": iso(result.sunrise),
                        "dhuhr": iso(result.dhuhr),
                        "asr": iso(result.asr),
                        "maghrib": iso(result.maghrib),
                        "isha": iso(result.isha),
                    }
                )

    conventions = [
        {
            "name": c.name,
            "fajr_angle_deg": c.fajr_angle_deg,
            "isha_angle_deg": c.isha_angle_deg,
            "asr_shadow_factor": c.asr_shadow_factor,
            "dhuhr_correction_minutes": c.dhuhr_correction_minutes,
        }
        for c in prayer_times.CONVENTIONS.values()
    ]

    return {"solar_transit": transits, "daily": daily, "conventions": conventions}


def build_converter():
    month_starts = []
    for year in HIJRI_YEARS:
        for month in range(1, 13):
            for method in converter.MONTH_START_METHODS:
                entry = {"hijri_year": year, "hijri_month": month, "method": method}
                try:
                    entry["start_date"] = converter.month_start_date_for_method(year, month, method).isoformat()
                except ValueError as exc:
                    entry["error"] = str(exc)
                month_starts.append(entry)

    g2h = []
    for date_text in GREGORIAN_DATES_FOR_CONVERSION:
        try:
            result = converter.gregorian_to_hijri(parse_date(date_text))
        except ValueError as exc:
            g2h.append({"date": date_text, "error": str(exc)})
            continue
        g2h.append(
            {
                "date": date_text,
                "hijri_year": result.year,
                "hijri_month": result.month,
                "hijri_day": result.day,
                "month_name": result.month_name,
            }
        )

    h2g = []
    for year in HIJRI_YEARS[:4]:
        for month in (1, 9, 10, 12):
            for day in (1, 15, 29):
                try:
                    result = converter.hijri_to_gregorian(year, month, day)
                except ValueError as exc:
                    h2g.append({"hijri_year": year, "hijri_month": month, "hijri_day": day, "error": str(exc)})
                    continue
                h2g.append(
                    {"hijri_year": year, "hijri_month": month, "hijri_day": day, "gregorian_date": result.isoformat()}
                )

    observations = []
    for year in HIJRI_YEARS[:4]:
        for month in range(1, 13):
            try:
                obs = converter.observation_for_month(year, month)
            except ValueError as exc:
                observations.append({"hijri_year": year, "hijri_month": month, "error": str(exc)})
                continue
            observations.append(
                {
                    "hijri_year": year,
                    "hijri_month": month,
                    "date": obs.date.isoformat(),
                    "moon_altitude_deg": obs.moon_altitude_deg,
                    "elongation_deg": obs.elongation_deg,
                    "moon_age_hours": obs.moon_age_hours,
                    "illumination_fraction": obs.illumination_fraction,
                    "lag_time_minutes": obs.lag_time_minutes,
                    "crescent_width_arcmin": obs.crescent_width_arcmin,
                }
            )

    years = []
    for year in HIJRI_YEARS[:3]:
        try:
            records = archive.generate_hijri_year(year)
        except ValueError as exc:
            years.append({"hijri_year": year, "error": str(exc)})
            continue
        years.append(
            {
                "hijri_year": year,
                "months": [
                    {
                        "month": r.month,
                        "month_name": r.month_name,
                        "start_date_gregorian": r.start_date_gregorian,
                        "end_date_gregorian": r.end_date_gregorian,
                        "length_days": r.length_days,
                    }
                    for r in records
                ],
            }
        )

    return {
        "month_starts": month_starts,
        "gregorian_to_hijri": g2h,
        "hijri_to_gregorian": h2g,
        "observation_for_month": observations,
        "hijri_years": years,
        "month_names": converter.HIJRI_MONTH_NAMES,
        "anchor": {
            "hijri_year": converter._ANCHOR_HIJRI_YEAR,
            "hijri_month": converter._ANCHOR_HIJRI_MONTH,
            "gregorian_date": converter._ANCHOR_GREGORIAN_DATE.isoformat(),
            "conjunction": iso(converter._ANCHOR_CONJUNCTION),
        },
    }


def build_grid():
    """
    The Indonesia visibility grid, as the Celery task computed it.

    The full grid is 3,255 points; pinning every one would bloat the fixture for
    no extra signal, so this samples every 17th point (a stride coprime with the
    93-column row length, so the sample walks across longitudes rather than
    marching down a single meridian) and separately pins the grid's exact shape.
    """
    # Mirrors falak/tasks.py's _LAT_RANGE / _LON_RANGE / _STEP_DEG and its
    # iteration order. Duplicated rather than imported because tasks.py pulls in
    # Celery, and this script stays stdlib-only so CI can run it with a bare
    # python3.
    lat_range = (-11.0, 6.0)
    lon_range = (95.0, 141.0)
    step_deg = 0.5

    coordinates = []
    lat = lat_range[0]
    while lat <= lat_range[1]:
        lon = lon_range[0]
        while lon <= lon_range[1]:
            coordinates.append((round(lat, 2), round(lon, 2)))
            lon += step_deg
        lat += step_deg

    stride = 17

    samples = []
    for index in range(0, len(coordinates), stride):
        lat, lon = coordinates[index]
        date = parse_date("2024-04-08")
        try:
            obs = vis.compute_hilal_observation(date, lat, lon)
        except ValueError as exc:
            samples.append({"index": index, "lat": lat, "lon": lon, "error": str(exc)})
            continue

        verdicts = {
            "wujudul_hilal": str(vis.wujudul_hilal(obs.moonset_time, obs.sunset_time, obs.conjunction_time)),
            "mabims_2021": str(vis.mabims_2021(obs.moon_altitude_deg, obs.elongation_deg)),
            "odeh": vis.odeh_criterion(obs.moon_altitude_deg, obs.elongation_deg, obs.crescent_width_arcmin),
        }
        samples.append(
            {
                "index": index,
                "lat": lat,
                "lon": lon,
                "moon_altitude_deg": obs.moon_altitude_deg,
                "elongation_deg": obs.elongation_deg,
                "verdicts": verdicts,
            }
        )

    return {
        "date": "2024-04-08",
        "stride": stride,
        "shape": {
            "count": len(coordinates),
            "lat_range": list(lat_range),
            "lon_range": list(lon_range),
            "step_deg": step_deg,
            "first": list(coordinates[0]),
            "last": list(coordinates[-1]),
        },
        "samples": samples,
    }


def main() -> int:
    payload = {
        "_readme": (
            "Generated by backend/scripts/generate_golden_vectors.py from the "
            "Python engine, which is the validated oracle. Do not hand-edit: "
            "regenerate and commit."
        ),
        "timescale": build_timescale(),
        "solar": build_solar(),
        "lunar": build_lunar(),
        "horizon": build_horizon(),
        "conjunction": build_conjunction(),
        "visibility": build_visibility(),
        "qibla": build_qibla(),
        "prayer_times": build_prayer_times(),
        "converter": build_converter(),
        "grid": build_grid(),
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("w") as handle:
        json.dump(payload, handle, indent=1, sort_keys=True)
        handle.write("\n")

    counts = {
        section: sum(len(v) for v in body.values() if isinstance(v, list))
        for section, body in payload.items()
        if isinstance(body, dict)
    }
    total = sum(counts.values())
    print(f"wrote {OUTPUT_PATH.relative_to(OUTPUT_PATH.parent.parent.parent.parent.parent)}")
    for section, count in sorted(counts.items()):
        print(f"  {section:<14} {count:>5} vectors")
    print(f"  {'TOTAL':<14} {total:>5} vectors")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
