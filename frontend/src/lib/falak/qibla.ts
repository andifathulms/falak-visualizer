/**
 * Port of backend/falak/astronomy/qibla.py.
 *
 * Qibla direction: great-circle initial bearing and distance to the Kaaba, plus
 * the two Rashdul Qibla instants each year.
 */
import { solarPosition } from "./solar";
import {
  DAY_US,
  degrees,
  instantFromCivil,
  mod,
  quantizeToMicrosecond,
  SECOND_US,
  radians,
  type Instant,
} from "./time";

export const KAABA_LATITUDE_DEG = 21.4225;
export const KAABA_LONGITUDE_DEG = 39.8262;

export const EARTH_MEAN_RADIUS_KM = 6371.0088;

export interface QiblaResult {
  /** Clockwise from true north, 0-360. */
  bearingDeg: number;
  distanceKm: number;
}

/**
 * Initial great-circle bearing from (latDeg, lonDeg) to the Kaaba, and the
 * great-circle distance, via the standard spherical bearing/haversine formulas.
 */
export function qiblaDirection(latDeg: number, lonDeg: number): QiblaResult {
  const lat1 = radians(latDeg);
  const lat2 = radians(KAABA_LATITUDE_DEG);
  const deltaLon = radians(KAABA_LONGITUDE_DEG - lonDeg);

  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  const bearing = mod(degrees(Math.atan2(y, x)), 360);

  const a =
    Math.sin((lat2 - lat1) / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  const centralAngle = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return { bearingDeg: bearing, distanceKm: EARTH_MEAN_RADIUS_KM * centralAngle };
}

function declinationDiff(instant: Instant): number {
  return solarPosition(instant).apparentDeclinationDeg - KAABA_LATITUDE_DEG;
}

export interface RashdulQiblaEvent {
  utcTime: Instant;
  /** "ascending" (~May) or "descending" (~July). */
  direction: "ascending" | "descending";
}

/**
 * "Rashdul Qibla" / Istiwa'ul A'zham: the two moments each year when the Sun is
 * directly overhead the Kaaba (solar declination == the Kaaba's latitude). At
 * that instant the Sun's azimuth, seen from anywhere it is above the horizon,
 * coincides with that location's great-circle bearing to the Kaaba - the same
 * spherical-triangle relation qiblaDirection() uses - so a plumb line's shadow
 * points exactly opposite the qibla.
 *
 * Found by daily sampling then bisecting on declination crossing the Kaaba's
 * latitude, mirroring the horizon-crossing bisection in horizon.ts.
 */
export function rashdulQiblaEvents(year: number, toleranceSeconds = 1.0): RashdulQiblaEvent[] {
  const start = instantFromCivil(year, 1, 1);
  const end = instantFromCivil(year + 1, 1, 1);

  const samples: Array<[Instant, number]> = [];
  for (let t = start; t <= end; t += DAY_US) {
    samples.push([t, declinationDiff(t)]);
  }

  const events: RashdulQiblaEvent[] = [];
  for (let i = 0; i + 1 < samples.length; i += 1) {
    const [t0, f0] = samples[i];
    const [t1, f1] = samples[i + 1];
    const crossesUp = f0 <= 0 && 0 < f1;
    const crossesDown = f0 > 0 && 0 >= f1;
    if (!crossesUp && !crossesDown) continue;

    let lo = t0;
    let fLo = f0;
    let hi = t1;
    while ((hi - lo) / SECOND_US > toleranceSeconds) {
      const mid = lo + quantizeToMicrosecond((hi - lo) / 2);
      const fMid = declinationDiff(mid);
      if (fMid > 0 === fLo > 0) {
        lo = mid;
        fLo = fMid;
      } else {
        hi = mid;
      }
    }

    events.push({
      utcTime: lo + quantizeToMicrosecond((hi - lo) / 2),
      direction: crossesUp ? "ascending" : "descending",
    });
  }

  return events;
}
