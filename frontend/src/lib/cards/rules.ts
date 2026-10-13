/**
 * The editorial rules every card deck obeys. Builders apply them; nobody
 * editing a deck has to remember them. CLAUDE.md's religious-sensitivity rule
 * and docs/RECON_CARDS.md §8 are the source.
 */
import { CRITERIA } from "../criteria";
import type { HilalMethod } from "../falak/visibility";

/** Appended to every month-start or criteria deck, verbatim. */
export const HISAB_DISCLAIMER =
  "Hisab, bukan penetapan resmi. Awal Ramadan, Syawal dan Zulhijah ditetapkan pemerintah melalui sidang isbat Kemenag.";

/** What an indeterminate verdict says instead of picking a side. */
export const INDETERMINATE_TEXT = "terlalu tipis untuk diputuskan hitungan";

/** Engine failure: shown as a blocking message, never replaced by a value. */
export const ENGINE_ERROR_TEXT = "tidak dapat dihitung";

/** How an isbat comparison names its source (the records are not human-verified). */
export const ISBAT_SOURCE_TEXT = "berdasarkan rilis pers Kemenag";

/**
 * Criteria in neutral (alphabetical) order. Not CRITERIA_ORDER, which leads
 * with MABIMS because it is the app's default - on a public card, a fixed
 * order that ranks nobody is the point.
 */
export const NEUTRAL_CRITERIA_ORDER: readonly HilalMethod[] = [...(Object.keys(CRITERIA) as HilalMethod[])].sort(
  (a, b) => CRITERIA[a].name.localeCompare(CRITERIA[b].name, "id"),
);

/** "Dikenal sebagai kriteria Muhammadiyah (rujukan belum diverifikasi)". */
export function criterionAttribution(method: HilalMethod): string {
  const c = CRITERIA[method];
  return c.whoUnsourced ? `${c.who} (rujukan belum diverifikasi)` : c.who;
}

/**
 * Who uses each criterion and where it comes from, in card length - the same
 * claims as criteria.ts / citations.ts (DESIGN.md §7.3), nothing stronger.
 */
export const CRITERION_CARD_SOURCE: Record<HilalMethod, string> = {
  mabims_2021: "dipakai Kemenag RI dalam sidang isbat (sumber: Kemenag RI)",
  odeh: "rujukan astronomi internasional (Odeh, Experimental Astronomy)",
  wujudul_hilal: "dikenal sebagai kriteria Muhammadiyah (rujukan belum diverifikasi)",
};

/** Column headers where a 4-column table has no room for full names; the table note names them in full. */
export const CRITERION_SHORT: Record<HilalMethod, string> = {
  mabims_2021: "MABIMS",
  odeh: "Odeh",
  wujudul_hilal: "W. Hilal",
};

/** criteria.ts' KHGT note, in card length. */
export const KHGT_NOTE = "Muhammadiyah telah mengumumkan peralihan ke KHGT, yang tidak dihitung Falak.";

/** Phrases no deck may contain (case-insensitive, whole words). */
export const FORBIDDEN_PATTERNS: ReadonlyArray<{ pattern: RegExp; why: string }> = [
  { pattern: /jatuh\s+pada/i, why: "a month start is a hisab result per criterion, never a date that 'falls'" },
  { pattern: /yang\s+benar/i, why: "no criterion is presented as the right one" },
  { pattern: /\bsalah\b/i, why: "no criterion is presented as wrong" },
  { pattern: /\bversus\b|\bvs\.?\b/i, why: "no versus framing between criteria or organisations" },
  { pattern: /^\[(ayah|hadith)\b/im, why: "no ayah/hadith slides used as argument" },
  { pattern: /^\[compare\b/im, why: "compare slides label their boxes Salah/Benar" },
];

export function ruleViolations(text: string): string[] {
  return FORBIDDEN_PATTERNS.filter((f) => f.pattern.test(text)).map((f) => `${f.pattern}: ${f.why}`);
}
