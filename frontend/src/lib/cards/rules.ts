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

/** Short source line per criterion, from lib/falak/citations.ts. */
export const CRITERION_SOURCE: Record<HilalMethod, string> = {
  mabims_2021: "Sumber: Kemenag RI, kriteria baru MABIMS (berlaku sejak 2022)",
  odeh: "Sumber: Odeh, Experimental Astronomy (2004)",
  wujudul_hilal: "Sumber: rujukan primer Majelis Tarjih belum diverifikasi",
};

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
