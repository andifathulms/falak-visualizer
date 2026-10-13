/**
 * Number, time and date formatting for card decks - Indonesian conventions
 * (decimal comma, thousands dot, "18.17" clock), at most two decimals.
 *
 * Every number a deck shows passes through here, so the conformance test
 * (lib/cards/__tests__) can format engine output the same way and check that
 * nothing in a deck was typed rather than computed.
 */
import type { Instant, PlainDate } from "../falak/time";

const formatters = new Map<number, Intl.NumberFormat>();

function formatter(decimals: number): Intl.NumberFormat {
  let f = formatters.get(decimals);
  if (!f) {
    f = new Intl.NumberFormat("id-ID", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    formatters.set(decimals, f);
  }
  return f;
}

/** `decimals` is clamped to 0-2: a card never claims more precision than that. */
export function fmtNum(value: number, decimals = 2): string {
  const d = Math.max(0, Math.min(2, Math.trunc(decimals)));
  return formatter(d).format(value);
}

export function fmtDeg(value: number, decimals = 2): string {
  return `${fmtNum(value, decimals)}°`;
}

export function fmtMinutes(value: number, decimals = 1): string {
  return `${fmtNum(value, decimals)} mnt`;
}

export function fmtKm(value: number): string {
  return `${fmtNum(value, 0)} km`;
}

/** An engine instant (µs since epoch, UTC) as a local clock, e.g. "18.17". */
export function fmtClock(instant: Instant, timeZone: string): string {
  return new Date(instant / 1000).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone });
}

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
] as const;
const MONTHS_ID_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"] as const;
const WEEKDAYS_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"] as const;

export function fmtDate(date: PlainDate): string {
  return `${date.day} ${MONTHS_ID[date.month - 1]} ${date.year}`;
}

export function fmtDateShort(date: PlainDate): string {
  return `${date.day} ${MONTHS_ID_SHORT[date.month - 1]}`;
}

export function fmtWeekdayDate(date: PlainDate): string {
  const weekday = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
  return `${WEEKDAYS_ID[weekday]}, ${fmtDate(date)}`;
}

/** The calendar day an instant falls on in `timeZone`. */
export function localDateOf(instant: Instant, timeZone: string): PlainDate {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date(instant / 1000))
    .split("-")
    .map(Number);
  return { year: parts[0], month: parts[1], day: parts[2] };
}

/** "6,2° LS, 106,82° BT" - the coordinates a month-start result was computed at. */
export function fmtCoordinates(lat: number, lon: number): string {
  const ns = lat < 0 ? "LS" : "LU";
  const ew = lon < 0 ? "BB" : "BT";
  return `${fmtDeg(Math.abs(lat), 2)} ${ns}, ${fmtDeg(Math.abs(lon), 2)} ${ew}`;
}
