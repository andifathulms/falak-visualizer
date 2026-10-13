/**
 * Petang Penentu: the deciding evening of one Hijri month - the ijtimak, the
 * Moon's altitude/elongation/lag at sunset in each city, every criterion's
 * verdict side by side, and what each criterion's hisab gives for day 1.
 *
 * It never says when the month starts. It says what each criterion's hisab
 * gives at named coordinates, and that sidang isbat decides.
 */
import { comparePlainDates, type PlainDate } from "../../falak/time";
import { hijriMonthName } from "../../hijriNames";
import type { MonthOutlook } from "../../monthOutlook";
import { assembleDeck, pagedTables, plain, type CardDeck, type SlideSpec } from "../deck";
import { fmtClock, fmtCoordinates, fmtDate, fmtDeg, fmtMinutes, fmtWeekdayDate, localDateOf } from "../format";
import type { CityOutlook } from "../inputs";
import { CRITERION_CARD_SOURCE, CRITERION_SHORT, ENGINE_ERROR_TEXT, KHGT_NOTE, NEUTRAL_CRITERIA_ORDER } from "../rules";
import { FALAK_URL, criterionName, take, verdictFor } from "./common";

export interface PetangPenentuInput {
  rows: readonly CityOutlook[];
  /** City (by name) whose coordinates the day-1 sentence is computed at. Defaults to the first row. */
  referenceCity?: string;
  handle?: string;
}

const ZONES: ReadonlyArray<[string, string]> = [
  ["Asia/Jakarta", "WIB"],
  ["Asia/Makassar", "WITA"],
  ["Asia/Jayapura", "WIT"],
];

interface Resolved {
  name: string;
  row: CityOutlook;
  outlook: MonthOutlook | null;
}

