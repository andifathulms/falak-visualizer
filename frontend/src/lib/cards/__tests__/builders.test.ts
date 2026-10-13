import { beforeAll, describe, expect, it } from "vitest";
import { isBlocking, parseDeck, registerVariant } from "carousel-core/parse";
import { KEMENAG_RI } from "../../falak/prayerTimes";
import { KAABA_LATITUDE_DEG } from "../../falak/qibla";
import { parsePlainDate, type Instant } from "../../falak/time";
import { ENGINE_TOLERANCE, criterionMargin } from "../../falak/tolerance";
import { MABIMS_MIN_ALTITUDE_DEG, MABIMS_MIN_ELONGATION_DEG, odehVValue } from "../../falak/visibility";
import { INDONESIAN_CITIES } from "../../locations";
import { MONTH_OR_CRITERIA_SERIES, TABLE_MAX_ROWS, type CardDeck } from "../deck";
import { fmtClock, fmtNum, localDateOf } from "../format";
import { outlooksFor, prayerYearRows, qiblaRows, rashdulEventsFor, rashdulRows, type CityOutlook } from "../inputs";
import { HISAB_DISCLAIMER, INDETERMINATE_TEXT, NEUTRAL_CRITERIA_ORDER, ruleViolations } from "../rules";
import { buildAngkaDiBalikHilal } from "../series/angkaDiBalikHilal";
import { buildJamLangit } from "../series/jamLangit";
import { buildKamusFalak } from "../series/kamusFalak";
import { SUN_DOWN_TEXT, buildKiblatKotamu, buildKiblatSoreIni } from "../series/kiblat";
import { buildPetangPenentu } from "../series/petangPenentu";
import { falakMalam } from "../variant";
import { CRITERIA } from "../../criteria";

const TEN = ["Jakarta", "Surabaya", "Bandung", "Medan", "Makassar", "Balikpapan", "Samarinda", "Denpasar", "Jayapura", "Banda Aceh"]
  .map((n) => INDONESIAN_CITIES.find((c) => c.name === n)!);
const city = (n: string) => TEN.find((c) => c.name === n)!;
const ZONES = ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"];

// ---------------------------------------------------------------------------
// Engine output, computed once. These are the decks the account would post
// (docs/RECON_CARDS.md §3): Ramadan 1448's deciding evening, Rajab 1448 (the
// 0,04° MABIMS miss), Jumadilakhir 1448 (an indeterminate Wujudul Hilal), the
// 2027 Rashdul Qibla days, and the ten cities' qibla and prayer times.
// ---------------------------------------------------------------------------
const ramadan = outlooksFor(1448, 9, TEN);
const rajabJakarta = outlooksFor(1448, 7, [city("Jakarta")])[0];
const jumadilakhirJakarta = outlooksFor(1448, 6, [city("Jakarta")])[0];
const syawalJayapura = outlooksFor(1448, 10, [city("Jayapura")])[0];
const events = rashdulEventsFor(2027);
const may = events.ok ? events.value[0] : null;
const rashdul = may ? rashdulRows(may, TEN) : [];
const qibla = qiblaRows(TEN);
const prayerOne = prayerYearRows([city("Denpasar")], parsePlainDate("2026-10-13"), 120);
const prayerTen = prayerYearRows(TEN, parsePlainDate("2026-10-13"), 30);

type Built = { name: string; deck: CardDeck; sources: unknown[] };

function decks(): Built[] {
  return [
    { name: "petang-penentu", deck: buildPetangPenentu({ rows: ramadan, referenceCity: "Jakarta" }), sources: [ramadan] },
    { name: "angka (Rajab, Jakarta)", deck: buildAngkaDiBalikHilal({ row: rajabJakarta }), sources: [rajabJakarta] },
    { name: "angka (Jumadilakhir, Jakarta)", deck: buildAngkaDiBalikHilal({ row: jumadilakhirJakarta }), sources: [jumadilakhirJakarta] },
    { name: "angka (Syawal, Jayapura)", deck: buildAngkaDiBalikHilal({ row: syawalJayapura }), sources: [syawalJayapura] },
    { name: "kiblat-sore-ini", deck: buildKiblatSoreIni({ event: may!, rows: rashdul }), sources: [may, rashdul] },
    { name: "kiblat-kotamu", deck: buildKiblatKotamu({ rows: qibla }), sources: [qibla] },
    { name: "jam-langit (one city)", deck: buildJamLangit({ rows: prayerOne }), sources: [prayerOne] },
    { name: "jam-langit (ten cities)", deck: buildJamLangit({ rows: prayerTen }), sources: [prayerTen] },
    { name: "kamus-falak", deck: buildKamusFalak(), sources: [] },
  ];
}

