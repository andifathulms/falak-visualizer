/**
 * The engine calls behind card decks - the only impure part of lib/cards.
 * Builders (series/*.ts) take what these return and never compute a number
 * of their own, so a deck can only ever show engine output.
 *
 * Every per-city computation is captured as Computed<T>: an engine error
 * becomes a value the builder must render as "tidak dapat dihitung", never a
 * placeholder (CLAUDE.md: no silent fallback values).
 */
import { dailyPrayerTimes, KEMENAG_RI, type DailyPrayerTimes } from "../falak/prayerTimes";
import { qiblaDirection, rashdulQiblaEvents, type QiblaResult, type RashdulQiblaEvent } from "../falak/qibla";
import { addDays, type PlainDate } from "../falak/time";
import type { CityLocation } from "../locations";
import { monthOutlook, type MonthOutlook } from "../monthOutlook";
import { computeSkyNow, type BodyPosition } from "../skyNow";
import { resolveTimeZone } from "../timezone";

export type Computed<T> = { ok: true; value: T } | { ok: false; error: string };

export function compute<T>(fn: () => T): Computed<T> {
  try {
    return { ok: true, value: fn() };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export interface CityRef {
  city: CityLocation;
  /** IANA zone; resolving it is part of the computation, so a failure is an error, not a default. */
  timeZone: Computed<string>;
}

export function cityRef(city: CityLocation): CityRef {
  return {
    city,
    timeZone: compute(() => {
      const zone = resolveTimeZone(city.lat, city.lon);
      if (zone === null) throw new Error(`no time zone for ${city.name}`);
      return zone;
    }),
  };
}

export interface CityOutlook extends CityRef {
  outlook: Computed<MonthOutlook>;
}

/** Every criterion's month start and the deciding evening, per city. */
export function outlooksFor(hijriYear: number, hijriMonth: number, cities: readonly CityLocation[]): CityOutlook[] {
  return cities.map((city) => ({
    ...cityRef(city),
    outlook: compute(() => {
      const o = monthOutlook(hijriYear, hijriMonth, city.lat, city.lon);
      if (o.errors.deciding) throw new Error(o.errors.deciding);
      return o;
    }),
  }));
}

export interface RashdulRow extends CityRef {
  /** The Sun at the event instant, seen from this city - below the horizon means the moment is unusable there. */
  sun: Computed<BodyPosition>;
}

export function rashdulEventsFor(year: number): Computed<RashdulQiblaEvent[]> {
  return compute(() => rashdulQiblaEvents(year));
}

export function rashdulRows(event: RashdulQiblaEvent, cities: readonly CityLocation[]): RashdulRow[] {
  return cities.map((city) => ({
    ...cityRef(city),
    sun: compute(() => computeSkyNow(event.utcTime, city.lat, city.lon).sun),
  }));
}

export interface QiblaRow extends CityRef {
  qibla: Computed<QiblaResult>;
}

export function qiblaRows(cities: readonly CityLocation[]): QiblaRow[] {
  return cities.map((city) => ({ ...cityRef(city), qibla: compute(() => qiblaDirection(city.lat, city.lon)) }));
}

export interface PrayerYearRow extends CityRef {
  /** Kemenag RI times for `days` consecutive days. */
  days: Computed<DailyPrayerTimes[]>;
}

export function prayerYearRows(cities: readonly CityLocation[], first: PlainDate, days = 365): PrayerYearRow[] {
  return cities.map((city) => ({
    ...cityRef(city),
    days: compute(() =>
      Array.from({ length: days }, (_, i) => dailyPrayerTimes(addDays(first, i), city.lat, city.lon, KEMENAG_RI)),
    ),
  }));
}
