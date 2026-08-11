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
 * Announced sidang isbat determinations, each traced to a press release on
 * Kemenag's national domain.
 *
 * Standard for adding a row, unchanged from when this list was empty: a real,
 * citable Kemenag sidang isbat date, sourced from a primary Kemenag press
 * release or a Bimas Islam Kemenag publication. Never from memory, never from a
 * secondary aggregator, and never from a provincial Kanwil republication where
 * the national release exists.
 *
 * `verified` stays false on every row below. That flag does not mean "I found a
 * URL" - it means a maintainer has opened the release and confirmed the date
 * against it. These were sourced from the national kemenag.go.id press-release
 * pages named in each sourceNote and cross-checked for internal consistency
 * (each Ramadhan/Syawal pair yields a 29- or 30-day month, which all six do),
 * but that is not the same as a human having read them. Flip the flag as you
 * confirm each one.
 *
 * Dzulhijjah rows are deliberately absent: no national press release was
 * located for them during this pass, and inventing the dates from the Ramadhan
 * announcements would defeat the point of the list.
 */
export const ISBAT_RECORDS: readonly IsbatRecord[] = [
  {
    hijriYear: 1445,
    hijriMonth: 9,
    gregorianStartDate: "2024-03-12",
    sourceNote:
      "Kemenag press release, \"Pemerintah Tetapkan 1 Ramadan 1445 H Jatuh pada 12 Maret 2024\" — https://kemenag.go.id/pers-rilis/pemerintah-tetapkan-1-ramadan-1445-h-jatuh-pada-12-maret-2024-6LqLP",
    verified: false,
  },
  {
    hijriYear: 1445,
    hijriMonth: 10,
    gregorianStartDate: "2024-04-10",
    sourceNote:
      "Kemenag press release, \"Pemerintah Tetapkan 1 Syawal 1445 H Jatuh pada 10 April 2024\" — https://kemenag.go.id/pers-rilis/pemerintah-tetapkan-1-syawal-1445-h-jatuh-pada-10-april-2024-9cEIu",
    verified: false,
  },
  {
    hijriYear: 1446,
    hijriMonth: 9,
    gregorianStartDate: "2025-03-01",
    sourceNote:
      "Kemenag press release, \"Pemerintah Tetapkan 1 Ramadan 1446 H Jatuh pada 1 Maret 2025\" — https://kemenag.go.id/pers-rilis/pemerintah-tetapkan-1-ramadan-1446-h-jatuh-pada-1-maret-2025-YzheO",
    verified: false,
  },
  {
    hijriYear: 1446,
    hijriMonth: 10,
    gregorianStartDate: "2025-03-31",
    sourceNote:
      "Kemenag press release, \"Pemerintah Tetapkan 1 Syawal 1446 H Jatuh pada 31 Maret 2025\" — https://kemenag.go.id/pers-rilis/pemerintah-tetapkan-1-syawal-1446-h-jatuh-pada-31-maret-2025-9kv5c",
    verified: false,
  },
  {
    hijriYear: 1447,
    hijriMonth: 9,
    gregorianStartDate: "2026-02-19",
    sourceNote:
      "Kemenag press release, \"Pemerintah Tetapkan 1 Ramadan 1447 H Jatuh pada 19 Februari 2026\" — https://kemenag.go.id/pers-rilis/pemerintah-tetapkan-1-ramadan-1447-h-jatuh-pada-19-februari-2026-ELDWq",
    verified: false,
  },
  {
    hijriYear: 1447,
    hijriMonth: 10,
    gregorianStartDate: "2026-03-21",
    sourceNote:
      "Kemenag press release, \"Pemerintah Tetapkan 1 Syawal 1447 H Bertepatan 21 Maret 2026\" — https://kemenag.go.id/pers-rilis/pemerintah-tetapkan-1-syawal-1447-h-bertepatan-21-maret-2026-HZfDD",
    verified: false,
  },
];

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
