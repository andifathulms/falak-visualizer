/**
 * Port of backend/falak/calendar_engine/isbat_accuracy.py plus the IsbatRecord
 * rows it read from Postgres.
 *
 * Compares real, historically-announced Kemenag sidang isbat dates against what
 * each hisab criterion would have predicted for the same Hijri month. Per-method
 * failures are surfaced in `errors`, never silently dropped.
 *
 * The record list is the one piece of this app that was genuinely persisted data
 * rather than derived output - so it moves here, as a static table, which is all
 * the database was ever doing with it (no writes, no per-user state).
 */
import {
  HIJRI_MONTH_NAMES,
  JAKARTA_LATITUDE_DEG,
  JAKARTA_LONGITUDE_DEG,
  MONTH_START_METHODS,
  monthStartDateForMethod,
} from "./converter";
import { formatPlainDate } from "./time";
import type { HilalMethod } from "./visibility";

export interface IsbatRecord {
  hijriYear: number;
  /** 9 = Ramadhan, 10 = Syawal, 12 = Dzulhijjah. */
  hijriMonth: number;
  gregorianStartDate: string;
  sourceNote: string;
  verified: boolean;
}

/**
 * TODO(maintainer): every row added here needs a real, citable Kemenag sidang
 * isbat date and source note. This list is intentionally empty - carried over
 * as-is from the Django seed migration (0003_seed_isbat_records), which shipped
 * with `SEED_RECORDS = []` for the same reason. Do not populate it from memory
 * or from a secondary aggregator; leave `verified: false` until a maintainer has
 * cross-checked the entry against a primary Kemenag press release or a Bimas
 * Islam Kemenag publication.
 *
 * Expected shape:
 *   {
 *     hijriYear: 1445,
 *     hijriMonth: 9,
 *     gregorianStartDate: "2024-03-12",
 *     sourceNote: "Kemenag sidang isbat press release, <date>, <URL>",
 *     verified: false,
 *   }
 */
export const ISBAT_RECORDS: readonly IsbatRecord[] = [];

export interface IsbatComparison {
  hijri_year: number;
  hijri_month: number;
  hijri_month_name: string;
  actual_start_date: string;
  source_note: string;
  verified: boolean;
  predicted: Partial<Record<HilalMethod, string>>;
  errors: Record<string, string>;
  matches: Partial<Record<HilalMethod, boolean | null>>;
}

export function compareRecord(
  record: IsbatRecord,
  latDeg: number = JAKARTA_LATITUDE_DEG,
  lonDeg: number = JAKARTA_LONGITUDE_DEG,
): IsbatComparison {
  const predicted: Partial<Record<HilalMethod, string>> = {};
  const errors: Record<string, string> = {};
  const matches: Partial<Record<HilalMethod, boolean | null>> = {};

  for (const method of MONTH_START_METHODS) {
    try {
      const predictedDate = formatPlainDate(
        monthStartDateForMethod(record.hijriYear, record.hijriMonth, method, latDeg, lonDeg),
      );
      predicted[method] = predictedDate;
      matches[method] = predictedDate === record.gregorianStartDate;
    } catch (error) {
      errors[method] = error instanceof Error ? error.message : String(error);
      matches[method] = null;
    }
  }

  return {
    hijri_year: record.hijriYear,
    hijri_month: record.hijriMonth,
    hijri_month_name: HIJRI_MONTH_NAMES[record.hijriMonth - 1],
    actual_start_date: record.gregorianStartDate,
    source_note: record.sourceNote,
    verified: record.verified,
    predicted,
    errors,
    matches,
  };
}
