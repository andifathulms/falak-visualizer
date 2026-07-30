/**
 * Port of backend/falak/calendar_engine/archive.py.
 *
 * Historical Hijri Archive: full 12-month calendar generation (PRD 4.6).
 */
import {
  HIJRI_MONTH_NAMES,
  JAKARTA_LATITUDE_DEG,
  JAKARTA_LONGITUDE_DEG,
  monthStartDate,
} from "./converter";
import { addDays, daysBetween, formatPlainDate } from "./time";

export interface HijriMonthRecord {
  year: number;
  month: number;
  monthName: string;
  startDateGregorian: string;
  endDateGregorian: string;
  lengthDays: number;
}

/** Full 12-month Hijri calendar for `hijriYear`, with Gregorian equivalents. */
export function generateHijriYear(
  hijriYear: number,
  latDeg: number = JAKARTA_LATITUDE_DEG,
  lonDeg: number = JAKARTA_LONGITUDE_DEG,
): HijriMonthRecord[] {
  const records: HijriMonthRecord[] = [];
  for (let month = 1; month <= 12; month += 1) {
    const start = monthStartDate(hijriYear, month, latDeg, lonDeg);
    const nextStart =
      month === 12
        ? monthStartDate(hijriYear + 1, 1, latDeg, lonDeg)
        : monthStartDate(hijriYear, month + 1, latDeg, lonDeg);
    records.push({
      year: hijriYear,
      month,
      monthName: HIJRI_MONTH_NAMES[month - 1],
      startDateGregorian: formatPlainDate(start),
      endDateGregorian: formatPlainDate(addDays(nextStart, -1)),
      lengthDays: daysBetween(start, nextStart),
    });
  }
  return records;
}
