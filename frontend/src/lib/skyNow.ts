/**
 * Where the Sun and Moon are at one instant, for one place - the data behind
 * the live sky on Hari ini and the sun-shadow guidance on Kiblat.
 *
 * No new astronomy: every value is a composition of already-exported,
 * validated engine functions - sunRaDec/moonRaDec (visibility.ts), altitudeDeg
 * + topocentricAltitudeDeg + azimuthDeg (horizon.ts, azimuth cross-checked
 * against JPL DE440), lunarPosition/illuminatedFraction (lunar.ts) - the same
 * combination hilalTrajectory already uses around sunset.
 */
import { altitudeDeg, azimuthDeg, topocentricAltitudeDeg } from "./falak/horizon";
import { illuminatedFraction, lunarPosition } from "./falak/lunar";
import { solarPosition } from "./falak/solar";
import { julianDay } from "./falak/timescale";
import { moonRaDec, sunRaDec } from "./falak/visibility";
import type { Instant } from "./falak/time";

export interface BodyPosition {
  altitudeDeg: number;
  azimuthDeg: number;
}

export interface SkyNow {
  instant: Instant;
  sun: BodyPosition;
  moon: BodyPosition & {
    /** 0-1, Meeus eq. 48.1 via the engine. */
    illumination: number;
    /** Moon east of the Sun in longitude: growing towards full. */
    waxing: boolean;
    /** Moon minus Sun apparent longitude, 0-360 deg. */
    elongationLongitudeDeg: number;
  };
}

export function nowInstant(): Instant {
  return Math.round(Date.now()) * 1000;
}

export function computeSkyNow(instant: Instant, latDeg: number, lonDeg: number): SkyNow {
  const jd = julianDay(instant);
  const [sunRa, sunDec] = sunRaDec(instant);
  const [moonRa, moonDec] = moonRaDec(instant);
  const moon = lunarPosition(instant);
  const sunLon = solarPosition(instant).apparentLongitudeDeg;
  const elong = (((moon.apparentLongitudeDeg - sunLon) % 360) + 360) % 360;

  return {
    instant,
    sun: {
      altitudeDeg: altitudeDeg(sunRa, sunDec, latDeg, lonDeg, jd),
      azimuthDeg: azimuthDeg(sunRa, sunDec, latDeg, lonDeg, jd),
    },
    moon: {
      altitudeDeg: topocentricAltitudeDeg(altitudeDeg(moonRa, moonDec, latDeg, lonDeg, jd), moon.horizontalParallaxDeg),
      azimuthDeg: azimuthDeg(moonRa, moonDec, latDeg, lonDeg, jd),
      illumination: illuminatedFraction(sunLon, moon),
      waxing: elong < 180,
      elongationLongitudeDeg: elong,
    },
  };
}

/** Everyday Indonesian name for the Moon's phase, from its longitude elongation. */
export function moonPhaseName(elongationLongitudeDeg: number): string {
  const e = elongationLongitudeDeg;
  // Just past ijtimak the Moon is the hilal itself - the thinnest waxing
  // crescent - not "bulan mati", which is the old Moon just before it.
  if (e < 3 || e > 357) return "Ijtimak (bulan tak tampak)";
  if (e < 20) return "Hilal (sabit sangat muda)";
  if (e > 340) return "Bulan tua (menjelang ijtimak)";
  if (e < 80) return "Bulan sabit muda";
  if (e < 100) return "Separuh (kuartal awal)";
  if (e < 168) return "Bulan cembung awal";
  if (e < 192) return "Purnama";
  if (e < 260) return "Bulan cembung akhir";
  if (e < 280) return "Separuh (kuartal akhir)";
  return "Bulan sabit tua";
}

/** Eight-point Indonesian compass name for an azimuth. */
export function compassName(azimuthDeg: number): string {
  const names = ["utara", "timur laut", "timur", "tenggara", "selatan", "barat daya", "barat", "barat laut"];
  return names[Math.round((((azimuthDeg % 360) + 360) % 360) / 45) % 8];
}
