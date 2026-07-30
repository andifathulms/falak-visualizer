/**
 * Port of backend/falak/astronomy/timescale.py.
 *
 * Time-scale utilities shared by solar.ts and lunar.ts, which express every
 * position algorithm in Julian centuries of Dynamical Time since J2000.0
 * (Meeus, *Astronomical Algorithms*, 2nd ed., Ch. 7 and 10).
 *
 * As in the Python original, TD is approximated as UTC - Delta T is ~70s in the
 * modern era, negligible at the day-resolution this product needs - with
 * `deltaTSeconds` exposed so a caller needing sub-minute precision applies the
 * correction explicitly rather than having it silently ignored.
 */
import {
  civilFromInstant,
  instantFromCivil,
  roundHalfEven,
  type Instant,
} from "./time";

export const J2000 = 2451545.0;

/** Julian Day Number for a UTC instant. */
export function julianDay(instant: Instant): number {
  const c = civilFromInstant(instant);

  let year = c.year;
  let month = c.month;
  const day =
    c.day + c.hour / 24 + c.minute / 1440 + (c.second + c.microsecond / 1e6) / 86400;

  if (month <= 2) {
    year -= 1;
    month += 12;
  }

  const a = Math.floor(year / 100);
  const b = 2 - a + Math.floor(a / 4); // Gregorian calendar correction (Meeus 7.1)

  return (
    Math.floor(365.25 * (year + 4716)) +
    Math.floor(30.6001 * (month + 1)) +
    day +
    b -
    1524.5
  );
}

/** Julian centuries (T) since J2000.0, per Meeus eq. 25.1 / 22.1. */
export function julianCenturies(jd: number): number {
  return (jd - J2000) / 36525.0;
}

/** Inverse of julianDay: JD -> UTC instant (Meeus Ch. 7). */
export function instantFromJulianDay(jd: number): Instant {
  const shifted = jd + 0.5;
  const z = Math.floor(shifted);
  const f = shifted - z;

  let a: number;
  if (z < 2299161) {
    a = z;
  } else {
    const alpha = Math.floor((z - 1867216.25) / 36524.25);
    a = z + 1 + alpha - Math.floor(alpha / 4);
  }

  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);

  const dayFraction = b - d - Math.floor(30.6001 * e) + f;
  const day = Math.floor(dayFraction);
  const fraction = dayFraction - day;

  const month = e < 14 ? e - 1 : e - 13;
  const year = month > 2 ? c - 4716 : c - 4715;

  // Python rounds to whole seconds here, discarding sub-second precision; the
  // rounding is half-to-even, hence roundHalfEven rather than Math.round.
  const totalSeconds = roundHalfEven(fraction * 86400);
  const hour = Math.floor(totalSeconds / 3600);
  const remainder = totalSeconds - hour * 3600;
  const minute = Math.floor(remainder / 60);
  const second = remainder - minute * 60;

  // A fraction that rounds up to a full 86400 would make Python raise on
  // hour=24; instantFromCivil rolls over into the next day instead. That can
  // only ever shift a result by under a second, and never silently substitutes
  // a value the way a clamp would.
  return instantFromCivil(year, month, day, hour, minute, second);
}

/**
 * Approximate Delta T (TD - UT) in seconds, per the Espenak & Meeus (2006)
 * polynomial fit. Good to a few seconds over 1900-2100, the practically
 * relevant range for this product.
 */
export function deltaTSeconds(year: number): number {
  if (year >= 2005 && year <= 2050) {
    const t = year - 2005;
    return 62.92 + 0.32217 * t + 0.005589 * t * t;
  }
  if (year >= 1986 && year < 2005) {
    const t = year - 2000;
    return (
      63.86 +
      0.3345 * t -
      0.060374 * t ** 2 +
      0.0017275 * t ** 3 +
      0.000651814 * t ** 4 +
      0.00002373599 * t ** 5
    );
  }
  if (year >= 1961 && year < 1986) {
    const t = year - 1975;
    return 45.45 + 1.067 * t - t ** 2 / 260 - t ** 3 / 718;
  }
  // Outside the tightly-fit ranges: the long-term parabola. Explicitly a rough
  // estimate - callers needing sub-minute accuracy far from the present should
  // not rely on it.
  const u = (year - 1820) / 100;
  return -20 + 32 * u * u;
}
