/**
 * Port of backend/falak/astronomy/lunar.py.
 *
 * Geocentric lunar position, per Meeus, *Astronomical Algorithms*, 2nd ed.,
 * Ch. 47 - the truncated ELP2000-82B series Meeus publishes (60 periodic terms
 * each for longitude/distance and for latitude).
 *
 * The 120 coefficients below were emitted mechanically from the Python tables
 * rather than retyped, and the golden-vector suite pins the resulting positions
 * against the Python engine, so a divergence in either table shows up as a test
 * failure rather than a quietly wrong crescent altitude.
 */
import { obliquityOfEcliptic } from "./solar";
import { julianCenturies, julianDay } from "./timescale";
import { DEG, normDegrees, type Instant } from "./time";

export const EARTH_EQUATORIAL_RADIUS_KM = 6378.14;

// Table 47.A: D, M, M', F, coeff_l (1e-6 deg), coeff_r (1e-3 km)
const TABLE_A: ReadonlyArray<readonly [number, number, number, number, number, number]> = [
  [0, 0, 1, 0, 6288774, -20905355],
  [2, 0, -1, 0, 1274027, -3699111],
  [2, 0, 0, 0, 658314, -2955968],
  [0, 0, 2, 0, 213618, -569925],
  [0, 1, 0, 0, -185116, 48888],
  [0, 0, 0, 2, -114332, -3149],
  [2, 0, -2, 0, 58793, 246158],
  [2, -1, -1, 0, 57066, -152138],
  [2, 0, 1, 0, 53322, -170733],
  [2, -1, 0, 0, 45758, -204586],
  [0, 1, -1, 0, -40923, -129620],
  [1, 0, 0, 0, -34720, 108743],
  [0, 1, 1, 0, -30383, 104755],
  [2, 0, 0, -2, 15327, 10321],
  [0, 0, 1, 2, -12528, 0],
  [0, 0, 1, -2, 10980, 79661],
  [4, 0, -1, 0, 10675, -34782],
  [0, 0, 3, 0, 10034, -23210],
  [4, 0, -2, 0, 8548, -21636],
  [2, 1, -1, 0, -7888, 24208],
  [2, 1, 0, 0, -6766, 30824],
  [1, 0, -1, 0, -5163, -8379],
  [1, 1, 0, 0, 4987, -16675],
  [2, -1, 1, 0, 4036, -12831],
  [2, 0, 2, 0, 3994, -10445],
  [4, 0, 0, 0, 3861, -11650],
  [2, 0, -3, 0, 3665, 14403],
  [0, 1, -2, 0, -2689, -7003],
  [2, 0, -1, 2, -2602, 0],
  [2, -1, -2, 0, 2390, 10056],
  [1, 0, 1, 0, -2348, 6322],
  [2, -2, 0, 0, 2236, -9884],
  [0, 1, 2, 0, -2120, 5751],
  [0, 2, 0, 0, -2069, 0],
  [2, -2, -1, 0, 2048, -4950],
  [2, 0, 1, -2, -1773, 4130],
  [2, 0, 0, 2, -1595, 0],
  [4, -1, -1, 0, 1215, -3958],
  [0, 0, 2, 2, -1110, 0],
  [3, 0, -1, 0, -892, 3258],
  [2, 1, 1, 0, -810, 2616],
  [4, -1, -2, 0, 759, -1897],
  [0, 2, -1, 0, -713, -2117],
  [2, 2, -1, 0, -700, 2354],
  [2, 1, -2, 0, 691, 0],
  [2, -1, 0, -2, 596, 0],
  [4, 0, 1, 0, 549, -1423],
  [0, 0, 4, 0, 537, -1117],
  [4, -1, 0, 0, 520, -1571],
  [1, 0, -2, 0, -487, -1739],
  [2, 1, 0, -2, -399, 0],
  [0, 0, 2, -2, -381, -4421],
  [1, 1, 1, 0, 351, 0],
  [3, 0, -2, 0, -340, 0],
  [4, 0, -3, 0, 330, 0],
  [2, -1, 2, 0, 327, 0],
  [0, 2, 1, 0, -323, 1165],
  [1, 1, -1, 0, 299, 0],
  [2, 0, 3, 0, 294, 0],
  [2, 0, -1, -2, 0, 8752],
];