// ---------------------------------------------------------------------------
// Number provenance: every numeric token in a deck must be a formatting of an
// engine number the builder was given (or derived by an engine function), or
// one of the named constants below.
// ---------------------------------------------------------------------------

/** Engine constants decks may quote. */
const CONSTANTS = [
  MABIMS_MIN_ALTITUDE_DEG,
  MABIMS_MIN_ELONGATION_DEG,
  ENGINE_TOLERANCE.altitudeDeg,
  ENGINE_TOLERANCE.lagMinutes,
  ENGINE_TOLERANCE.conjunctionMinutes,
  KAABA_LATITUDE_DEG,
  KEMENAG_RI.fajrAngleDeg,
  KEMENAG_RI.ishaAngleDeg,
];
/** Numbers inside proper names and citations: MABIMS 2021, Odeh 2004, JPL DE440, MABIMS in force since 2022 (citations.ts). */
const NAMED = ["2021", "2004", "440", "2022"];

function allowedTokens(sources: unknown[]): Set<string> {
  const out = new Set<string>(NAMED);
  const addNumber = (x: number) => {
    for (const v of [x, Math.abs(x)]) for (const d of [0, 1, 2]) out.add(fmtNum(v, d));
    if (Number.isInteger(x)) out.add(String(x));
  };
  const addInstant = (t: Instant) => {
    for (const tz of ZONES) {
      out.add(fmtClock(t, tz));
      const d = localDateOf(t, tz);
      [d.day, d.month, d.year].forEach(addNumber);
    }
  };
  const seen = new Set<unknown>();
  const walk = (v: unknown) => {
    if (typeof v === "number") {
      if (Math.abs(v) > 1e14) addInstant(v);
      else addNumber(v);
      return;
    }
    if (!v || typeof v !== "object" || seen.has(v)) return;
    seen.add(v);
    if (Array.isArray(v)) v.forEach(walk);
    else Object.values(v).forEach(walk);
    // Engine functions of an observation the builders also call.
    const o = v as { moonAltitudeDeg?: number; crescentWidthArcmin?: number; sunsetTime?: number };
    if (typeof o.moonAltitudeDeg === "number" && typeof o.sunsetTime === "number") {
      for (const m of NEUTRAL_CRITERIA_ORDER) walk(criterionMargin(v as never, m));
      addNumber(odehVValue(o.moonAltitudeDeg, o.crescentWidthArcmin ?? null));
    }
  };
  sources.forEach(walk);
  CONSTANTS.forEach(addNumber);
  return out;
}

function numericTokens(text: string): string[] {
  return (text.replace(/\(\d+\/\d+\)/g, "") /* table page markers "(1/2)" */
    .match(/\d+(?:[.,]\d+)*/g) ?? []);
}

beforeAll(() => {
  registerVariant(falakMalam, { replace: true });
});

