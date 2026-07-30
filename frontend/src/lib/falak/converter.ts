/**
 * Port of backend/falak/calendar_engine/converter.py.
 *
 * Hijri <-> Gregorian conversion using real astronomical month boundaries
 * (conjunction + a selectable visibility criterion), per PRD 4.1/8.1.
 *
 * MVP simplification (documented, not silent): month-start visibility is
 * evaluated at a single reference location (Jakarta by default) rather than
 * modelling Kemenag's "wilayatul hukmi" whole-Indonesia rule.
 *
 * Month-number bookkeeping: the Hijri calendar has exactly 12 months every year
 * with no intercalation, so (year, month) maps bijectively onto a zero-based
 * absolute month index. That index is anchored at 1 Ramadhan 1445H =
 * 2024-03-12, a publicly documented Kemenag sidang isbat date, and the
 * conjunction chain is walked forward or backward from there - so every other
 * month boundary is derived from this engine, not a lookup table.
 */
import { nextConjunction, previousConjunction } from "./conjunction";
import {
  addDays,
  comparePlainDates,
  daysBetween,
  instantFromCivil,
  parsePlainDate,
  plainDateOf,
  roundHalfEven,
  type Instant,
  type PlainDate,
} from "./time";
import {
  computeHilalObservation,
  mabims2021,
  odehCriterion,
  wujudulHilal,
  type HilalMethod,
  type HilalObservation,
} from "./visibility";

export const MONTH_START_METHODS: readonly HilalMethod[] = [
  "wujudul_hilal",
  "mabims_2021",
  "odeh",
];

export const JAKARTA_LATITUDE_DEG = -6.2;
export const JAKARTA_LONGITUDE_DEG = 106.8;

export const HIJRI_MONTH_NAMES = [
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
] as const;

const ANCHOR_HIJRI_YEAR = 1445;
const ANCHOR_HIJRI_MONTH = 9; // Ramadhan
const ANCHOR_GREGORIAN_DATE: PlainDate = parsePlainDate("2024-03-12");
const ANCHOR_CONJUNCTION: Instant = instantFromCivil(2024, 3, 10, 9, 1, 49);

function absoluteMonthIndex(hijriYear: number, hijriMonth: number): number {
  return (hijriYear - 1) * 12 + (hijriMonth - 1);
}

const ANCHOR_INDEX = absoluteMonthIndex(ANCHOR_HIJRI_YEAR, ANCHOR_HIJRI_MONTH);

function indexToYearMonth(index: number): [number, number] {
  const year = Math.floor(index / 12);
  const month0 = index - year * 12;
  return [year + 1, month0 + 1];
}

/**
 * Walking the conjunction chain one lunation at a time is the correctness-
 * critical part of this module, and also the expensive part: each step is a
 * bisection over the full solar+lunar series. Results are memoised per index
 * because a single calendar page asks for dozens of adjacent months, and in the
 * browser this runs on the user's main thread rather than a server.
 */
const conjunctionCache = new Map<number, Instant>();

function conjunctionForIndex(index: number): Instant {
  const cached = conjunctionCache.get(index);
  if (cached !== undefined) return cached;

  // Walk from the nearest already-known index rather than always from the
  // anchor, so scanning a year costs one lunation step per month.
  let nearestIndex = ANCHOR_INDEX;
  let nearestConjunction = ANCHOR_CONJUNCTION;
  conjunctionCache.forEach((knownConjunction, knownIndex) => {
    if (Math.abs(knownIndex - index) < Math.abs(nearestIndex - index)) {
      nearestIndex = knownIndex;
      nearestConjunction = knownConjunction;
    }
  });

  let conjunction = nearestConjunction;
  const delta = index - nearestIndex;
  for (let step = 0; step < Math.abs(delta); step += 1) {
    conjunction = delta > 0 ? nextConjunction(conjunction) : previousConjunction(conjunction);
  }

  conjunctionCache.set(index, conjunction);
  return conjunction;
}

/**
 * Collapse each criterion to the yes/no decision a month-start search needs.
 * Odeh's classification is continuous - for this decision only, anything better
 * than "marginal" counts as a go; the raw classification string is never
 * dropped from the payloads that surface it elsewhere.
 */
function isVisibleForMethod(observation: HilalObservation, method: HilalMethod): boolean {
  if (method === "wujudul_hilal") {
    return wujudulHilal(
      observation.moonsetTime,
      observation.sunsetTime,
      observation.conjunctionTime,
    );
  }
  if (method === "mabims_2021") {
    return mabims2021(observation.moonAltitudeDeg, observation.elongationDeg);
  }
  if (method === "odeh") {
    const verdict = odehCriterion(
      observation.moonAltitudeDeg,
      observation.elongationDeg,
      observation.crescentWidthArcmin,
    );
    return verdict === "visible" || verdict === "visible_optical_aid";
  }
  throw new Error(
    `unsupported month-start method: '${method}'; supported: ${MONTH_START_METHODS.join(", ")}`,
  );
}

