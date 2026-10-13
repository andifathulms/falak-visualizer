/**
 * Kiblat Sore Ini (Rashdul Qibla per city) and Kiblat Kotamu (bearings).
 * Neither is a month-start deck, so neither carries the hisab disclaimer.
 */
import { KAABA_LATITUDE_DEG, type RashdulQiblaEvent } from "../../falak/qibla";
import { assembleDeck, pagedTables, type CardDeck, type SlideSpec } from "../deck";
import { fmtClock, fmtDate, fmtDeg, fmtKm, fmtWeekdayDate, localDateOf } from "../format";
import type { QiblaRow, RashdulRow } from "../inputs";
import { ENGINE_ERROR_TEXT } from "../rules";
import { FALAK_URL, take, zoneOf } from "./common";

/** What a Rashdul row says where the Sun is below the horizon - the moment is unusable there. */
export const SUN_DOWN_TEXT = "matahari sudah terbenam";

export interface KiblatSoreIniInput {
  event: RashdulQiblaEvent;
  rows: readonly RashdulRow[];
  handle?: string;
}

export function buildKiblatSoreIni(input: KiblatSoreIniInput): CardDeck {
  const blocking: string[] = [];
  const { event } = input;
  const wib = "Asia/Jakarta";
  const day = localDateOf(event.utcTime, wib);

  const sunDown: string[] = [];
  const rows = input.rows.map((r) => {
    const name = r.city.name;
    const tz = take(r.timeZone, `Zona waktu ${name}`, blocking);
    const sun = take(r.sun, `Posisi matahari ${name}`, blocking);
    const qibla = take(r.qibla, `Arah kiblat ${name}`, blocking);
    if (!tz || !sun || !qibla) return [name, ENGINE_ERROR_TEXT, ENGINE_ERROR_TEXT];
    if (sun.altitudeDeg <= 0) {
      sunDown.push(name);
      return [name, SUN_DOWN_TEXT, fmtDeg(qibla.bearingDeg, 2)];
    }
    return [name, `${fmtClock(event.utcTime, tz)} ${zoneOf(tz)}`, fmtDeg(qibla.bearingDeg, 2)];
  });

  const slides: SlideSpec[] = [
    {
      type: "cover",
      kicker: "KIBLAT SORE INI",
      headline: "Bayangan tiang | menunjuk kiblat",
      subtitle: `${fmtWeekdayDate(day)}: matahari tepat di atas Ka'bah.`,
    },
    ...pagedTables("Jam cek bayangan", ["Kota", "Jam", "Arah kiblat"], rows,
      sunDown.length ? `${sunDown.join(", ")}: ${SUN_DOWN_TEXT}, momen ini tidak bisa dipakai di sana.` : "Arah kiblat dalam derajat dari utara sejati."),
    {
      type: "card",
      headline: "Cara cek",
      body: [
        "Tegakkan tiang lurus di tanah datar yang kena matahari.",
        "Pada jam di tabel, bayangannya menunjuk tepat membelakangi kiblat.",
        "Arah kiblat: dari ujung bayangan ke pangkal tiang.",
      ],
    },
    {
      type: "card",
      headline: "Kenapa bisa begitu",
      body: [
        `Hari itu deklinasi matahari sama dengan lintang Ka'bah, ${fmtDeg(KAABA_LATITUDE_DEG, 2)} LU.`,
        "Pada jam itu matahari melintasi meridian Makkah, jadi berdiri tepat di atas Ka'bah.",
        "Langit harus cerah dan matahari terlihat dari tempatmu.",
      ],
    },
    { type: "end", headline: "#BayanganKiblat", body: ["Foto bayangan tiang di kotamu, lalu bandingkan dengan sajadahmu.", FALAK_URL] },
  ];

  const firstUsable = input.rows.find((r) => r.timeZone.ok && r.sun.ok && r.sun.value.altitudeDeg > 0 && r.timeZone.value === wib);
  const clock = firstUsable ? ` pukul ${fmtClock(event.utcTime, wib)} WIB` : "";
  return assembleDeck({
    series: "kiblat-sore-ini",
    title: `kiblat-sore-ini-${fmtDate(day).toLowerCase().replace(/\s+/g, "-")}`,
    caption: `Rashdul Kiblat ${fmtDate(day)}${clock}: bayangan tiang menunjuk membelakangi kiblat. Cek jam di kotamu. Sumber: hitungan Falak. #kiblat #rashdulkiblat #BayanganKiblat`,
    slides,
    blocking,
    handle: input.handle,
  });
}

export interface KiblatKotamuInput {
  rows: readonly QiblaRow[];
  handle?: string;
}

export function buildKiblatKotamu(input: KiblatKotamuInput): CardDeck {
  const blocking: string[] = [];
  const rows = input.rows.map((r) => {
    const q = take(r.qibla, `Arah kiblat ${r.city.name}`, blocking);
    return q ? [r.city.name, fmtDeg(q.bearingDeg, 2), fmtKm(q.distanceKm)] : [r.city.name, ENGINE_ERROR_TEXT, ENGINE_ERROR_TEXT];
  });

  const slides: SlideSpec[] = [
    { type: "cover", kicker: "KIBLAT KOTAMU", headline: "Kiblat dari kotamu | bukan tepat ke barat", subtitle: "Arah dan jarak ke Ka'bah, dihitung dari koordinat kota." },
    ...pagedTables("Arah dan jarak ke Ka'bah", ["Kota", "Arah", "Jarak"], rows, "Derajat dari utara sejati, searah jarum jam."),
    {
      type: "card",
      headline: "Membaca angkanya",
      body: [
        "Semua arah di tabel lebih besar dari arah barat tepat, jadi kiblat dari Indonesia condong ke barat laut.",
        "Jarak diukur di permukaan bumi, lewat lintasan terpendek.",
      ],
    },
    {
      type: "card",
      headline: "Catatan",
      body: [
        "Kompas ponsel menunjuk utara magnetik, bukan utara sejati; Falak tidak menghitung selisihnya.",
        "Bumi dihitung sebagai bola. Untuk cek tanpa kompas, tunggu Rashdul Kiblat.",
      ],
    },
    { type: "end", headline: "Cek kiblat kotamu di Falak", body: [FALAK_URL, "Kotamu belum ada? Tulis di komentar."] },
  ];

  return assembleDeck({
    series: "kiblat-kotamu",
    title: "kiblat-kotamu",
    caption: "Arah kiblat dari kotamu, dalam derajat dari utara sejati, plus jaraknya ke Ka'bah. Sumber: hitungan Falak. #kiblat #falak",
    slides,
    blocking,
    handle: input.handle,
  });
}
