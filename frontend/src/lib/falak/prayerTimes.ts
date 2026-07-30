/**
 * Port of backend/falak/astronomy/prayer_times.py.
 *
 * Daily prayer times from solar position: fajr/isya (configurable depression
 * angle), dhuhr (solar transit + correction), asr (shadow-length method),
 * maghrib (sunset), plus sunrise. All refraction-corrected the same way solar
 * rise/set is in horizon.ts (-0.8333 deg apparent altitude).
 */
import { apparentSiderealTimeDeg, findHorizonCrossing } from "./horizon";
import { solarPosition } from "./solar";
import { julianDay } from "./timescale";
import {
  degrees,
  HOUR_US,
  MINUTE_US,
  mod,
  quantizeToMicrosecond,
  SECOND_US,
  radians,
  startOfDay,
  wrap180,
  type Instant,
  type PlainDate,
} from "./time";

function sunRaDec(instant: Instant): [number, number] {
  const p = solarPosition(instant);
  return [p.apparentRightAscensionDeg, p.apparentDeclinationDeg];
}

export interface PrayerConvention {
  name: string;
  fajrAngleDeg: number;
  ishaAngleDeg: number;
  /** 1 = Shafi'i/Kemenag RI default, 2 = Hanafi. */
  asrShadowFactor: number;
  dhuhrCorrectionMinutes: number;
}

export const KEMENAG_RI: PrayerConvention = {
  name: "Kemenag RI",
  fajrAngleDeg: 20.0,
  ishaAngleDeg: 18.0,
  asrShadowFactor: 1.0,
  dhuhrCorrectionMinutes: 2.0,
};

export const MWL: PrayerConvention = {
  name: "Muslim World League",
  fajrAngleDeg: 18.0,
  ishaAngleDeg: 17.0,
  asrShadowFactor: 1.0,
  dhuhrCorrectionMinutes: 2.0,
};

export const ISNA: PrayerConvention = {
  name: "ISNA",
  fajrAngleDeg: 15.0,
  ishaAngleDeg: 15.0,
  asrShadowFactor: 1.0,
  dhuhrCorrectionMinutes: 2.0,
};

export const CONVENTIONS: Record<string, PrayerConvention> = {
  [KEMENAG_RI.name]: KEMENAG_RI,
  [MWL.name]: MWL,
  [ISNA.name]: ISNA,
};

/**
 * Local solar noon (the Dhuhr instant before the convention correction): the UTC
 * time the Sun's hour angle is zero, found by bisecting the wrapped LST - RA
 * difference around an initial UTC-noon-minus-longitude guess.
 */
export function solarTransit(date: PlainDate, lonEastDeg: number): Instant {
  const guess = startOfDay(date) + 12 * HOUR_US - quantizeToMicrosecond((lonEastDeg / 15) * HOUR_US);

  const f = (instant: Instant): number => {
    const [ra] = sunRaDec(instant);
    const lst = mod(apparentSiderealTimeDeg(julianDay(instant)) + lonEastDeg, 360);
    return wrap180(lst - ra);
  };

  let lo = guess - HOUR_US;
  let hi = guess + HOUR_US;
  let fLo = f(lo);
  let fHi = f(hi);
  if (fLo > 0 === fHi > 0) {
    lo = guess - 6 * HOUR_US;
    hi = guess + 6 * HOUR_US;
    fLo = f(lo);
    fHi = f(hi);
  }

  while ((hi - lo) / SECOND_US > 1.0) {
    const mid = lo + quantizeToMicrosecond((hi - lo) / 2);
    const fMid = f(mid);
    if (fMid > 0 === fLo > 0) {
      lo = mid;
      fLo = fMid;
    } else {
      hi = mid;
    }
  }

  return lo + quantizeToMicrosecond((hi - lo) / 2);
}

function asrTargetAltitudeDeg(
  instant: Instant,
  latDeg: number,
  shadowFactor: number,
): number {
  const [, dec] = sunRaDec(instant);
  const phiMinusDec = Math.abs(latDeg - dec);
  return degrees(Math.atan(1.0 / (shadowFactor + Math.tan(radians(phiMinusDec)))));
}

export interface DailyPrayerTimes {
  date: PlainDate;
  latitudeDeg: number;
  longitudeDeg: number;
  convention: string;
  fajr: Instant | null;
  sunrise: Instant | null;
  dhuhr: Instant;
  asr: Instant | null;
  maghrib: Instant | null;
  isha: Instant | null;
}

export function dailyPrayerTimes(
  date: PlainDate,
  latDeg: number,
  lonDeg: number,
  convention: PrayerConvention = KEMENAG_RI,
): DailyPrayerTimes {
  const dhuhr =
    solarTransit(date, lonDeg) +
    quantizeToMicrosecond(convention.dhuhrCorrectionMinutes * MINUTE_US);

  const sunrise = findHorizonCrossing(date, latDeg, lonDeg, sunRaDec, -0.8333, true);
  const maghrib = findHorizonCrossing(date, latDeg, lonDeg, sunRaDec, -0.8333, false);
  const fajr = findHorizonCrossing(
    date,
    latDeg,
    lonDeg,
    sunRaDec,
    -convention.fajrAngleDeg,
    true,
  );
  const isha = findHorizonCrossing(
    date,
    latDeg,
    lonDeg,
    sunRaDec,
    -convention.ishaAngleDeg,
    false,
  );

  const asrTarget = asrTargetAltitudeDeg(dhuhr, latDeg, convention.asrShadowFactor);
  const asr = findHorizonCrossing(date, latDeg, lonDeg, sunRaDec, asrTarget, false);

  return {
    date,
    latitudeDeg: latDeg,
    longitudeDeg: lonDeg,
    convention: convention.name,
    fajr,
    sunrise,
    dhuhr,
    asr,
    maghrib,
    isha,
  };
}
