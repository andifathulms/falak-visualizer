/**
 * "Which prayer is next, and how long until it" - scheduling over the engine's
 * dailyPrayerTimes, including the step past Isya into tomorrow's Subuh. No
 * astronomy of its own.
 */
import { dailyPrayerTimes, KEMENAG_RI, type DailyPrayerTimes, type PrayerConvention } from "./falak/prayerTimes";
import { addDays, MINUTE_US, type Instant, type PlainDate } from "./falak/time";

export type PrayerKey = "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";

export const PRAYER_ORDER: readonly PrayerKey[] = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];

/** Kemenag's own spellings (jadwal imsakiyah). Terbit is a marker, not a prayer. */
export const PRAYER_LABEL: Record<PrayerKey, string> = {
  fajr: "Subuh",
  sunrise: "Terbit",
  dhuhr: "Zuhur",
  asr: "Asar",
  maghrib: "Magrib",
  isha: "Isya",
};

export interface NextPrayer {
  key: Exclude<PrayerKey, "sunrise">;
  instant: Instant;
  tomorrow: boolean;
}

export function nextPrayer(today: DailyPrayerTimes, tomorrow: DailyPrayerTimes | null, now: Instant): NextPrayer | null {
  for (const key of ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const) {
    const t = today[key];
    if (t !== null && t > now) return { key, instant: t, tomorrow: false };
  }
  if (tomorrow?.fajr) return { key: "fajr", instant: tomorrow.fajr, tomorrow: true };
  return null;
}

export function scheduleFor(date: PlainDate, lat: number, lon: number, convention: PrayerConvention = KEMENAG_RI) {
  return {
    today: dailyPrayerTimes(date, lat, lon, convention),
    tomorrow: dailyPrayerTimes(addDays(date, 1), lat, lon, convention),
  };
}

/** "1 j 12 mnt" / "18 mnt" / "kurang dari 1 mnt". */
export function formatCountdown(fromUs: Instant, toUs: Instant): string {
  const minutes = Math.floor((toUs - fromUs) / MINUTE_US);
  if (minutes < 1) return "kurang dari 1 mnt";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} j ${m} mnt` : `${m} mnt`;
}