describe("card decks", () => {
  it("computed their inputs without engine errors", () => {
    expect(events.ok && may).toBeTruthy();
    for (const r of [...ramadan, rajabJakarta, jumadilakhirJakarta, syawalJayapura]) expect(r.outlook.ok).toBe(true);
  });

  it.each(decks().map((b) => [b.name, b] as const))("%s: every number comes from the engine", (_, b) => {
    const allowed = allowedTokens(b.sources);
    const strays = numericTokens(b.deck.text).filter((t) => !allowed.has(t));
    expect(strays).toEqual([]);
  });

  it.each(decks().map((b) => [b.name, b] as const))("%s: obeys the house rules and the grammar", (_, b) => {
    const { text } = b.deck;
    expect(ruleViolations(text)).toEqual([]);
    expect(text).not.toMatch(/jatuh\s+pada|yang\s+benar|\bsalah\b/i);
    expect(text).not.toMatch(/^\[(compare|ayah|hadith)\b/m);
    expect(text).not.toMatch(/^\[(word|table)[^\]]*\bcta\b/m);
    expect(b.deck.blocking).toEqual([]);

    const { deck, warnings } = parseDeck(text);
    expect(deck.header.template).toBe(falakMalam.id);
    expect(warnings.filter(isBlocking)).toEqual([]);
    expect(warnings.map((w) => w.code)).toEqual([]);

    // carousel-core's table limit: one header row plus at most 8 body rows.
    for (const block of text.split("\n---\n").filter((s) => s.startsWith("[table"))) {
      const rows = block.split("\n").filter((l) => l.startsWith("|"));
      expect(rows.length - 1).toBeLessThanOrEqual(TABLE_MAX_ROWS);
    }
  });

  it.each(decks().map((b) => [b.name, b] as const))("%s: month/criteria decks carry the hisab disclaimer", (_, b) => {
    if (MONTH_OR_CRITERIA_SERIES.has(b.deck.series)) {
      expect(b.deck.text).toContain(HISAB_DISCLAIMER);
      expect(b.deck.caption).toContain(HISAB_DISCLAIMER);
    }
  });

  it.each(decks().map((b) => [b.name, b] as const))("%s: naming Wujudul Hilal shows its unsourced flag", (_, b) => {
    if (/wujudul hilal/i.test(b.deck.text)) expect(b.deck.text).toMatch(/belum diverifikasi/i);
  });

  it("is deterministic", () => {
    const a = decks().map((b) => b.deck.text);
    const b = decks().map((b) => b.deck.text);
    expect(a).toEqual(b);
  });
});

describe("petang-penentu", () => {
  const deck = buildPetangPenentu({ rows: ramadan, referenceCity: "Jakarta" });

  it("states every criterion's day 1 as a hisab result at named coordinates, never a date that falls", () => {
    for (const m of NEUTRAL_CRITERIA_ORDER) {
      expect(deck.text).toContain(`Menurut hisab kriteria ${CRITERIA[m].name} di koordinat Jakarta (`);
    }
  });

  it("puts the criteria side by side in alphabetical order", () => {
    const header = deck.text.split("\n").find((l) => l.startsWith("| Kota | ") && l.includes("MABIMS"))!;
    expect(header).toBe(`| Kota | ${NEUTRAL_CRITERIA_ORDER.map((m) => CRITERIA[m].name).join(" | ")} |`);
    expect(NEUTRAL_CRITERIA_ORDER.map((m) => CRITERIA[m].name)).toEqual(["MABIMS 2021", "Odeh 2004", "Wujudul Hilal"]);
  });

  it("blocks export and says so when the engine fails for a city", () => {
    const broken: CityOutlook = { ...ramadan[0], outlook: { ok: false, error: "out of range" } };
    const d = buildPetangPenentu({ rows: [broken, ...ramadan.slice(1)] });
    expect(d.blocking.length).toBeGreaterThan(0);
    expect(d.text).toContain("tidak dapat dihitung");
    expect(d.text).toContain("Jakarta | tidak dapat dihitung");
  });
});

describe("indeterminate verdicts", () => {
  it("Jumadilakhir 1448 at Jakarta: Wujudul Hilal is too thin to call, and the deck says so", () => {
    const d = buildAngkaDiBalikHilal({ row: jumadilakhirJakarta });
    expect(d.text).toContain(INDETERMINATE_TEXT);
    expect(d.text).toContain('verdict="TERLALU TIPIS" tone=warn');
  });
});

describe("Jayapura is in WIT", () => {
  it("prints Jayapura's sunset in WIT", () => {
    const d = buildAngkaDiBalikHilal({ row: syawalJayapura });
    const sunset = syawalJayapura.outlook.ok ? syawalJayapura.outlook.value.deciding!.sunsetTime : 0;
    expect(d.text).toContain(`Matahari terbenam ${fmtClock(sunset, "Asia/Jayapura")} WIT.`);
    expect(d.text).not.toContain("Port_Moresby");
  });

  it("marks Jayapura 'matahari sudah terbenam' on Rashdul Qibla", () => {
    const d = buildKiblatSoreIni({ event: may!, rows: rashdul });
    expect(d.text).toContain(`| Jayapura | ${SUN_DOWN_TEXT} |`);
    expect(d.text).toContain("| Jakarta | 16.17 WIB |");
    expect(d.text).toContain("| Makassar | 17.17 WITA |");
  });
});
