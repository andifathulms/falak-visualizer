/**
 * Port of backend/falak/astronomy/solar.py.
 *
 * Apparent geocentric solar position, per Meeus, *Astronomical Algorithms*,
 * 2nd ed., Ch. 25 (lower-precision method, accurate to about 0.01 degree in
 * longitude - well within the tolerance needed for hilal visibility, prayer
 * time and qibla-adjacent solar calculations).
 */
import { julianCenturies, julianDay } from "./timescale";
import { DEG, normDegrees, type Instant } from "./time";

/** L0, degrees (Meeus eq. 25.2). */
export function geometricMeanLongitude(t: number): number {
  return normDegrees(280.46646 + 36000.76983 * t + 0.0003032 * t * t);
}

/** M, degrees (Meeus eq. 25.3). */
export function meanAnomaly(t: number): number {
  return normDegrees(357.52911 + 35999.05029 * t - 0.0001537 * t * t);
}

/** Eccentricity of Earth's orbit, e (Meeus eq. 25.4). */
export function eccentricity(t: number): number {
  return 0.016708634 - 0.000042037 * t - 0.0000001267 * t * t;
}

/** C, degrees (Meeus, Ch. 25). */
export function equationOfCenter(t: number, mDeg: number): number {
  const m = mDeg * DEG;
  return (
    (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(m) +
    (0.019993 - 0.000101 * t) * Math.sin(2 * m) +
    0.000289 * Math.sin(3 * m)
  );
}

/** Mean obliquity of the ecliptic, epsilon0, degrees (Meeus eq. 22.2). */
export function obliquityOfEcliptic(t: number): number {
  const seconds = 21.448 - 46.815 * t - 0.00059 * t * t + 0.001813 * t * t * t;
  return 23 + 26 / 60 + seconds / 3600;
}

export interface SolarPosition {
  jd: number;
  t: number;
  geometricMeanLongitudeDeg: number;
  meanAnomalyDeg: number;
  trueAnomalyDeg: number;
  trueLongitudeDeg: number;
  apparentLongitudeDeg: number;
  radiusVectorAu: number;
  apparentRightAscensionDeg: number;
  apparentDeclinationDeg: number;
  apparentObliquityDeg: number;
}

/** Apparent geocentric solar position for a UTC instant. */
export function solarPosition(instant: Instant): SolarPosition {
  const jd = julianDay(instant);
  const t = julianCenturies(jd);

  const l0 = geometricMeanLongitude(t);
  const m = meanAnomaly(t);
  const e = eccentricity(t);
  const c = equationOfCenter(t, m);

  const trueLongitude = l0 + c;
  const trueAnomaly = m + c;

  const radiusVector = (1.000001018 * (1 - e * e)) / (1 + e * Math.cos(trueAnomaly * DEG));

  const omega = normDegrees(125.04 - 1934.136 * t);
  const apparentLongitude = trueLongitude - 0.00569 - 0.00478 * Math.sin(omega * DEG);

  const epsilon0 = obliquityOfEcliptic(t);
  const epsilonCorrected = epsilon0 + 0.00256 * Math.cos(omega * DEG);

  const lam = apparentLongitude * DEG;
  const eps = epsilonCorrected * DEG;

  const alpha = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam));
  const delta = Math.asin(Math.sin(eps) * Math.sin(lam));

  return {
    jd,
    t,
    geometricMeanLongitudeDeg: l0,
    meanAnomalyDeg: m,
    trueAnomalyDeg: normDegrees(trueAnomaly),
    trueLongitudeDeg: normDegrees(trueLongitude),
    apparentLongitudeDeg: normDegrees(apparentLongitude),
    radiusVectorAu: radiusVector,
    apparentRightAscensionDeg: normDegrees(alpha / DEG),
    apparentDeclinationDeg: delta / DEG,
    apparentObliquityDeg: epsilonCorrected,
  };
}

/**
 * Equation of time E, in minutes (Meeus Ch. 28), using the low-precision
 * variant Meeus gives as acceptable to ~0.1 minute for this purpose: the
 * nutation-in-longitude term is dropped, since its contribution is sub-second
 * relative to the arcminute tolerances this product targets.
 */
export function equationOfTimeMinutes(instant: Instant): number {
  const position = solarPosition(instant);
  let diff = normDegrees(position.geometricMeanLongitudeDeg - position.apparentRightAscensionDeg);
  if (diff > 180) diff -= 360;
  return diff * 4; // 1 degree = 4 minutes of time
}
