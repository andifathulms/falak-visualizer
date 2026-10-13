/**
 * Jam Langit: how far prayer times drift over a year - the earliest and
 * latest Subuh, Terbit, Maghrib and Isya, each with the first day it occurs.
 * Selection only: every time shown is one the engine produced for that day.
 */
import { KEMENAG_RI, type DailyPrayerTimes } from "../../falak/prayerTimes";
import type { Instant, PlainDate } from "../../falak/time";
import { assembleDeck, pagedTables, plain, type CardDeck, type SlideSpec } from "../deck";
import { fmtClock, fmtDate, fmtDateShort, fmtDeg, localDateOf } from "../format";
import type { PrayerYearRow } from "../inputs";
import { ENGINE_ERROR_TEXT } from "../rules";
import { FALAK_URL, take, zoneOf } from "./common";

type Key = "fajr" | "sunrise" | "maghrib" | "isha";
const LABEL: Record<Key, string> = { fajr: "Subuh", sunrise: "Terbit", maghrib: "Maghrib", isha: "Isya" };

interface Extreme {
  clock: string;
  date: PlainDate;
}

/** Earliest and latest local clock time of one prayer over the run, first occurrence of each. */
function extremes(days: readonly DailyPrayerTimes[], key: Key, tz: string): { min: Extreme; max: Extreme } | null {
  let min: Extreme | null = null;
  let max: Extreme | null = null;
  for (const d of days) {
    const t = d[key] as Instant | null;
    if (t === null) return null;
    const clock = fmtClock(t, tz);
    const date = localDateOf(t, tz);
    if (!min || clock < min.clock) min = { clock, date };
    if (!max || clock > max.clock) max = { clock, date };
  }
  return min && max ? { min, max } : null;
}

const cellOf = (e: Extreme) => `${e.clock} · ${fmtDateShort(e.date)}`;

export interface JamLangitInput {
  rows: readonly PrayerYearRow[];
  handle?: string;
}

export function buildJamLangit(input: JamLangitInput): CardDeck {
  const blocking: string[] = [];
  const resolved = input.rows.map((r) => ({
    name: r.city.name,
    tz: take(r.timeZone, `Zona waktu ${r.city.name}`, blocking),
    days: take(r.days, `Waktu salat ${r.city.name}`, blocking),
  }));
  const anyDays = resolved.find((r) => r.days && r.days.length)?.days ?? null;
  const range = anyDays ? `${fmtDate(anyDays[0].date)} sampai ${fmtDate(anyDays[anyDays.length - 1].date)}` : ENGINE_ERROR_TEXT;

  const missing = (what: string) => {
    blocking.push(`${what}: ${ENGINE_ERROR_TEXT}`);
    return [ENGINE_ERROR_TEXT, ENGINE_ERROR_TEXT];
  };

  let tables: SlideSpec[];
  let hero: string;
  if (resolved.length === 1) {
    const r = resolved[0];
    hero = r.name;
    const rows = (Object.keys(LABEL) as Key[]).map((k) => {
      const e = r.tz && r.days ? extremes(r.days, k, r.tz) : null;
      return [LABEL[k], ...(e ? [cellOf(e.min), cellOf(e.max)] : missing(`${LABEL[k]} ${r.name}`))];
    });
    tables = pagedTables(`Jam langit ${r.name} (${r.tz ? zoneOf(r.tz) : "—"})`, ["Waktu", "Paling awal", "Paling akhir"], rows,
      "Dibulatkan ke menit; tanggal = hari pertama jam itu muncul.");
  } else {
    hero = "kotamu";
    const perCity = (k: Key) =>
      resolved.map((r) => {
        const e = r.tz && r.days ? extremes(r.days, k, r.tz) : null;
        return [r.name, ...(e ? [cellOf(e.min), cellOf(e.max)] : missing(`${LABEL[k]} ${r.name}`))];
      });
    const note = "Waktu setempat (WIB/WITA/WIT), dibulatkan ke menit.";
    tables = [
      ...pagedTables("Maghrib sepanjang tahun", ["Kota", "Paling awal", "Paling akhir"], perCity("maghrib"), note),
      ...pagedTables("Subuh sepanjang tahun", ["Kota", "Paling awal", "Paling akhir"], perCity("fajr"), note),
    ];
  }

  const slides: SlideSpec[] = [
    { type: "cover", kicker: "JAM LANGIT", headline: `Jam salat ${hero} | ikut bergeser`, subtitle: `Paling awal dan paling akhir, ${range}.` },
    ...tables,
    {
      type: "card",
      headline: "Kenapa bergeser",
      body: [
        "Sumbu bumi miring dan orbitnya lonjong, jadi jam matahari terbenam dan terbit berubah sepanjang tahun.",
        "Kota di utara khatulistiwa dan di selatannya bergeser ke arah yang berlawanan.",
      ],
    },
    {
      type: "card",
      headline: "Konvensi",
      body: [
        `${KEMENAG_RI.name}: Subuh saat matahari ${fmtDeg(KEMENAG_RI.fajrAngleDeg, 0)} di bawah ufuk, Isya ${fmtDeg(KEMENAG_RI.ishaAngleDeg, 0)}.`,
        "Jadwal resmi Kemenag bisa berbeda satu-dua menit karena ihtiyat.",
      ],
    },
    { type: "end", headline: "Jadwal harian kotamu di Falak", body: [FALAK_URL, "Kotamu belum ada? Tulis di komentar."] },
  ];

  return assembleDeck({
    series: "jam-langit",
    title: `jam-langit-${plain(hero).toLowerCase().replace(/\s+/g, "-")}`,
    caption: `Jam salat ${hero} sepanjang tahun: paling awal dan paling akhir. Sumber: hitungan Falak, konvensi ${KEMENAG_RI.name}. #jadwalsalat #falak`,
    slides,
    blocking,
    handle: input.handle,
  });
}
