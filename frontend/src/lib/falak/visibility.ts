/**
 * Port of backend/falak/astronomy/visibility.py.
 *
 * Hilal (new crescent) visibility: observational quantities at sunset on the
 * 29th of a Hijri month, and the three criteria named in the PRD - wujudul
 * hilal, MABIMS 2021 (imkanur rukyat), and Odeh (2004).
 *
 * Every criterion here is a pure function of already-computed observational
 * numbers, never a black box, so the UI can always show the inputs that
 * produced a verdict (CLAUDE.md: "every verdict must be inspectable").
 */
import { previousConjunction } from "./conjunction";
import { altitudeDeg, equatorialFromEcliptic, findHorizonCrossing } from "./horizon";
import { illuminatedFraction, lunarPosition } from "./lunar";
import { obliquityOfEcliptic, solarPosition } from "./solar";
import { julianDay } from "./timescale";
import {
  degrees,
  HOUR_US,
  MINUTE_US,
  quantizeToMicrosecond,
  radians,
  type Instant,
  type PlainDate,
} from "./time";

/** Apparent altitude at which the Sun's/Moon's upper limb touches the horizon. */
const HORIZON_ALTITUDE_DEG = -0.8333;

export function sunRaDec(instant: Instant): [number, number] {
  const p = solarPosition(instant);
  return [p.apparentRightAscensionDeg, p.apparentDeclinationDeg];
}

export function moonRaDec(instant: Instant): [number, number] {
  const moon = lunarPosition(instant);
  const eps = obliquityOfEcliptic(moon.t);
  return equatorialFromEcliptic(moon.apparentLongitudeDeg, moon.eclipticLatitudeDeg, eps);
}

/** Angular separation between Sun and Moon, via the spherical law of cosines. */
function elongationDeg(
  sunRa: number,
  sunDec: number,
  moonRa: number,
  moonDec: number,
): number {
  const cosElongation =
    Math.sin(radians(sunDec)) * Math.sin(radians(moonDec)) +
    Math.cos(radians(sunDec)) * Math.cos(radians(moonDec)) * Math.cos(radians(moonRa - sunRa));
  return degrees(Math.acos(Math.max(-1, Math.min(1, cosElongation))));
}

export interface HilalObservation {
  date: PlainDate;
  latitudeDeg: number;
  longitudeDeg: number;
  conjunctionTime: Instant;
  sunsetTime: Instant;
  moonsetTime: Instant | null;
  moonAltitudeDeg: number;
  sunAltitudeDeg: number;
  elongationDeg: number;
  moonAgeHours: number;
  illuminationFraction: number;
  lagTimeMinutes: number | null;
  crescentWidthArcmin: number;
}

/**
 * All raw numbers needed to evaluate hilal visibility criteria at sunset on the
 * given (Gregorian) evening. Throws when there is no sunset that day rather
 * than returning a placeholder (CLAUDE.md: no silent fallback values).
 */
export function computeHilalObservation(
  date: PlainDate,
  latDeg: number,
  lonDeg: number,
): HilalObservation {
  const sunset = findHorizonCrossing(
    date,
    latDeg,
    lonDeg,
    sunRaDec,
    HORIZON_ALTITUDE_DEG,
    false,
  );
  if (sunset === null) {
    throw new Error(`no sunset found for ${date.year}-${date.month}-${date.day} at (${latDeg}, ${lonDeg})`);
  }

  const moonset = findHorizonCrossing(
    date,
    latDeg,
    lonDeg,
    moonRaDec,
    HORIZON_ALTITUDE_DEG,
    false,
  );

  const conjunction = previousConjunction(sunset);

  const [sunRa, sunDec] = sunRaDec(sunset);
  const moon = lunarPosition(sunset);
  const [moonRa, moonDec] = moonRaDec(sunset);

  const jd = julianDay(sunset);
  const moonAltitude = altitudeDeg(moonRa, moonDec, latDeg, lonDeg, jd);
  const sunAltitude = altitudeDeg(sunRa, sunDec, latDeg, lonDeg, jd);

  const elongation = elongationDeg(sunRa, sunDec, moonRa, moonDec);

  const moonAgeHours = (sunset - conjunction) / HOUR_US;

  const sunLon = solarPosition(sunset).apparentLongitudeDeg;
  const illumination = illuminatedFraction(sunLon, moon);

  const lagTimeMinutes = moonset === null ? null : (moonset - sunset) / MINUTE_US;

  const moonSemidiameterArcmin = 358473400.0 / moon.distanceKm / 60.0;
  const crescentWidth = moonSemidiameterArcmin * (1 - Math.cos(radians(elongation)));

  return {
    date,
    latitudeDeg: latDeg,
    longitudeDeg: lonDeg,
    conjunctionTime: conjunction,
    sunsetTime: sunset,
    moonsetTime: moonset,
    moonAltitudeDeg: moonAltitude,
    sunAltitudeDeg: sunAltitude,
    elongationDeg: elongation,
    moonAgeHours,
    illuminationFraction: illumination,
    lagTimeMinutes,
    crescentWidthArcmin: crescentWidth,
  };
}

