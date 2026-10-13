/**
 * Angka di Balik Hilal: one city's deciding evening, criterion by criterion -
 * how far each verdict sat from its threshold, and where that distance is
 * smaller than the engine's own tolerance, that the calculation cannot decide.
 */
import { ENGINE_TOLERANCE } from "../../falak/tolerance";
import { MABIMS_MIN_ALTITUDE_DEG, MABIMS_MIN_ELONGATION_DEG, odehVValue, type HilalMethod } from "../../falak/visibility";
import { hijriMonthName } from "../../hijriNames";
import { assembleDeck, plain, type CardDeck, type SlideSpec } from "../deck";
import { fmtClock, fmtDate, fmtDeg, fmtMinutes, fmtNum } from "../format";
import type { CityOutlook } from "../inputs";
import { ENGINE_ERROR_TEXT, INDETERMINATE_TEXT, NEUTRAL_CRITERIA_ORDER, criterionAttribution } from "../rules";
import { FALAK_URL, criterionName, take, verdictFor, zoneOf } from "./common";

export interface AngkaDiBalikHilalInput {
  row: CityOutlook;
  handle?: string;
}

export function buildAngkaDiBalikHilal(input: AngkaDiBalikHilalInput): CardDeck {
  const blocking: string[] = [];
  const name = input.row.city.name;
  const tz = take(input.row.timeZone, `Zona waktu ${name}`, blocking);
  const outlook = take(input.row.outlook, `Hisab ${name}`, blocking);
  const o = outlook?.deciding ?? null;
  const criteria = outlook?.decidingCriteria ?? null;

  if (!outlook || !o || !criteria || !tz) {
    return assembleDeck({
      series: "angka-di-balik-hilal",
      title: "angka-di-balik-hilal",
      caption: `Angka di balik hilal di ${name}: ${ENGINE_ERROR_TEXT}.`,
      slides: [
        { type: "cover", kicker: "ANGKA DI BALIK HILAL", headline: `${name}: hisab ${ENGINE_ERROR_TEXT}` },
        { type: "end", headline: "Cek lagi di Falak", body: [FALAK_URL] },
      ],
      blocking: blocking.length ? blocking : [`Hisab ${name}: ${ENGINE_ERROR_TEXT}`],
      handle: input.handle,
    });
  }

  const label = `${hijriMonthName(outlook.hijriMonth)} ${outlook.hijriYear} H`;
  const zone = zoneOf(tz);
  const verdicts = Object.fromEntries(NEUTRAL_CRITERIA_ORDER.map((m) => [m, verdictFor(m, o, criteria)])) as Record<
    HilalMethod,
    ReturnType<typeof verdictFor>
  >;

  const tolDeg = fmtDeg(ENGINE_TOLERANCE.altitudeDeg, 2);
  const tolLag = fmtMinutes(ENGINE_TOLERANCE.lagMinutes, 1);

  const cardFor = (m: HilalMethod): SlideSpec => {
    const v = verdicts[m];
    const margin = v.margin.margin;
    const body: string[] = [];
    if (m === "mabims_2021") {
      body.push(`Syarat: tinggi minimal ${fmtDeg(MABIMS_MIN_ALTITUDE_DEG, 0)} dan elongasi minimal ${fmtDeg(MABIMS_MIN_ELONGATION_DEG, 1)}.`);
      body.push(`Petang ini: tinggi ${fmtDeg(o.moonAltitudeDeg, 2)}, elongasi ${fmtDeg(o.elongationDeg, 2)}.`);
      const which = v.margin.binding.startsWith("altitude") ? "batas tinggi" : "batas elongasi";
      if (margin !== null) body.push(`Paling mepet: ${which}, ${margin >= 0 ? "lebih" : "kurang"} ${fmtDeg(Math.abs(margin), 2)}.`);
    } else if (m === "wujudul_hilal") {
      body.push("Syarat: ijtimak sebelum matahari terbenam, dan bulan terbenam sesudah matahari.");
      if (o.conjunctionTime >= o.sunsetTime) body.push("Petang ini ijtimak terjadi sesudah matahari terbenam.");
      else if (o.lagTimeMinutes === null || o.moonsetTime === null) body.push("Petang ini bulan tidak terbenam di jendela hitungan.");
      else {
        body.push(`Matahari terbenam ${fmtClock(o.sunsetTime, tz)} ${zone}, bulan ${fmtClock(o.moonsetTime, tz)} ${zone}.`);
        body.push(`Bulan terbenam ${fmtMinutes(Math.abs(o.lagTimeMinutes), 1)} ${o.lagTimeMinutes >= 0 ? "sesudah" : "sebelum"} matahari.`);
      }
    } else {
      body.push("Syarat: nilai-v dari busur pandang dan lebar sabit, empat tingkat.");
      body.push(`Petang ini nilai-v ${fmtNum(odehVValue(o.moonAltitudeDeg, o.crescentWidthArcmin), 2)}.`);
      if (margin !== null) body.push(`Selisih ke batas tingkat terdekat: ${fmtNum(Math.abs(margin), 2)}.`);
    }
    if (v.indeterminate && margin !== null) {
      const tol = v.margin.unit === "deg" ? tolDeg : tolLag;
      const m2 = v.margin.unit === "deg" ? fmtDeg(Math.abs(margin), 2) : fmtMinutes(Math.abs(margin), 1);
      body.push(`Selisih ${m2} masih di dalam toleransi mesin ±${tol}: ${INDETERMINATE_TEXT}.`);
    }
    body.push(criterionAttribution(m) + ".");
    return { type: "card", headline: criterionName(m), body, verdict: { label: v.stamp, tone: v.tone } };
  };

  const indeterminate = NEUTRAL_CRITERIA_ORDER.filter((m) => verdicts[m].indeterminate);
  const slides: SlideSpec[] = [
    {
      type: "cover",
      kicker: `ANGKA DI BALIK HILAL · ${label.toUpperCase()}`,
      headline: `${name}, | petang ${fmtDate(o.date)}`,
      subtitle: indeterminate.length
        ? `Ada kriteria yang ${INDETERMINATE_TEXT}.`
        : "Seberapa jauh dari ambang tiap kriteria?",
    },
    {
      type: "card",
      headline: "Yang diukur saat matahari terbenam",
      body: [
        `Matahari terbenam ${fmtClock(o.sunsetTime, tz)} ${zone}.`,
        `Tinggi bulan ${fmtDeg(o.moonAltitudeDeg, 2)} · elongasi ${fmtDeg(o.elongationDeg, 2)}.`,
        o.lagTimeMinutes === null ? "Bulan tidak terbenam di jendela hitungan." : `Lag ${fmtMinutes(o.lagTimeMinutes, 1)}.`,
      ],
    },
    ...NEUTRAL_CRITERIA_ORDER.map(cardFor),
    {
      type: "card",
      headline: "Margin dan toleransi",
      body: [
        `Toleransi mesin: tinggi dan elongasi ±${tolDeg}, lag ±${tolLag}, ijtimak ±${fmtMinutes(ENGINE_TOLERANCE.conjunctionMinutes, 0)}.`,
        `Selisih yang lebih kecil dari toleransi tidak kami putuskan: ${INDETERMINATE_TEXT}.`,
        "Elongasi dihitung geosentris; pembacaan toposentris memberi angka sedikit berbeda.",
      ],
    },
    { type: "end", headline: "Cek kotamu di Falak", body: [FALAK_URL, "Buka Awal Bulan, lalu Lihat perhitungan."] },
  ];

  const caption = indeterminate.length
    ? `${name}, petang ${fmtDate(o.date)}: ${indeterminate.map(criterionName).join(" dan ")} ${INDETERMINATE_TEXT}. Ini angkanya. Sumber: hitungan Falak. #hilal #hisab #falak`
    : `${name}, petang ${fmtDate(o.date)}: seberapa jauh hilal dari ambang tiap kriteria. Sumber: hitungan Falak. #hilal #hisab #falak`;

  return assembleDeck({
    series: "angka-di-balik-hilal",
    title: `angka-di-balik-hilal-${plain(name).toLowerCase().replace(/\s+/g, "-")}-${outlook.hijriYear}-${plain(hijriMonthName(outlook.hijriMonth)).toLowerCase()}`,
    caption,
    slides,
    blocking,
    handle: input.handle,
  });
}

