"""
Compares real, historically-announced Kemenag sidang isbat dates
(falak.models.IsbatRecord) against what each hisab criterion would have
predicted for the same Hijri month. Per-method failures are surfaced in
`errors`, never silently dropped (CLAUDE.md: no silent fallback values).
"""
from __future__ import annotations

from dataclasses import dataclass, field

from . import converter


@dataclass(frozen=True)
class IsbatComparison:
    hijri_year: int
    hijri_month: int
    hijri_month_name: str
    actual_start_date: str
    source_note: str
    verified: bool
    predicted: dict = field(default_factory=dict)
    errors: dict = field(default_factory=dict)
    matches: dict = field(default_factory=dict)


def compare_record(
    record,
    lat_deg: float = converter.JAKARTA_LATITUDE_DEG,
    lon_deg: float = converter.JAKARTA_LONGITUDE_DEG,
) -> IsbatComparison:
    predicted: dict[str, str] = {}
    errors: dict[str, str] = {}
    matches: dict[str, "bool | None"] = {}

    for method in converter.MONTH_START_METHODS:
        try:
            predicted_date = converter.month_start_date_for_method(
                record.hijri_year, record.hijri_month, method, lat_deg, lon_deg
            )
        except ValueError as exc:
            errors[method] = str(exc)
            matches[method] = None
            continue
        predicted[method] = predicted_date.isoformat()
        matches[method] = predicted_date == record.gregorian_start_date

    return IsbatComparison(
        hijri_year=record.hijri_year,
        hijri_month=record.hijri_month,
        hijri_month_name=converter.HIJRI_MONTH_NAMES[record.hijri_month - 1],
        actual_start_date=record.gregorian_start_date.isoformat(),
        source_note=record.source_note,
        verified=record.verified,
        predicted=predicted,
        errors=errors,
        matches=matches,
    )
