/**
 * Port of backend/falak/astronomy/conjunction.py.
 *
 * Ijtimak (lunar conjunction) solver: the moment the Moon's and Sun's apparent
 * geocentric ecliptic longitudes coincide.
 *
 * The search is seeded with Meeus' mean new-moon polynomial (Ch. 49, eq. 49.1),
 * accurate to a few hours, then refined by root-finding the longitude
 * difference this engine's own solar.ts / lunar.ts produce. The mean-new-moon
 * formula is only ever a starting guess - the returned time is always the true
 * instant where this engine reports equal longitudes.
 *
 * This is the module cross-validated against JPL DE440 over 50 historical
 * months in the Python suite; the golden vectors pin a contiguous 36-month
 * chain so an off-by-one in the lunation number cannot slip through.
 */
import { lunarPosition } from "./lunar";
import { solarPosition } from "./solar";
import { instantFromJulianDay } from "./timescale";
import { dayOfYear, plainDateOf, roundHalfEven, wrap180, type Instant } from "./time";

export const SYNODIC_MONTH_DAYS = 29.530588861;

/** Meeus eq. 49.1: mean new moon JDE for lunation number k. */
function meanNewMoonJd(k: number): number {
  const t = k / 1236.85;
  return (
    2451550.09766 +
    SYNODIC_MONTH_DAYS * k +
    0.00015437 * t * t -
    0.00000015 * t ** 3 +
    0.00000000073 * t ** 4
  );
}

/** Approximate lunation number k for the new moon nearest `instant` (Meeus 49). */
function lunationEstimate(instant: Instant): number {
  const date = plainDateOf(instant);
  const yearFraction = date.year + (dayOfYear(date) - 1) / 365.25;
  return (yearFraction - 2000.0) * 12.3685;
}

/** Moon apparent longitude minus Sun apparent longitude, wrapped to [-180, 180]. */
function longitudeDiffDeg(jd: number): number {
  const instant = instantFromJulianDay(jd);
  const sunLon = solarPosition(instant).apparentLongitudeDeg;
  const moonLon = lunarPosition(instant).apparentLongitudeDeg;
  return wrap180(moonLon - sunLon);
}

/**
 * Bisection refinement of the JD at which the longitude difference crosses
 * zero, bracketing `jdGuess` with a half-day window (the difference moves
 * ~13 deg/day near conjunction, so a half-day comfortably brackets a single
 * root around an estimate accurate to a few hours).
 */
function refineConjunctionJd(jdGuess: number, toleranceDays = 1e-6): number {
  let lo = jdGuess - 0.5;
  let hi = jdGuess + 0.5;
  let fLo = longitudeDiffDeg(lo);
  let fHi = longitudeDiffDeg(hi);

  if (fLo === 0) return lo;
  if (fHi === 0) return hi;
  if (fLo > 0 === fHi > 0) {
    // Guess wasn't close enough to bracket the root; widen once.
    lo = jdGuess - 2.0;
    hi = jdGuess + 2.0;
    fLo = longitudeDiffDeg(lo);
    fHi = longitudeDiffDeg(hi);
  }

  while (hi - lo > toleranceDays) {
    const mid = (lo + hi) / 2;
    const fMid = longitudeDiffDeg(mid);
    if (fMid > 0 === fLo > 0) {
      lo = mid;
      fLo = fMid;
    } else {
      hi = mid;
    }
  }

  return (lo + hi) / 2;
}

/**
 * The refined conjunction for a lunation number, memoised.
 *
 * `k` is always an integer (floor/ceil/round of the mean estimate), and the
 * refinement is a deterministic function of it alone - so caching returns bit-
 * identical values, never an approximation. This matters in the browser: the
 * visibility grid resolves the same handful of lunations thousands of times, once
 * per grid point, and each miss is a ~20-iteration bisection over the full
 * solar+lunar series.
 */
const conjunctionByLunation = new Map<number, Instant>();

function conjunctionForLunation(k: number): Instant {
  const cached = conjunctionByLunation.get(k);
  if (cached !== undefined) return cached;
  const instant = instantFromJulianDay(refineConjunctionJd(meanNewMoonJd(k)));
  conjunctionByLunation.set(k, instant);
  return instant;
}

/** The ijtimak whose mean estimate is closest to `instant` (may be before or after). */
export function conjunctionNear(instant: Instant): Instant {
  return conjunctionForLunation(roundHalfEven(lunationEstimate(instant)));
}

/** First ijtimak strictly after `after`. */
export function nextConjunction(after: Instant): Instant {
  const k = Math.floor(lunationEstimate(after));
  for (const candidateK of [k, k + 1, k + 2]) {
    const candidate = conjunctionForLunation(candidateK);
    if (candidate > after) return candidate;
  }
  throw new Error("failed to bracket next conjunction");
}

/** Last ijtimak strictly before `before`. */
export function previousConjunction(before: Instant): Instant {
  const k = Math.ceil(lunationEstimate(before));
  for (const candidateK of [k, k - 1, k - 2]) {
    const candidate = conjunctionForLunation(candidateK);
    if (candidate < before) return candidate;
  }
  throw new Error("failed to bracket previous conjunction");
}
