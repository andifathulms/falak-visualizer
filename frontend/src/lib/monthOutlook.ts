/**
 * Everything the UI says about ONE Hijri month's start: its conjunction, the
 * deciding evening, and the Gregorian day 1 under each criterion. Shared by
 * Hari ini, Awal Bulan and Kalender so they can never disagree about the same
 * month.
 *
 * Pure composition of already-exported engine functions (converter.ts,
 * visibility.ts) - no new astronomy. A criterion the engine cannot resolve is
 * reported in `errors`, never filled in (CLAUDE.md: no silent fallback).
 */
import {
  conjunctionForHijriMonth,
  gregorianToHijri,
  monthStartDateForMethod,
  observationForMonth,
  type HijriDate,
} from "./falak/converter";
import { evaluateCriteria, type HilalCriteria, type HilalMethod, type HilalObservation } from "./falak/visibility";
import { daysBetween, type Instant, type PlainDate } from "./falak/time";

export const METHODS: readonly HilalMethod[] = ["mabims_2021", "wujudul_hilal", "odeh"];

export interface MonthOutlook {
  hijriYear: number;
  hijriMonth: number;
  conjunction: Instant;
  /** The first sunset after the conjunction - the evening sidang isbat convenes for. */
  deciding: HilalObservation | null;
  decidingCriteria: HilalCriteria | null;
  starts: Partial<Record<HilalMethod, PlainDate>>;
  errors: Partial<Record<HilalMethod | "deciding", string>>;
  /** True when every resolved criterion lands on the same day 1. */
  unanimous: boolean;
}

export function nextHijriMonth(year: number, month: number): [number, number] {
  return month === 12 ? [year + 1, 1] : [year, month + 1];
}

export function previousHijriMonth(year: number, month: number): [number, number] {
  return month === 1 ? [year - 1, 12] : [year, month - 1];
}

export function monthOutlook(hijriYear: number, hijriMonth: number, latDeg: number, lonDeg: number): MonthOutlook {
  const starts: MonthOutlook["starts"] = {};
  const errors: MonthOutlook["errors"] = {};
  for (const method of METHODS) {
    try {
      starts[method] = monthStartDateForMethod(hijriYear, hijriMonth, method, latDeg, lonDeg);
    } catch (error) {
      errors[method] = error instanceof Error ? error.message : String(error);
    }
  }

  let deciding: HilalObservation | null = null;
  let decidingCriteria: HilalCriteria | null = null;
  try {
    deciding = observationForMonth(hijriYear, hijriMonth, latDeg, lonDeg);
    decidingCriteria = evaluateCriteria(deciding);
  } catch (error) {
    errors.deciding = error instanceof Error ? error.message : String(error);
  }

  const resolved = Object.values(starts);
  const unanimous = resolved.length > 1 && resolved.every((d) => d && daysBetween(resolved[0]!, d) === 0);

  return {
    hijriYear,
    hijriMonth,
    conjunction: conjunctionForHijriMonth(hijriYear, hijriMonth),
    deciding,
    decidingCriteria,
    starts,
    errors,
    unanimous,
  };
}

/** Today's Hijri date for the place, or the engine's error message. */
export function hijriToday(today: PlainDate, latDeg: number, lonDeg: number): { date: HijriDate } | { error: string } {
  try {
    return { date: gregorianToHijri(today, latDeg, lonDeg) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

/** The months people count down to (DESIGN.md v2 §6 Hari ini). */
export const KEY_MONTHS = [9, 10, 12] as const;

/**
 * The next Ramadan, Syawal or Zulhijah that has not started yet. When today is
 * already inside one of them, that one is skipped: Hari ini shows "hari ke-N"
 * for the current month separately.
 */
export function nextKeyMonth(current: HijriDate): [number, number] {
  const candidates: Array<[number, number]> = [];
  for (const year of [current.year, current.year + 1]) {
    for (const month of KEY_MONTHS) {
      if (year > current.year || month > current.month) candidates.push([year, month]);
    }
  }
  return candidates[0];
}