/**
 * Evaluate `method` on the evening of (and, if needed, the evenings after) the
 * conjunction date to find which Gregorian day the new Hijri month begins on.
 * Islamic day convention: if the crescent is visible at sunset on Gregorian day
 * D, the new month's first full day is D+1.
 */
function monthStartFromConjunction(
  conjunction: Instant,
  method: HilalMethod,
  latDeg: number,
  lonDeg: number,
): PlainDate {
  for (const offset of [0, 1, 2, 3]) {
    const evening = addDays(plainDateOf(conjunction), offset);
    const observation = computeHilalObservation(evening, latDeg, lonDeg);
    if (
      observation.conjunctionTime < observation.sunsetTime &&
      isVisibleForMethod(observation, method)
    ) {
      return addDays(evening, 1);
    }
  }
  throw new Error(
    `could not establish month start (${method}) within 3 evenings of conjunction`,
  );
}

/** Gregorian date of day 1 of the given Hijri year/month, evaluated under `method`. */
export function monthStartDateForMethod(
  hijriYear: number,
  hijriMonth: number,
  method: HilalMethod,
  latDeg: number = JAKARTA_LATITUDE_DEG,
  lonDeg: number = JAKARTA_LONGITUDE_DEG,
): PlainDate {
  if (!MONTH_START_METHODS.includes(method)) {
    throw new Error(
      `unsupported month-start method: '${method}'; supported: ${MONTH_START_METHODS.join(", ")}`,
    );
  }
  const index = absoluteMonthIndex(hijriYear, hijriMonth);
  return monthStartFromConjunction(conjunctionForIndex(index), method, latDeg, lonDeg);
}

/** Gregorian date of day 1 of the given Hijri year/month (MABIMS-2021). */
export function monthStartDate(
  hijriYear: number,
  hijriMonth: number,
  latDeg: number = JAKARTA_LATITUDE_DEG,
  lonDeg: number = JAKARTA_LONGITUDE_DEG,
): PlainDate {
  return monthStartDateForMethod(hijriYear, hijriMonth, "mabims_2021", latDeg, lonDeg);
}

/**
 * The reference "29th evening" observation for `hijriMonth` - one data point per
 * month regardless of which criterion is later evaluated against it. Anchored to
 * the evening before the MABIMS-2021-resolved month start rather than to the raw
 * conjunction date: the conjunction date itself is always too early for any
 * criterion to call visible, so it would make every month in a calendar view
 * look like "not visible" regardless of the selected method.
 */
export function observationForMonth(
  hijriYear: number,
  hijriMonth: number,
  latDeg: number = JAKARTA_LATITUDE_DEG,
  lonDeg: number = JAKARTA_LONGITUDE_DEG,
): HilalObservation {
  const start = monthStartDateForMethod(hijriYear, hijriMonth, "mabims_2021", latDeg, lonDeg);
  return computeHilalObservation(addDays(start, -1), latDeg, lonDeg);
}

export interface HijriDate {
  year: number;
  month: number;
  day: number;
  monthName: string;
}

export function hijriToGregorian(
  hijriYear: number,
  hijriMonth: number,
  hijriDay: number,
  latDeg: number = JAKARTA_LATITUDE_DEG,
  lonDeg: number = JAKARTA_LONGITUDE_DEG,
): PlainDate {
  const start = monthStartDate(hijriYear, hijriMonth, latDeg, lonDeg);
  return addDays(start, hijriDay - 1);
}

export function gregorianToHijri(
  date: PlainDate,
  latDeg: number = JAKARTA_LATITUDE_DEG,
  lonDeg: number = JAKARTA_LONGITUDE_DEG,
): HijriDate {
  const daysSinceAnchor = daysBetween(ANCHOR_GREGORIAN_DATE, date);
  const estimateIndex = ANCHOR_INDEX + roundHalfEven(daysSinceAnchor / 29.530588861);

  for (let index = estimateIndex - 2; index <= estimateIndex + 2; index += 1) {
    const [year, month] = indexToYearMonth(index);
    const [nextYear, nextMonth] = indexToYearMonth(index + 1);
    const start = monthStartDate(year, month, latDeg, lonDeg);
    const nextStart = monthStartDate(nextYear, nextMonth, latDeg, lonDeg);
    if (comparePlainDates(start, date) <= 0 && comparePlainDates(date, nextStart) < 0) {
      return {
        year,
        month,
        day: daysBetween(start, date) + 1,
        monthName: HIJRI_MONTH_NAMES[month - 1],
      };
    }
  }

  throw new Error(
    `could not bracket a Hijri month containing ${date.year}-${date.month}-${date.day}`,
  );
}

export const ANCHOR = {
  hijriYear: ANCHOR_HIJRI_YEAR,
  hijriMonth: ANCHOR_HIJRI_MONTH,
  gregorianDate: ANCHOR_GREGORIAN_DATE,
  conjunction: ANCHOR_CONJUNCTION,
} as const;
