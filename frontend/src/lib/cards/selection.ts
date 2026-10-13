/**
 * What the /kartu page lets you pick, and how a pick becomes a deck: the
 * engine runs (inputs.ts), then a pure builder (series/*.ts) writes the text.
 */
import { gregorianToHijri } from "../falak/converter";
import { parsePlainDate, type PlainDate } from "../falak/time";
import { hijriMonthName } from "../hijriNames";
import { INDONESIAN_CITIES, type CityLocation } from "../locations";
import { nextHijriMonth } from "../monthOutlook";
import type { CardDeck, Series } from "./deck";
import { fmtWeekdayDate, localDateOf } from "./format";
import { outlooksFor, prayerYearRows, qiblaRows, rashdulEventsFor, rashdulRows } from "./inputs";
import { buildAngkaDiBalikHilal } from "./series/angkaDiBalikHilal";
import { buildJamLangit } from "./series/jamLangit";
import { DEFAULT_KAMUS_WORDS, buildKamusFalak } from "./series/kamusFalak";
import { buildKiblatKotamu, buildKiblatSoreIni } from "./series/kiblat";
import { buildPetangPenentu } from "./series/petangPenentu";

/** The ten cities the account rotates through (docs/RECON_CARDS.md §3), west to east. */
export const RECON_CITY_NAMES = [
  "Banda Aceh", "Medan", "Jakarta", "Bandung", "Surabaya", "Denpasar", "Balikpapan", "Samarinda", "Makassar", "Jayapura",
] as const;
export const TEN_CITIES = "__sepuluh__";

export const SERIES: ReadonlyArray<{ key: Series; label: string; hint: string; cities: "ten-or-one" | "one" | "none" }> = [
  { key: "petang-penentu", label: "Petang Penentu", hint: "Petang penentu satu bulan hijriah: angka per kota dan tiga kriteria berdampingan.", cities: "ten-or-one" },
  { key: "angka-di-balik-hilal", label: "Angka di Balik Hilal", hint: "Satu kota: seberapa jauh dari ambang tiap kriteria, dan kapan terlalu tipis untuk diputuskan.", cities: "one" },
  { key: "kiblat-sore-ini", label: "Kiblat Sore Ini", hint: "Rashdul Kiblat: jam bayangan tiang menunjuk kiblat di tiap kota.", cities: "ten-or-one" },
  { key: "kiblat-kotamu", label: "Kiblat Kotamu", hint: "Arah dan jarak kiblat per kota.", cities: "ten-or-one" },
  { key: "jam-langit", label: "Jam Langit", hint: "Jam salat paling awal dan paling akhir dalam setahun.", cities: "ten-or-one" },
  { key: "kamus-falak", label: "Kamus Falak", hint: "Istilah falak, satu kata per slide.", cities: "none" },
];

export interface Selection {
  series: Series;
  /** "1448-9" */
  hijriMonth: string;
  /** City name, or TEN_CITIES. */
  city: string;
  /** Rashdul event, by its UTC instant (µs) as a string. */
  rashdul: string;
  words: string[];
  handle: string;
}

export function citiesFor(city: string): CityLocation[] {
  const names: readonly string[] = city === TEN_CITIES ? RECON_CITY_NAMES : [city];
  return names.map((n) => {
    const c = INDONESIAN_CITIES.find((x) => x.name === n);
    if (!c) throw new Error(`unknown city: ${n}`);
    return c;
  });
}

export interface Option {
  value: string;
  label: string;
}

/** The current Hijri month (at Jakarta, MABIMS) and the twelve after it. */
export function hijriMonthOptions(today: PlainDate): Option[] {
  const jakarta = INDONESIAN_CITIES.find((c) => c.name === "Jakarta")!;
  const now = gregorianToHijri(today, jakarta.lat, jakarta.lon);
  const out: Option[] = [];
  let [y, m] = [now.year, now.month];
  for (let i = 0; i < 13; i += 1) {
    [y, m] = nextHijriMonth(y, m);
    out.push({ value: `${y}-${m}`, label: `${hijriMonthName(m)} ${y} H` });
  }
  return out;
}

/** Rashdul Qibla moments from now on, this year and next. */
export function rashdulOptions(nowUs: number, year: number): Option[] {
  const out: Option[] = [];
  for (const y of [year, year + 1]) {
    const events = rashdulEventsFor(y);
    if (!events.ok) continue;
    for (const e of events.value) {
      if (e.utcTime < nowUs) continue;
      out.push({ value: String(e.utcTime), label: fmtWeekdayDate(localDateOf(e.utcTime, "Asia/Jakarta")) });
    }
  }
  return out;
}

export function defaultSelection(today: PlainDate, nowUs: number): Selection {
  return {
    series: "petang-penentu",
    hijriMonth: hijriMonthOptions(today)[0].value,
    city: TEN_CITIES,
    rashdul: rashdulOptions(nowUs, today.year)[0]?.value ?? "",
    words: [...DEFAULT_KAMUS_WORDS],
    handle: "",
  };
}

/** Run the engine for a selection and build its deck. Throws only on a malformed selection. */
export function buildSelection(sel: Selection, today: PlainDate): CardDeck {
  const handle = sel.handle.trim() || undefined;
  switch (sel.series) {
    case "petang-penentu": {
      const [y, m] = sel.hijriMonth.split("-").map(Number);
      const cities = citiesFor(sel.city);
      return buildPetangPenentu({ rows: outlooksFor(y, m, cities), referenceCity: cities.some((c) => c.name === "Jakarta") ? "Jakarta" : cities[0].name, handle });
    }
    case "angka-di-balik-hilal": {
      const [y, m] = sel.hijriMonth.split("-").map(Number);
      const city = sel.city === TEN_CITIES ? "Jakarta" : sel.city;
      return buildAngkaDiBalikHilal({ row: outlooksFor(y, m, citiesFor(city))[0], handle });
    }
    case "kiblat-sore-ini": {
      const year = today.year;
      const events = [rashdulEventsFor(year), rashdulEventsFor(year + 1)].flatMap((r) => (r.ok ? r.value : []));
      const event = events.find((e) => String(e.utcTime) === sel.rashdul);
      if (!event) throw new Error("pilih tanggal Rashdul Kiblat");
      return buildKiblatSoreIni({ event, rows: rashdulRows(event, citiesFor(sel.city)), handle });
    }
    case "kiblat-kotamu":
      return buildKiblatKotamu({ rows: qiblaRows(citiesFor(sel.city)), handle });
    case "jam-langit":
      return buildJamLangit({ rows: prayerYearRows(citiesFor(sel.city), today, 365), handle });
    case "kamus-falak":
      return buildKamusFalak({ words: sel.words, handle });
  }
}

export function todayPlainDate(iso: string): PlainDate {
  return parsePlainDate(iso);
}