// Table 47.B: D, M, M', F, coeff_b (1e-6 deg)
const TABLE_B: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [0, 0, 0, 1, 5128122],
  [0, 0, 1, 1, 280602],
  [0, 0, 1, -1, 277693],
  [2, 0, 0, -1, 173237],
  [2, 0, -1, 1, 55413],
  [2, 0, -1, -1, 46271],
  [2, 0, 0, 1, 32573],
  [0, 0, 2, 1, 17198],
  [2, 0, 1, -1, 9266],
  [0, 0, 2, -1, 8822],
  [2, -1, 0, -1, 8216],
  [2, 0, -2, -1, 4324],
  [2, 0, 1, 1, 4200],
  [2, 1, 0, -1, -3359],
  [2, -1, -1, 1, 2463],
  [2, -1, 0, 1, 2211],
  [2, -1, -1, -1, 2065],
  [0, 1, -1, -1, -1870],
  [4, 0, -1, -1, 1828],
  [0, 1, 0, 1, -1794],
  [0, 0, 0, 3, -1749],
  [0, 1, -1, 1, -1565],
  [1, 0, 0, 1, -1491],
  [0, 1, 1, 1, -1475],
  [0, 1, 1, -1, -1410],
  [0, 1, 0, -1, -1344],
  [1, 0, 0, -1, -1335],
  [0, 0, 3, 1, 1107],
  [4, 0, 0, -1, 1021],
  [4, 0, -1, 1, 833],
  [0, 0, 1, -3, 777],
  [4, 0, -2, 1, 671],
  [2, 0, 0, -3, 607],
  [2, 0, 2, -1, 596],
  [2, -1, 1, -1, 491],
  [2, 0, -2, 1, -451],
  [0, 0, 3, -1, 439],
  [2, 0, 2, 1, 422],
  [2, 0, -3, -1, 421],
  [2, 1, -1, 1, -366],
  [2, 1, 0, 1, -351],
  [4, 0, 0, 1, 331],
  [2, -1, 1, 1, 315],
  [2, -2, 0, -1, 302],
  [0, 0, 1, 3, -283],
  [2, 1, 1, -1, -229],
  [1, 1, 0, -1, 223],
  [1, 1, 0, 1, 223],
  [0, 1, -2, -1, -220],
  [2, 1, -1, -1, -220],
  [1, 0, 1, 1, -185],
  [2, -1, -2, -1, 181],
  [0, 1, 2, 1, -177],
  [4, 0, -2, -1, 176],
  [4, -1, -1, -1, 166],
  [1, 0, 1, -1, -164],
  [4, 0, 1, -1, 132],
  [1, 0, -1, -1, -119],
  [4, -1, 0, -1, 115],
  [2, -2, 0, 1, 107],
];

export function meanLongitude(t: number): number {
  return normDegrees(
    218.3164477 + 481267.88123421 * t - 0.0015786 * t ** 2 + t ** 3 / 538841 - t ** 4 / 65194000,
  );
}

export function meanElongation(t: number): number {
  return normDegrees(
    297.8501921 + 445267.1114034 * t - 0.0018819 * t ** 2 + t ** 3 / 545868 - t ** 4 / 113065000,
  );
}

export function sunMeanAnomaly(t: number): number {
  return normDegrees(357.5291092 + 35999.0502909 * t - 0.0001536 * t ** 2 + t ** 3 / 24490000);
}

export function moonMeanAnomaly(t: number): number {
  return normDegrees(
    134.9633964 + 477198.8675055 * t + 0.0087414 * t ** 2 + t ** 3 / 69699 - t ** 4 / 14712000,
  );
}