export interface TrajectoryPoint {
  time: Instant;
  minutesFromSunset: number;
  moonAltitudeDeg: number;
  sunAltitudeDeg: number;
  elongationDeg: number;
}

/**
 * Moon/Sun altitude and elongation sampled every `stepMinutes` across a window
 * centred on sunset - lets the UI plot how conditions evolve around the moment
 * of interest rather than showing only the single-instant sunset numbers.
 */
export function hilalTrajectory(
  date: PlainDate,
  latDeg: number,
  lonDeg: number,
  windowMinutes = 30,
  stepMinutes = 5,
): TrajectoryPoint[] {
  const sunset = findHorizonCrossing(
    date,
    latDeg,
    lonDeg,
    sunRaDec,
    HORIZON_ALTITUDE_DEG,
    false,
  );
  if (sunset === null) {
    throw new Error(`no sunset found for ${date.year}-${date.month}-${date.day} at (${latDeg}, ${lonDeg})`);
  }

  const points: TrajectoryPoint[] = [];
  for (let offset = -windowMinutes; offset <= windowMinutes + 1e-9; offset += stepMinutes) {
    const t = sunset + quantizeToMicrosecond(offset * MINUTE_US);
    const [sunRa, sunDec] = sunRaDec(t);
    const [moonRa, moonDec] = moonRaDec(t);
    const jd = julianDay(t);
    points.push({
      time: t,
      minutesFromSunset: offset,
      moonAltitudeDeg: altitudeDeg(moonRa, moonDec, latDeg, lonDeg, jd),
      sunAltitudeDeg: altitudeDeg(sunRa, sunDec, latDeg, lonDeg, jd),
      elongationDeg: elongationDeg(sunRa, sunDec, moonRa, moonDec),
    });
  }

  return points;
}

/**
 * Wujudul hilal: the hilal is deemed "present" if, on the day of the 29th,
 * (1) conjunction has already occurred before sunset, and (2) the Moon sets
 * after the Sun (positive lag time) - regardless of whether the crescent would
 * actually be visible to an observer.
 */
export function wujudulHilal(
  moonset: Instant | null,
  sunset: Instant,
  conjunctionTime: Instant,
): boolean {
  if (moonset === null) return false;
  return conjunctionTime < sunset && moonset > sunset;
}

/**
 * MABIMS 2021 imkanur rukyat (neo-MABIMS): visible if the Moon's altitude is at
 * least 3 degrees AND elongation is at least 6.4 degrees. Both comparisons are
 * inclusive - a value sitting exactly on the threshold passes.
 */
export function mabims2021(altitudeDegrees: number, elongationDegrees: number): boolean {
  return altitudeDegrees >= 3.0 && elongationDegrees >= 6.4;
}

export type OdehVerdict = "visible" | "visible_optical_aid" | "marginal" | "not_visible";

/**
 * Odeh (2004), classifying visibility on a continuous scale rather than a bare
 * boolean. ARCV (topocentric arc of vision) is taken here as the Moon's
 * altitude above the horizon at the moment of sunset - a documented
 * simplification of Yallop/Odeh's "best time" (Sun at roughly -4.5 deg), which
 * would require re-evaluating altitude/elongation slightly later.
 */
export function odehCriterion(
  altitudeDegrees: number,
  _elongationDegrees: number,
  crescentWidthArcmin: number | null = null,
): OdehVerdict {
  const arcv = altitudeDegrees + 0.8333;
  const w = crescentWidthArcmin === null ? 0 : crescentWidthArcmin;

  const v = arcv - (-0.1018 * w ** 3 + 0.7319 * w ** 2 - 6.3226 * w + 7.1651);

  if (v >= 5.65) return "visible";
  if (v >= 2.0) return "visible_optical_aid";
  if (v >= -0.96) return "marginal";
  return "not_visible";
}

export type HilalMethod = "wujudul_hilal" | "mabims_2021" | "odeh";

export interface HilalCriteria {
  wujudul_hilal: boolean;
  mabims_2021: boolean;
  odeh: OdehVerdict;
}

/** All three criteria evaluated against one observation. */
export function evaluateCriteria(observation: HilalObservation): HilalCriteria {
  return {
    wujudul_hilal: wujudulHilal(
      observation.moonsetTime,
      observation.sunsetTime,
      observation.conjunctionTime,
    ),
    mabims_2021: mabims2021(observation.moonAltitudeDeg, observation.elongationDeg),
    odeh: odehCriterion(
      observation.moonAltitudeDeg,
      observation.elongationDeg,
      observation.crescentWidthArcmin,
    ),
  };
}
