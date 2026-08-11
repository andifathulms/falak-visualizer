/**
 * Port of backend/falak/astronomy/_horizon.py.
 *
 * Shared topocentric-altitude / rise-set machinery used by both visibility.ts
 * (sunset/moonset for hilal observation) and prayerTimes.ts.
 *
 * Rise/set times are found by direct bisection on the altitude function rather
 * than Meeus' interpolated three-point method (Ch. 15): the position functions
 * are cheap enough to evaluate at arbitrary times that bisection converges to
 * sub-second precision without the interpolation shortcut, and is easier to
 * reason about and test.
 */
import { julianCenturies, julianDay } from "./timescale";
import {
  DEG,
  HOUR_US,
  MINUTE_US,
  mod,
  quantizeToMicrosecond,
  SECOND_US,
  startOfDay,
  type Instant,
  type PlainDate,
} from "./time";

/** Mean sidereal time at Greenwich, degrees (Meeus eq. 12.4). */
export function apparentSiderealTimeDeg(jd: number): number {
  const t = julianCenturies(jd);
  const theta0 =
    280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * t * t - t ** 3 / 38710000;
  // theta0 runs strongly negative for dates before J2000, where Python's
  // modulo returns a positive angle and JavaScript's would not.
  return mod(theta0, 360);
}

/** Ecliptic (lambda, beta) -> equatorial (RA, Dec), degrees (Meeus eq. 13.3/13.4). */
export function equatorialFromEcliptic(
  lonDeg: number,
  latDeg: number,
  obliquityDeg: number,
): [number, number] {
  const lam = lonDeg * DEG;
  const bet = latDeg * DEG;
  const eps = obliquityDeg * DEG;

  const ra = Math.atan2(
    Math.sin(lam) * Math.cos(eps) - Math.tan(bet) * Math.sin(eps),
    Math.cos(lam),
  );
  const dec = Math.asin(
    Math.sin(bet) * Math.cos(eps) + Math.cos(bet) * Math.sin(eps) * Math.sin(lam),
  );
  return [mod(ra / DEG, 360), dec / DEG];
}

/** Geocentric apparent altitude of a body above the astronomical horizon. */
export function altitudeDeg(
  raDeg: number,
  decDeg: number,
  latDeg: number,
  lonEastDeg: number,
  jd: number,
): number {
  const lst = mod(apparentSiderealTimeDeg(jd) + lonEastDeg, 360);
  let h = mod(lst - raDeg, 360);
  if (h > 180) h -= 360;

  const lat = latDeg * DEG;
  const dec = decDeg * DEG;
  const hRad = h * DEG;

  const sinAlt =
    Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(hRad);
  return Math.asin(Math.max(-1, Math.min(1, sinAlt))) / DEG;
}

/**
 * Geocentric altitude -> topocentric altitude, i.e. what an observer on the
 * Earth's surface sees rather than what a hypothetical observer at the Earth's
 * centre would (Meeus Ch. 40).
 *
 * This matters for exactly one body: the Moon. Its horizontal parallax is about
 * 0.95-1.02 deg, so a geocentric altitude overstates what anyone can actually
 * see by nearly a degree near the horizon - which is the entire range hilal
 * criteria operate in. For the Sun the same correction is 8.8 arcsec and is
 * left unapplied.
 *
 * The shift is `asin(sin(pi) * cos(alt))`, which depends on the topocentric
 * altitude it is solving for; one refinement pass is enough, since the residual
 * after it is well under an arcsecond for lunar parallax.
 *
 * Deliberately omitted: the observer's height above sea level and the Earth's
 * flattening (Meeus' rho*sin(phi') / rho*cos(phi') terms). Both change the
 * result by well under an arcminute at hilal altitudes, and including them
 * would require an elevation input the app does not collect.
 */
export function topocentricAltitudeDeg(
  geocentricAltitudeDeg: number,
  horizontalParallaxDeg: number,
): number {
  const piRad = horizontalParallaxDeg * DEG;
  let alt = geocentricAltitudeDeg * DEG;
  for (let i = 0; i < 2; i += 1) {
    const shift = Math.asin(Math.max(-1, Math.min(1, Math.sin(piRad) * Math.cos(alt))));
    alt = geocentricAltitudeDeg * DEG - shift;
  }
  return alt / DEG;
}

