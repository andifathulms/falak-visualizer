"""Historical Hijri Archive: full 12-month calendar generation (PRD 4.6)."""
from __future__ import annotations

import datetime as _dt
from dataclasses import dataclass

from . import converter


@dataclass(frozen=True)
class HijriMonthRecord:
    year: int
    month: int
    month_name: str
    start_date_gregorian: str
    end_date_gregorian: str
    length_days: int


def generate_hijri_year(
    hijri_year: int,
    lat_deg: float = converter.JAKARTA_LATITUDE_DEG,
    lon_deg: float = converter.JAKARTA_LONGITUDE_DEG,
) -> list[HijriMonthRecord]:
    """Full 12-month Hijri calendar for `hijri_year`, with Gregorian equivalents."""
    records = []
    for month in range(1, 13):
        start = converter.month_start_date(hijri_year, month, lat_deg, lon_deg)
        if month == 12:
            next_start = converter.month_start_date(hijri_year + 1, 1, lat_deg, lon_deg)
        else:
            next_start = converter.month_start_date(hijri_year, month + 1, lat_deg, lon_deg)
        length = (next_start - start).days
        records.append(
            HijriMonthRecord(
                year=hijri_year,
                month=month,
                month_name=converter.HIJRI_MONTH_NAMES[month - 1],
                start_date_gregorian=start.isoformat(),
                end_date_gregorian=(next_start - _dt.timedelta(days=1)).isoformat(),
                length_days=length,
            )
        )
    return records
