/** Shared pieces of the card series - wording only, no astronomy. */
import { CRITERIA } from "../../criteria";
import { criterionMargin, type CriterionMargin } from "../../falak/tolerance";
import type { HilalMethod, HilalObservation, OdehVerdict } from "../../falak/visibility";
import { zoneAbbreviation } from "../../localDate";
import type { Tone } from "../deck";
import { ENGINE_ERROR_TEXT } from "../rules";
import type { Computed } from "../inputs";

export const FALAK_URL = "andifathulms.github.io/falak-visualizer";

export function zoneOf(tz: string): string {
  return zoneAbbreviation(tz);
}

/** The value, or the reason it is missing - collected so the deck can block export. */
export function take<T>(c: Computed<T>, what: string, blocking: string[]): T | null {
  if (c.ok) return c.value;
  blocking.push(`${what}: ${ENGINE_ERROR_TEXT} (${c.error})`);
  return null;
}

export interface Verdict {
  /** Short cell text for tables. */
  cell: string;
  /** Stamp label for verdict cards. */
  stamp: string;
  tone: Tone;
  indeterminate: boolean;
  margin: CriterionMargin;
}

const ODEH_CELL: Record<OdehVerdict, [string, Tone]> = {
  visible: ["Terlihat", "ok"],
  visible_optical_aid: ["Alat optik", "ok"],
  marginal: ["Marginal", "warn"],
  not_visible: ["Tidak terlihat", "bad"],
};

/**
 * One criterion's verdict on one evening, in card wording. Indeterminate
 * (margin inside the engine tolerance) overrides the boolean: the card says
 * it is too close to call rather than picking a side.
 */
export function verdictFor(
  method: HilalMethod,
  observation: HilalObservation,
  criteria: { mabims_2021: boolean; wujudul_hilal: boolean; odeh: OdehVerdict },
): Verdict {
  const margin = criterionMargin(observation, method);
  if (margin.verdict === "indeterminate") {
    return { cell: "Terlalu tipis", stamp: "TERLALU TIPIS", tone: "warn", indeterminate: true, margin };
  }
  if (method === "odeh") {
    const [cell, tone] = ODEH_CELL[criteria.odeh];
    return { cell, stamp: cell.toUpperCase(), tone, indeterminate: false, margin };
  }
  const met = method === "mabims_2021" ? criteria.mabims_2021 : criteria.wujudul_hilal;
  if (method === "wujudul_hilal") {
    return met
      ? { cell: "Wujud", stamp: "HILAL WUJUD", tone: "ok", indeterminate: false, margin }
      : { cell: "Belum wujud", stamp: "BELUM WUJUD", tone: "bad", indeterminate: false, margin };
  }
  return met
    ? { cell: "Terpenuhi", stamp: "TERPENUHI", tone: "ok", indeterminate: false, margin }
    : { cell: "Belum", stamp: "BELUM TERPENUHI", tone: "bad", indeterminate: false, margin };
}

export function criterionName(method: HilalMethod): string {
  return CRITERIA[method].name;
}