export function buildPetangPenentu(input: PetangPenentuInput): CardDeck {
  const blocking: string[] = [];
  const resolved: Resolved[] = input.rows.map((row) => ({
    name: row.city.name,
    row,
    outlook: take(row.outlook, `Hisab ${row.city.name}`, blocking),
  }));

  const first = resolved.find((r) => r.outlook !== null)?.outlook ?? null;
  if (!first) {
    return assembleDeck({
      series: "petang-penentu",
      title: "petang-penentu",
      caption: "Petang penentu: hisab tidak dapat dihitung.",
      slides: [
        { type: "cover", kicker: "PETANG PENENTU", headline: `Hisab ${ENGINE_ERROR_TEXT}` },
        { type: "end", headline: "Cek lagi di Falak", body: [FALAK_URL] },
      ],
      blocking: blocking.length ? blocking : [`Hisab ${ENGINE_ERROR_TEXT}`],
      handle: input.handle,
    });
  }

  const month = hijriMonthName(first.hijriMonth);
  const label = `${month} ${first.hijriYear} H`;
  const conjunction = first.conjunction;
  const deciding = first.deciding!;

  // --- ijtimak and the deciding evening(s) ------------------------------
  const ijtimakLines = ZONES.map(([tz, abbr]) => `${fmtWeekdayDate(localDateOf(conjunction, tz))}, ${fmtClock(conjunction, tz)} ${abbr}`);
  const evenings = new Map<string, { date: PlainDate; cities: string[] }>();
  for (const r of resolved) {
    if (!r.outlook?.deciding) continue;
    const d = r.outlook.deciding.date;
    const key = fmtDate(d);
    const entry = evenings.get(key) ?? { date: d, cities: [] };
    entry.cities.push(r.name);
    evenings.set(key, entry);
  }
  const eveningList = Array.from(evenings.values()).sort((a, b) => comparePlainDates(a.date, b.date));
  const main = eveningList.reduce((a, b) => (b.cities.length > a.cities.length ? b : a), eveningList[0]);
  const eveningLines = [`Petang penentu: ${fmtWeekdayDate(main.date)}.`];
  for (const e of eveningList) {
    if (e !== main) eveningLines.push(`Di ${e.cities.join(", ")} petang penentunya ${fmtWeekdayDate(e.date)}.`);
  }

  // --- the Moon at sunset ----------------------------------------------
  const moonRows = resolved.map((r) => {
    const o = r.outlook?.deciding;
    if (!o) return [r.name, ENGINE_ERROR_TEXT, "—", "—"];
    return [
      r.name,
      fmtDeg(o.moonAltitudeDeg, 2),
      fmtDeg(o.elongationDeg, 2),
      o.lagTimeMinutes === null ? "tanpa terbenam" : fmtMinutes(o.lagTimeMinutes, 1),
    ];
  });

  // --- criteria side by side, neutral order ------------------------------
  const verdictRows = resolved.map((r) => {
    const o = r.outlook;
    if (!o?.deciding || !o.decidingCriteria) return [r.name, ...NEUTRAL_CRITERIA_ORDER.map(() => ENGINE_ERROR_TEXT)];
    return [r.name, ...NEUTRAL_CRITERIA_ORDER.map((m) => verdictFor(m, o.deciding!, o.decidingCriteria!).short)];
  });
  const anyIndeterminate = resolved.some(
    (r) => r.outlook?.deciding && r.outlook.decidingCriteria &&
      NEUTRAL_CRITERIA_ORDER.some((m) => verdictFor(m, r.outlook!.deciding!, r.outlook!.decidingCriteria!).indeterminate),
  );

  // --- day 1, per criterion, at named coordinates -------------------------
  const ref = resolved.find((r) => r.name === input.referenceCity && r.outlook) ?? resolved.find((r) => r.outlook)!;
  const startLines = NEUTRAL_CRITERIA_ORDER.map((m) => {
    const start = ref.outlook!.starts[m];
    if (!start) blocking.push(`Hari pertama ${criterionName(m)} di ${ref.name}: ${ENGINE_ERROR_TEXT}`);
    return `Menurut hisab kriteria ${criterionName(m)} di koordinat ${ref.name}: ${start ? fmtWeekdayDate(start) : ENGINE_ERROR_TEXT}.`;
  });

  // --- who uses what -----------------------------------------------------
  const sourceLines = NEUTRAL_CRITERIA_ORDER.map((m) => `${criterionName(m)}: ${CRITERION_CARD_SOURCE[m]}.`);

  const slides: SlideSpec[] = [
    {
      type: "cover",
      kicker: `PETANG PENENTU · ${label.toUpperCase()}`,
      headline: `Hilal ${label} | petang ${fmtDate(deciding.date)}`,
      subtitle: "Angka hisab per kota, tiga kriteria berdampingan.",
    },
    { type: "card", headline: "Ijtimak", body: [...ijtimakLines, "Saat bulan dan matahari sejajar bujur ekliptika. Hilal dinilai saat matahari terbenam sesudahnya.", ...eveningLines] },
    ...pagedTables("Bulan saat matahari terbenam", ["Kota", "Tinggi", "Elongasi", "Lag"], moonRows,
      "Tinggi toposentris, elongasi geosentris. Lag: bulan terbenam sesudah matahari."),
    ...pagedTables("Tiga kriteria, kota per kota", ["Kota", ...NEUTRAL_CRITERIA_ORDER.map((m) => CRITERION_SHORT[m])], verdictRows,
      `Kolom urut abjad, bukan peringkat: ${NEUTRAL_CRITERIA_ORDER.map(criterionName).join(", ")}.${anyIndeterminate ? " Tipis: di dalam toleransi mesin." : ""}`),
    { type: "card", headline: `Hari pertama | ${ref.name}, ${fmtCoordinates(ref.row.city.lat, ref.row.city.lon)}`, body: startLines },
    { type: "card", headline: "Siapa memakai apa", body: sourceLines },
    { type: "end", headline: "Cek kotamu di Falak", body: [FALAK_URL, "Kotamu belum ada? Tulis di komentar."] },
  ];

  return assembleDeck({
    series: "petang-penentu",
    title: `petang-penentu-${plain(month).toLowerCase()}-${first.hijriYear}`,
    caption: `Hilal ${label}: tinggi, elongasi dan tiga kriteria hisab per kota, petang ${fmtDate(deciding.date)}. Sumber: hitungan Falak (algoritma Meeus, dicek terhadap efemeris JPL DE440). #hilal #hisab #falak`,
    slides,
    blocking,
    handle: input.handle,
    disclaimerNotes: [KHGT_NOTE],
  });
}
