/**
 * Human-readable labels for the engine's verdict values.
 *
 * The engine speaks in wire values: booleans for wujudul hilal and MABIMS, and
 * for Odeh the four snake_case classification strings. grid.ts additionally
 * stringifies its booleans as "True"/"False" to match Python's str(bool),
 * because that is what the API used to return. All of that is correct as an
 * internal contract and all of it had leaked to the screen, so a user reading
 * the criteria comparison saw `false` and `visible_optical_aid`.
 *
 * This module is display-only, and deliberately one-directional. Nothing here
 * is parsed back, compared against, or used to decide anything - `isVisible`
 * in lib/verdict.ts still tests the raw engine values, and must keep doing so.
 * A label is a rendering of a verdict, never a substitute for it.
 */

/**
 * Every raw verdict value the engine can hand the UI, in any of its
 * spellings. Indonesian per DESIGN.md §7 - translated here rather than left
 * for later despite most other display-only prose in the app still being
 * English during this migration (MIGRATION.md's step 5 notes): this is a
 * short, unambiguous lookup table, not nuanced explanatory prose, so the
 * mistranslation risk that justified deferring longer copy doesn't apply,
 * and it sits in the single most visible spot on every criteria comparison
 * (the badges) - worth fixing now rather than shipping mixed-language
 * badges on a page built to be read in Indonesian.
 */
const LABELS: Record<string, string> = {
  // Boolean criteria, in both the native and the Python-stringified spelling.
  true: "Terpenuhi",
  false: "Belum terpenuhi",
  True: "Terpenuhi",
  False: "Belum terpenuhi",

  // Odeh's continuous classification.
  visible: "Terlihat",
  visible_optical_aid: "Terlihat dengan alat bantu",
  marginal: "Marginal",
  not_visible: "Tidak terlihat",
};

/** Shown where a criterion produced no verdict at all. */
export const NO_VERDICT = "\u2014";

/**
 * Label for a raw verdict.
 *
 * Nullish input renders as an em dash, not as the string "undefined" - which is
 * what the previous `String(verdict)` call sites produced when a month had no
 * resolved verdict. Absence of a verdict is not a verdict, and it is also not
 * a "not met".
 *
 * Unknown non-nullish values are returned unchanged rather than replaced with a
 * placeholder: a verdict this map has not been taught about is a gap worth
 * seeing on screen, not one worth hiding behind "Unknown".
 */
export function verdictLabel(verdict: boolean | string | null | undefined): string {
  if (verdict === null || verdict === undefined) return NO_VERDICT;
  return LABELS[String(verdict)] ?? String(verdict);
}
