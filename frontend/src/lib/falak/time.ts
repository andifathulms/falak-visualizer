/**
 * Time primitives for the browser astronomy engine.
 *
 * The Python engine (backend/falak/astronomy) works in naive UTC
 * `datetime.datetime` and `datetime.date`. Reproducing it faithfully in
 * TypeScript means avoiding `Date` for arithmetic entirely: `new Date(iso)`
 * treats an offset-less string as *local* time, and `Date` carries only
 * millisecond precision where Python carries microseconds.
 *
 * So an instant here is a plain number - milliseconds since the Unix epoch in
 * UTC, fractional part allowed - and a calendar day is a `PlainDate` record.
 * `Date` appears only as a civil-fields calculator inside this module.
 *
 * Two Python behaviours are load-bearing and are reimplemented explicitly:
 *
 *   - `%` on floats. Python's modulo takes the sign of the divisor, so
 *     `-5 % 360 == 355`; JavaScript's takes the sign of the dividend and gives
 *     `-5`. The engine relies on the Python result to normalise angles, and it
 *     matters for real inputs: apparent sidereal time is computed from a
 *     polynomial that goes strongly negative for any date before J2000.
 *
 *   - `round()`. Python rounds halves to even; `Math.round` rounds halves up.
 *     Three places in the engine round a value that can land exactly on .5 -
 *     a Julian-day second count, a lunation number, and a month index.
 */

/**
 * Whole microseconds since the Unix epoch, UTC.
 *
 * Microseconds, not milliseconds, and integral rather than fractional: this is
 * exactly the resolution Python's `datetime`/`timedelta` store, and matching it
 * is what keeps the two engines bit-identical rather than merely close.
 *
 * The reason is worth recording, because a float-millisecond instant looks fine
 * and is not. Rise/set times come from bisection, which repeatedly halves an
 * interval and adds it back. Python halves an integer microsecond count, so
 * every intermediate lands exactly on the microsecond grid. Halving a float
 * millisecond accumulates a fraction of a microsecond of drift instead - which
 * would be invisible in the time itself, but `julianDay` divides by 86400 and
 * `apparentSiderealTimeDeg` then multiplies the result by 360.98, so a sub-
 * microsecond difference re-emerges as ~1e-7 degrees of altitude. That is small
 * in absolute terms and still large enough to flip a threshold verdict for an
 * observation sitting on the MABIMS boundary.
 *
 * 2^53 microseconds reaches the year 2255, comfortably beyond this product's
 * range, so integer arithmetic never loses precision here.
 */
export type Instant = number;

/** A calendar day with no time or zone attached - Python's `datetime.date`. */
export interface PlainDate {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
}

export const MILLISECOND_US = 1_000;
export const SECOND_US = 1_000_000;
export const MINUTE_US = 60 * SECOND_US;
export const HOUR_US = 60 * MINUTE_US;
export const DAY_US = 24 * HOUR_US;

/** Python's `%`: result carries the sign of the divisor. */
export function mod(value: number, divisor: number): number {
  const remainder = value % divisor;
  return remainder < 0 ? remainder + divisor : remainder;
}

/** Python's `round()`: ties go to the nearest even integer. */
export function roundHalfEven(value: number): number {
  const floor = Math.floor(value);
  const fraction = value - floor;
  if (fraction > 0.5) return floor + 1;
  if (fraction < 0.5) return floor;
  return floor % 2 === 0 ? floor : floor + 1;
}

/**
 * Snap a possibly-fractional microsecond quantity to a whole microsecond.
 *
 * Python's `timedelta` stores whole microseconds and rounds half-to-even when
 * constructed from a float (`timedelta(hours=lon / 15)`) or divided by an int
 * (`(hi - lo) / 2`). Applying the same rounding at the same points keeps the two
 * engines stepping through identical instants.
 */
export function quantizeToMicrosecond(microseconds: number): number {
  return roundHalfEven(microseconds);
}

/** Normalise an angle in degrees to [0, 360) - the engine's `_norm_degrees`. */
export function normDegrees(degrees: number): number {
  return mod(degrees, 360);
}

