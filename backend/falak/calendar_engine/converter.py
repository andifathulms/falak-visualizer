"""
Hijri <-> Gregorian conversion using real astronomical month boundaries
(conjunction + MABIMS-2021 imkanur rukyat criterion), per PRD 4.1/8.1 -
MVP scope is the single MABIMS-2021 method; wujudul hilal / Odeh
comparison is Phase 2 (PRD 9.1).

MVP simplification (documented, not silent): month-start visibility is
evaluated at a single reference location (Jakarta) rather than modeling
Kemenag's "wilayatul hukmi" whole-Indonesia rule (visible anywhere in
Indonesia => whole country starts the month). Revisit once the
visibility-grid precomputation (Phase 1.3 Celery task) is wired up, which
would let this pick "visible anywhere in the archipelago" instead.

Month-number bookkeeping: since the Hijri calendar has exactly 12 months
every year with no intercalation, `(year, month)` maps bijectively onto a
zero-based absolute month index. We anchor that index scale at 1 Ramadhan
1445H = 2024-03-12, an undisputed, publicly documented date (Kemenag sidang
isbat), and walk the conjunction chain (astronomy/conjunction.py) forward
or backward from there - so every other month boundary is derived from our
own engine, not a lookup table.
"""
from __future__ import annotations

import datetime as _dt
from dataclasses import dataclass

from falak.astronomy import conjunction, visibility
from falak.astronomy.visibility import mabims_2021

JAKARTA_LATITUDE_DEG = -6.2
JAKARTA_LONGITUDE_DEG = 106.8

HIJRI_MONTH_NAMES = [
    "Muharram",
    "Safar",
    "Rabi'ul Awwal",
    "Rabi'ul Akhir",
    "Jumadil Awwal",
    "Jumadil Akhir",
    "Rajab",
    "Sya'ban",
    "Ramadhan",
    "Syawal",
    "Dzulqa'dah",
    "Dzulhijjah",
]

_ANCHOR_HIJRI_YEAR = 1445
_ANCHOR_HIJRI_MONTH = 9  # Ramadhan
_ANCHOR_GREGORIAN_DATE = _dt.date(2024, 3, 12)
_ANCHOR_CONJUNCTION = _dt.datetime(2024, 3, 10, 9, 1, 49)  # from conjunction.conjunction_near


def _absolute_month_index(hijri_year: int, hijri_month: int) -> int:
    return (hijri_year - 1) * 12 + (hijri_month - 1)


_ANCHOR_INDEX = _absolute_month_index(_ANCHOR_HIJRI_YEAR, _ANCHOR_HIJRI_MONTH)


def _index_to_year_month(index: int) -> tuple[int, int]:
    year, month0 = divmod(index, 12)
    return year + 1, month0 + 1


def _conjunction_for_index(index: int) -> _dt.datetime:
    delta = index - _ANCHOR_INDEX
    conj = _ANCHOR_CONJUNCTION
    if delta > 0:
        for _ in range(delta):
            conj = conjunction.next_conjunction(conj)
    elif delta < 0:
        for _ in range(-delta):
            conj = conjunction.previous_conjunction(conj)
    return conj


def _month_start_from_conjunction(
    conj: _dt.datetime, lat_deg: float, lon_deg: float
) -> _dt.date:
    """
    Evaluate the MABIMS-2021 criterion on the evening of (and, if needed,
    the evening after) the conjunction date to find which Gregorian day the
    new Hijri month begins on. Islamic day convention: if the crescent is
    visible at sunset on Gregorian day D, the new month's first full day is
    D+1.
    """
    for offset in (0, 1, 2, 3):
        evening = conj.date() + _dt.timedelta(days=offset)
        obs = visibility.compute_hilal_observation(evening, lat_deg, lon_deg)
        if obs.conjunction_time < obs.sunset_time and mabims_2021(
            obs.moon_altitude_deg, obs.elongation_deg
        ):
            return evening + _dt.timedelta(days=1)
    raise ValueError(
        f"could not establish month start within 3 evenings of conjunction {conj}"
    )


def month_start_date(
    hijri_year: int,
    hijri_month: int,
    lat_deg: float = JAKARTA_LATITUDE_DEG,
    lon_deg: float = JAKARTA_LONGITUDE_DEG,
) -> _dt.date:
    """Gregorian date of day 1 of the given Hijri year/month (MABIMS-2021)."""
    index = _absolute_month_index(hijri_year, hijri_month)
    conj = _conjunction_for_index(index)
    return _month_start_from_conjunction(conj, lat_deg, lon_deg)


@dataclass(frozen=True)
class HijriDate:
    year: int
    month: int
    day: int
    month_name: str


def hijri_to_gregorian(
    hijri_year: int,
    hijri_month: int,
    hijri_day: int,
    lat_deg: float = JAKARTA_LATITUDE_DEG,
    lon_deg: float = JAKARTA_LONGITUDE_DEG,
) -> _dt.date:
    start = month_start_date(hijri_year, hijri_month, lat_deg, lon_deg)
    return start + _dt.timedelta(days=hijri_day - 1)


def gregorian_to_hijri(
    date: _dt.date,
    lat_deg: float = JAKARTA_LATITUDE_DEG,
    lon_deg: float = JAKARTA_LONGITUDE_DEG,
) -> HijriDate:
    days_since_anchor = (date - _ANCHOR_GREGORIAN_DATE).days
    estimate_index = _ANCHOR_INDEX + round(days_since_anchor / 29.530588861)

    for index in range(estimate_index - 2, estimate_index + 3):
        start = month_start_date(*_index_to_year_month(index), lat_deg, lon_deg)
        next_start = month_start_date(*_index_to_year_month(index + 1), lat_deg, lon_deg)
        if start <= date < next_start:
            year, month = _index_to_year_month(index)
            day = (date - start).days + 1
            return HijriDate(year=year, month=month, day=day, month_name=HIJRI_MONTH_NAMES[month - 1])

    raise ValueError(f"could not bracket a Hijri month containing {date}")
