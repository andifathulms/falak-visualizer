/**
 * The Hijri date of every day in a run of consecutive Gregorian days, for
 * calendar grids and monthly tables: one engine conversion for the first day,
 * then a roll-over at each MABIMS 2021 month start. Returns null for the run
 * if the engine cannot resolve it (out of ephemeris range) - never a guess.
 */
import { gregorianToHijri, monthStartDate } from "./falak/converter";
import { addDays, daysBetween, type PlainDate } from "./falak/time";

export interface HijriDay {
  year: number;
  month: number;
  day: number;
}

export function hijriDaysFor(first: PlainDate, count: number, lat: number, lon: number): HijriDay[] | null {
  try {
    const h = gregorianToHijri(first, lat, lon);
    let [y, m, d] = [h.year, h.month, h.day];
    let next = monthStartDate(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, lat, lon);
    const out: HijriDay[] = [];
    for (let i = 0; i < count; i += 1) {
      const day = addDays(first, i);
      if (i > 0) {
        if (daysBetween(next, day) >= 0) {
          [y, m, d] = m === 12 ? [y + 1, 1, 1] : [y, m + 1, 1];
          next = monthStartDate(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, lat, lon);
        } else {
          d += 1;
        }
      }
      out.push({ year: y, month: m, day: d });
    }
    return out;
  } catch {
    return null;
  }
}