/** Wrap an angle in degrees to (-180, 180] - the engine's `_wrap180`. */
export function wrap180(degrees: number): number {
  const wrapped = mod(degrees, 360);
  return wrapped > 180 ? wrapped - 360 : wrapped;
}

export const DEG = Math.PI / 180;

export function radians(degrees: number): number {
  return degrees * DEG;
}

export function degrees(radiansValue: number): number {
  return radiansValue / DEG;
}

interface CivilFields {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  microsecond: number;
}

export function instantFromCivil(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  microsecond = 0,
): Instant {
  return Date.UTC(year, month - 1, day, hour, minute, second) * MILLISECOND_US + microsecond;
}

export function civilFromInstant(instant: Instant): CivilFields {
  // Split off the sub-second part first so `Date` - which only understands
  // milliseconds - never sees it.
  const microsecond = mod(instant, SECOND_US);
  const epochSeconds = (instant - microsecond) / SECOND_US;

  const date = new Date(epochSeconds * 1000);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
    microsecond,
  };
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

/**
 * Format an instant the way the Django API did: `datetime.isoformat()` with
 * `+00:00` rewritten to `Z` (Django REST Framework's DateTimeField). Python
 * omits the fractional part entirely when microseconds are zero, so this does
 * too - the frontend parses these with `new Date(...)`, which accepts both.
 */
export function formatInstant(instant: Instant): string {
  const c = civilFromInstant(instant);
  const date = `${pad(c.year, 4)}-${pad(c.month, 2)}-${pad(c.day, 2)}`;
  const time = `${pad(c.hour, 2)}:${pad(c.minute, 2)}:${pad(c.second, 2)}`;
  const fraction = c.microsecond === 0 ? "" : `.${pad(c.microsecond, 6)}`;
  return `${date}T${time}${fraction}Z`;
}

/**
 * Parse an ISO 8601 instant. Accepts a trailing `Z` or none at all; an absent
 * zone means UTC here, unlike `new Date()`, which would read it as local time.
 */
export function parseInstant(text: string): Instant {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?(?:Z|\+00:00)?$/.exec(text);
  if (match === null) {
    throw new Error(`not an ISO 8601 UTC instant: ${text}`);
  }
  const [, year, month, day, hour, minute, second = "0", fraction = ""] = match;
  const microsecond = fraction === "" ? 0 : Number(fraction.padEnd(6, "0"));
  return instantFromCivil(
    Number(year),
    Number(month),
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
    microsecond,
  );
}

export function parsePlainDate(text: string): PlainDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (match === null) {
    throw new Error(`not an ISO 8601 date (YYYY-MM-DD): ${text}`);
  }
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

export function formatPlainDate(date: PlainDate): string {
  return `${pad(date.year, 4)}-${pad(date.month, 2)}-${pad(date.day, 2)}`;
}

/** Midnight UTC at the start of `date`. */
export function startOfDay(date: PlainDate): Instant {
  return instantFromCivil(date.year, date.month, date.day);
}

/** The calendar day an instant falls on - Python's `datetime.date()`. */
export function plainDateOf(instant: Instant): PlainDate {
  const c = civilFromInstant(instant);
  return { year: c.year, month: c.month, day: c.day };
}

export function addDays(date: PlainDate, days: number): PlainDate {
  return plainDateOf(startOfDay(date) + days * DAY_US);
}

/** Whole days from `from` to `to` - Python's `(to - from).days`. */
export function daysBetween(from: PlainDate, to: PlainDate): number {
  return Math.round((startOfDay(to) - startOfDay(from)) / DAY_US);
}

export function comparePlainDates(a: PlainDate, b: PlainDate): number {
  return startOfDay(a) - startOfDay(b);
}

/** 1-based day of year - Python's `timetuple().tm_yday`. */
export function dayOfYear(date: PlainDate): number {
  return daysBetween({ year: date.year, month: 1, day: 1 }, date) + 1;
}

/** Days in a Gregorian month - Python's `calendar.monthrange(y, m)[1]`. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