/**
 * The geocentric altitude at which the Moon's upper limb appears to touch the
 * horizon: Meeus' h0 = 0.7275 * pi - 0.5667 deg (Ch. 15).
 *
 * The -0.8333 deg constant used for the Sun is wrong for the Moon on two counts
 * - it assumes a body with no meaningful parallax, and it bakes in the Sun's
 * semidiameter. For the Moon the parallax term dominates and flips the sign: h0
 * lands around +0.12 deg, so moonset happens measurably earlier than a
 * solar-style threshold would place it. That difference propagates straight
 * into lag time and into the wujudul hilal verdict, which is a comparison of
 * moonset against sunset.
 */
export function moonStandardAltitudeDeg(horizontalParallaxDeg: number): number {
  return 0.7275 * horizontalParallaxDeg - 0.5667;
}

/** instant -> [raDeg, decDeg] */
export type PositionFunc = (instant: Instant) => [number, number];

/** Rough UTC instant of local mean noon, used only as a search-window anchor. */
function localNoonUtc(date: PlainDate, lonEastDeg: number): Instant {
  const offsetHours = lonEastDeg / 15;
  const naiveNoon = startOfDay(date) + 12 * HOUR_US;
  return naiveNoon - quantizeToMicrosecond(offsetHours * HOUR_US);
}

/**
 * Find the UTC instant the body crosses `targetAltitudeDeg` (ascending for
 * rising=true i.e. sunrise/moonrise, descending for rising=false i.e.
 * sunset/moonset) within the local calendar day `date`. Returns null if no such
 * crossing exists that day (e.g. polar conditions) - the caller decides what
 * that means rather than receiving a substituted value.
 */
export function findHorizonCrossing(
  date: PlainDate,
  latDeg: number,
  lonEastDeg: number,
  positionFunc: PositionFunc,
  targetAltitudeDeg: number,
  rising: boolean,
  toleranceSeconds = 1.0,
): Instant | null {
  const windowStart = localNoonUtc(date, lonEastDeg) - 12 * HOUR_US;
  const windowEnd = windowStart + 36 * HOUR_US;

  const altDiff = (instant: Instant): number => {
    const [ra, dec] = positionFunc(instant);
    return altitudeDeg(ra, dec, latDeg, lonEastDeg, julianDay(instant)) - targetAltitudeDeg;
  };

  const step = 10 * MINUTE_US;
  const samples: Array<[Instant, number]> = [];
  for (let t = windowStart; t <= windowEnd; t += step) {
    samples.push([t, altDiff(t)]);
  }

  const targetLocalHour = rising ? 6 : 18;
  let bestBracket: [Instant, number, Instant, number] | null = null;
  let bestDistance: number | null = null;

  for (let i = 0; i + 1 < samples.length; i += 1) {
    const [t0, f0] = samples[i];
    const [t1, f1] = samples[i + 1];
    const crossesUp = f0 <= 0 && 0 < f1;
    const crossesDown = f0 > 0 && 0 >= f1;
    if ((rising && crossesUp) || (!rising && crossesDown)) {
      const localHour = mod((t0 - windowStart) / HOUR_US + 12, 24);
      const gap = Math.abs(localHour - targetLocalHour);
      const distance = Math.min(gap, 24 - gap);
      if (bestDistance === null || distance < bestDistance) {
        bestDistance = distance;
        bestBracket = [t0, f0, t1, f1];
      }
    }
  }

  if (bestBracket === null) return null;

  let [lo, fLo, hi] = bestBracket;
  while ((hi - lo) / SECOND_US > toleranceSeconds) {
    const mid = lo + quantizeToMicrosecond((hi - lo) / 2);
    const fMid = altDiff(mid);
    if (fMid > 0 === fLo > 0) {
      lo = mid;
      fLo = fMid;
    } else {
      hi = mid;
    }
  }

  return lo + quantizeToMicrosecond((hi - lo) / 2);
}