export function argumentOfLatitude(t: number): number {
  return normDegrees(
    93.272095 - 0.0036539 * t ** 2 + 483202.0175233 * t - t ** 3 / 3526000 + t ** 4 / 863310000,
  );
}

/** E, the correction factor applied when a term's |M| coefficient is nonzero. */
export function eccentricityCorrection(t: number): number {
  return 1 - 0.002516 * t - 0.0000074 * t * t;
}

export interface LunarPosition {
  jd: number;
  t: number;
  apparentLongitudeDeg: number;
  eclipticLatitudeDeg: number;
  distanceKm: number;
  horizontalParallaxDeg: number;
}

/** Geocentric ecliptic longitude/latitude and Earth-Moon distance. */
export function lunarPosition(instant: Instant): LunarPosition {
  const jd = julianDay(instant);
  const t = julianCenturies(jd);

  const lPrime = meanLongitude(t);
  const d = meanElongation(t);
  const m = sunMeanAnomaly(t);
  const mp = moonMeanAnomaly(t);
  const f = argumentOfLatitude(t);
  const e = eccentricityCorrection(t);

  const a1 = normDegrees(119.75 + 131.849 * t);
  const a2 = normDegrees(53.09 + 479264.29 * t);
  const a3 = normDegrees(313.45 + 481266.484 * t);

  let sigmaL = 0;
  let sigmaR = 0;
  for (const [dc, mc, mpc, fc, coeffL, coeffR] of TABLE_A) {
    const arg = (dc * d + mc * m + mpc * mp + fc * f) * DEG;
    const eFactor = e ** Math.abs(mc);
    sigmaL += coeffL * eFactor * Math.sin(arg);
    sigmaR += coeffR * eFactor * Math.cos(arg);
  }

  let sigmaB = 0;
  for (const [dc, mc, mpc, fc, coeffB] of TABLE_B) {
    const arg = (dc * d + mc * m + mpc * mp + fc * f) * DEG;
    const eFactor = e ** Math.abs(mc);
    sigmaB += coeffB * eFactor * Math.sin(arg);
  }

  sigmaL +=
    3958 * Math.sin(a1 * DEG) + 1962 * Math.sin((lPrime - f) * DEG) + 318 * Math.sin(a2 * DEG);
  sigmaB +=
    -2235 * Math.sin(lPrime * DEG) +
    382 * Math.sin(a3 * DEG) +
    175 * Math.sin((a1 - f) * DEG) +
    175 * Math.sin((a1 + f) * DEG) +
    127 * Math.sin((lPrime - mp) * DEG) -
    115 * Math.sin((lPrime + mp) * DEG);

  const longitude = normDegrees(lPrime + sigmaL / 1_000_000);
  const latitude = sigmaB / 1_000_000;
  const distanceKm = 385000.56 + sigmaR / 1000;

  return {
    jd,
    t,
    apparentLongitudeDeg: longitude,
    eclipticLatitudeDeg: latitude,
    distanceKm,
    horizontalParallaxDeg: Math.asin(EARTH_EQUATORIAL_RADIUS_KM / distanceKm) / DEG,
  };
}

/**
 * k, the illuminated fraction of the Moon's disk (Meeus Ch. 48, eq. 48.1/48.2),
 * using the geocentric elongation approximation - the small Earth-Sun-distance
 * correction is negligible at the precision this product needs.
 */
export function illuminatedFraction(
  sunApparentLongitudeDeg: number,
  moon: LunarPosition,
): number {
  const elongation = Math.acos(
    Math.cos(moon.eclipticLatitudeDeg * DEG) *
      Math.cos((moon.apparentLongitudeDeg - sunApparentLongitudeDeg) * DEG),
  );
  const phaseAngle = Math.PI - elongation;
  return (1 + Math.cos(phaseAngle)) / 2;
}

/** The Moon's obliquity-converted equatorial coordinates helper used by callers. */
export function lunarObliquityDeg(moon: LunarPosition): number {
  return obliquityOfEcliptic(moon.t);
}
