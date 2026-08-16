/**
 * Builds DayArc's input from the frozen engine - real sun-altitude samples
 * across the day, not an approximated curve shape.
 *
 * Every value here comes from an already-exported, already-validated
 * lib/falak function: solarPosition (solar.ts) + altitudeDeg (horizon.ts)
 * for the curve samples (the same pair hilalTrajectory in visibility.ts
 * already combines for a similar purpose, just applied across a full day
 * instead of an hour around sunset), and dailyPrayerTimes/
 * asrTargetAltitudeDeg (prayerTimes.ts) for the five prayer instants and
 * their defining angles. No new astronomy - this module only samples and
 * reshapes.
 */
import { altitudeDeg } from "./falak/horizon";
import { solarPosition } from "./falak/solar";
import { julianDay } from "./falak/timescale";
import { HOUR_US, MINUTE_US, type Instant, type PlainDate } from "./falak/time";
import {
  asrTargetAltitudeDeg,
  dailyPrayerTimes,
  type PrayerConvention,
} from "./falak/prayerTimes";
import type { DayArcInput, DayArcSample, PrayerInput } from "./dayArcGeometry";

function sunAltitudeAt(instant: Instant, latDeg: number, lonDeg: number): number {
  const p = solarPosition(instant);
  return altitudeDeg(p.apparentRightAscensionDeg, p.apparentDeclinationDeg, latDeg, lonDeg, julianDay(instant));
}

const SAMPLE_STEP = 6 * MINUTE_US;
/** Buffer around fajr/isha (or their fallback) so the curve visibly touches the horizon on both sides rather than clipping exactly at the first/last prayer marker. */
const DOMAIN_BUFFER = 40 * MINUTE_US;
/** Used only to bound the sampling window when fajr/isha can't be found (extreme latitudes) - never substituted as if it were a real prayer time. */
const FALLBACK_HALF_SPAN = 7 * HOUR_US;

/**
 * Found while building this component, not assumed: `dailyPrayerTimes`
 * (lib/falak/prayerTimes.ts, frozen) can return a fajr or isha instant on
 * the WRONG calendar day for some place/date combinations - confirmed
 * directly (Banda Aceh, 5.5483/95.3238, 2026-06-15, Kemenag RI: fajr comes
 * back as 2026-06-16T05:00 local, a full day after sunrise/dhuhr/asr/
 * maghrib/isha, which all land correctly on 2026-06-15). Traced to
 * `findHorizonCrossing`'s (lib/falak/horizon.ts) "closest to target local
 * hour" disambiguation: its 36-hour search window can contain two
 * same-direction crossings (today's and tomorrow's), and the `mod(_, 24)`
 * distance-to-target-hour comparison it picks between them doesn't
 * distinguish which calendar day either one is actually on - so on days
 * where the two candidates are nearly equidistant from the target hour, it
 * can pick the wrong one.
 *
 * This is a defect in already-shipped, already-live code (the current
 * /prayer-times page calls the same function) discovered as a side effect
 * of this migration step, not introduced by it. lib/falak/** is frozen for
 * this work - fixing the root cause means correcting the disambiguation
 * logic and regenerating the golden-vector suite through the backend
 * pipeline, out of scope here. Per CLAUDE.md's no-silent-fallback rule,
 * the responsible move is not to guess a correction, but to detect the
 * inconsistency and fail loudly: `assertSameCivilDay` throws rather than
 * letting DayArc render a chart built from a mis-dated instant, and the
 * caller (the real /langit page) surfaces that as an explicit error
 * rather than a wrong-looking drawing.
 */
function assertSameCivilDay(times: ReturnType<typeof dailyPrayerTimes>): void {
  const withinReasonableSpan = (label: string, instant: Instant | null, maxHoursFromDhuhr: number) => {
    if (instant === null) return;
    const hoursFromDhuhr = Math.abs(instant - times.dhuhr) / HOUR_US;
    if (hoursFromDhuhr > maxHoursFromDhuhr) {
      throw new Error(
        `dailyPrayerTimes returned ${label} ${hoursFromDhuhr.toFixed(1)}h from dhuhr - ` +
          `outside the +/-${maxHoursFromDhuhr}h a same-day prayer time should ever be. ` +
          `This is a known engine edge case (see dayArcData.ts), not a value this page can plot reliably.`,
      );
    }
  };
  withinReasonableSpan("fajr", times.fajr, 12);
  withinReasonableSpan("sunrise", times.sunrise, 12);
  withinReasonableSpan("asr", times.asr, 12);
  withinReasonableSpan("maghrib", times.maghrib, 12);
  withinReasonableSpan("isha", times.isha, 12);
  if (times.fajr !== null && times.sunrise !== null && times.fajr >= times.sunrise) {
    throw new Error("dailyPrayerTimes returned fajr at or after sunrise - not a valid same-day ordering.");
  }
  if (times.maghrib !== null && times.isha !== null && times.maghrib >= times.isha) {
    throw new Error("dailyPrayerTimes returned maghrib at or after isha - not a valid same-day ordering.");
  }
}

export function buildDayArcInput(
  date: PlainDate,
  latDeg: number,
  lonDeg: number,
  convention: PrayerConvention,
  /** From lib/falak/qibla.ts's qiblaDirection(latDeg, lonDeg).bearingDeg - a separate computation (bearing depends only on place, not date/convention), supplied by the caller rather than computed twice. */
  qiblaBearingDeg: number,
): DayArcInput {
  const times = dailyPrayerTimes(date, latDeg, lonDeg, convention);
  assertSameCivilDay(times);

  const domainStart = (times.fajr ?? times.sunrise ?? times.dhuhr - FALLBACK_HALF_SPAN) - DOMAIN_BUFFER;
  const domainEnd = (times.isha ?? times.maghrib ?? times.dhuhr + FALLBACK_HALF_SPAN) + DOMAIN_BUFFER;

  const samples: DayArcSample[] = [];
  for (let t = domainStart; t <= domainEnd; t += SAMPLE_STEP) {
    samples.push({ instant: t, altitudeDeg: sunAltitudeAt(t, latDeg, lonDeg) });
  }
  // Always include the exact end instant, not just the last full step, so
  // the curve reaches the true domain edge rather than stopping short by
  // up to one sample step.
  samples.push({ instant: domainEnd, altitudeDeg: sunAltitudeAt(domainEnd, latDeg, lonDeg) });

  const asrTarget = asrTargetAltitudeDeg(times.dhuhr, latDeg, convention.asrShadowFactor);
  const dhuhrAltitude = sunAltitudeAt(times.dhuhr, latDeg, lonDeg);

  const prayers: PrayerInput[] = [
    { key: "fajr", instant: times.fajr, definingAltitudeDeg: -convention.fajrAngleDeg },
    { key: "sunrise", instant: times.sunrise, definingAltitudeDeg: -0.8333 },
    { key: "dhuhr", instant: times.dhuhr, definingAltitudeDeg: dhuhrAltitude },
    { key: "asr", instant: times.asr, definingAltitudeDeg: asrTarget },
    { key: "maghrib", instant: times.maghrib, definingAltitudeDeg: -0.8333 },
    { key: "isha", instant: times.isha, definingAltitudeDeg: -convention.ishaAngleDeg },
  ];

  return { samples, prayers, qiblaBearingDeg };
}
