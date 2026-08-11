/**
 * How far a verdict sat from the threshold that decided it, and whether this
 * engine is accurate enough to have decided it at all.
 *
 * Two separate ideas live here and must not be conflated:
 *
 *   MARGIN is how much room a criterion had. MABIMS needing 3.0 deg and getting
 *   3.4 deg is a margin of +0.4 deg. It is a property of the sky on that
 *   evening, and it is exact.
 *
 *   TOLERANCE is how much this engine could be wrong by. It is a property of
 *   the implementation, and it does not shrink because a user wants an answer.
 *
 * A verdict whose margin is smaller than the tolerance has not been decided by
 * the criterion - it has been decided by rounding, and reporting it as met or
 * not met would be exactly the "silent fallback value" CLAUDE.md forbids. Those
 * are surfaced as INDETERMINATE rather than given a side.
 *
 * This module is intentionally NOT mirrored in the Python oracle. It introduces
 * no astronomy: every input is a number the oracle already computes and the
 * golden-vector suite already pins to 1e-9. Duplicating pure arithmetic across
 * both engines would add a parity surface without adding a check.
 */
import type { HilalMethod, HilalObservation } from "./visibility";
import { MABIMS_MIN_ALTITUDE_DEG, MABIMS_MIN_ELONGATION_DEG, odehVValue } from "./visibility";

/**
 * The engine's accuracy envelope, in the units each criterion is decided in.
 *
 * These are not guesses. Each is traceable to a check in the validation suite,
 * and each is rounded outward from what that check measured:
 *
 *   - Conjunction timing is validated against JPL DE440 through Skyfield over
 *     50 historical months, asserting under 5 minutes
 *     (backend/falak/tests/test_conjunction_skyfield_crosscheck.py). That bound
 *     is what `conjunctionMinutes` reports.
 *
 *   - Solar and lunar apparent positions reproduce Meeus' worked examples
 *     (Astronomical Algorithms 2nd ed., Examples 25.a and 47.a) to 1e-4 deg
 *     (backend/falak/tests/test_solar.py, test_lunar.py). Agreement with a
 *     worked example is not the same as accuracy in general, so the dominant
 *     term is instead the truncated ELP2000 series this engine uses: Meeus
 *     publishes 60 periodic terms per coordinate, accurate to roughly 10
 *     arcsec in lunar longitude. That is ~0.003 deg.
 *
 *   - `altitudeDeg` is set an order of magnitude above that at 0.03 deg, to
 *     absorb the topocentric reduction, the sunset root-find, and the fact
 *     that altitude near the horizon changes fast enough that a small timing
 *     error becomes a visible altitude error.
 *
 * What these numbers deliberately do NOT cover is model uncertainty - see
 * MODEL_CAVEATS. A tolerance is a claim about arithmetic, not about the
 * atmosphere.
 */
export const ENGINE_TOLERANCE = {
  altitudeDeg: 0.03,
  elongationDeg: 0.03,
  conjunctionMinutes: 5.0,
  /** Sunset and moonset are each root-found to well under a second. */
  lagMinutes: 0.2,
} as const;

/**
 * Known modelling choices that shift results by more than the tolerance above,
 * and which no amount of arithmetic precision addresses. Surfaced in the UI
 * because an accuracy figure that omits them would be misleading by omission.
 */
export const MODEL_CAVEATS: ReadonlyArray<{ title: string; detail: string }> = [
  {
    title: "Standard refraction only",
    detail:
      "Sunset and moonset assume the standard 34-arcminute refraction at the horizon. Real temperature and pressure move the true sunset by up to about a minute, and the Moon's altitude changes by roughly a quarter of a degree per minute at Indonesian latitudes.",
  },
  {
    title: "Elongation is geocentric",
    detail:
      "Whether MABIMS 2021's 6.4-degree elongation is meant topocentrically is genuinely unsettled; PBNU has argued that it is. This engine reports the conventional geocentric value, which differs by roughly 0.1 to 0.2 degrees.",
  },
  {
    title: "Odeh's arc of vision is approximated",
    detail:
      "Odeh evaluates at 'best time', when the Sun is about 4.5 degrees below the horizon. This engine evaluates at sunset instead and takes the arc of vision from the Moon's altitude there, a documented simplification that shifts the classification near its boundaries.",
  },
  {
    title: "Sea level, spherical Earth",
    detail:
      "The topocentric correction ignores observer elevation and the Earth's flattening. Both are well under an arcminute at these altitudes, and elevation is not something the app asks for.",
  },
];

export type MarginVerdict = "met" | "not_met" | "indeterminate";

export interface CriterionMargin {
  method: HilalMethod;
  verdict: MarginVerdict;
  /**
   * Signed distance from the deciding threshold, in `unit`. Positive means the
   * criterion was met with room to spare. Null where the criterion has no
   * single continuous threshold to measure against.
   */
  margin: number | null;
  /** The engine tolerance this margin was compared against, same unit. */
  tolerance: number;
  unit: "deg" | "min";
  /** Which threshold was binding, in words, e.g. "altitude vs 3.0 deg". */
  binding: string;
}

function classify(margin: number, tolerance: number): MarginVerdict {
  if (Math.abs(margin) < tolerance) return "indeterminate";
  return margin >= 0 ? "met" : "not_met";
}

/**
 * The margin for one criterion on one observation.
 *
 * For MABIMS the binding threshold is whichever of the two conditions has less
 * room, since both must hold: a comfortable altitude does not rescue an
 * elongation that is 0.01 deg short.
 */
export function criterionMargin(
  observation: HilalObservation,
  method: HilalMethod,
): CriterionMargin {
  if (method === "mabims_2021") {
    const altMargin = observation.moonAltitudeDeg - MABIMS_MIN_ALTITUDE_DEG;
    const elongMargin = observation.elongationDeg - MABIMS_MIN_ELONGATION_DEG;
    const binding = altMargin <= elongMargin ? "altitude" : "elongation";
    const margin = Math.min(altMargin, elongMargin);
    const threshold =
      binding === "altitude" ? MABIMS_MIN_ALTITUDE_DEG : MABIMS_MIN_ELONGATION_DEG;
    return {
      method,
      verdict: classify(margin, ENGINE_TOLERANCE.altitudeDeg),
      margin,
      tolerance: ENGINE_TOLERANCE.altitudeDeg,
      unit: "deg",
      binding: `${binding} vs ${threshold.toFixed(1)}°`,
    };
  }

  if (method === "wujudul_hilal") {
    // Conjunction-before-sunset is the gate; once past it the criterion is
    // decided purely by lag time, which is the continuous quantity worth
    // measuring. Before it, no amount of lag helps.
    if (observation.conjunctionTime >= observation.sunsetTime) {
      return {
        method,
        verdict: "not_met",
        margin: null,
        tolerance: ENGINE_TOLERANCE.conjunctionMinutes,
        unit: "min",
        binding: "conjunction after sunset",
      };
    }
    if (observation.lagTimeMinutes === null) {
      return {
        method,
        verdict: "not_met",
        margin: null,
        tolerance: ENGINE_TOLERANCE.lagMinutes,
        unit: "min",
        binding: "no moonset that evening",
      };
    }
    return {
      method,
      verdict: classify(observation.lagTimeMinutes, ENGINE_TOLERANCE.lagMinutes),
      margin: observation.lagTimeMinutes,
      tolerance: ENGINE_TOLERANCE.lagMinutes,
      unit: "min",
      binding: "moonset after sunset",
    };
  }

  if (method === "odeh") {
    // Odeh is a four-way classification, so the meaningful margin is the
    // distance to whichever boundary the v-value is nearest - that is the one
    // a small error would push it across.
    const v = odehVValue(observation.moonAltitudeDeg, observation.crescentWidthArcmin);
    const boundaries = [
      { name: "visible", at: 5.65 },
      { name: "optical aid", at: 2.0 },
      { name: "marginal", at: -0.96 },
    ];
    let nearest = boundaries[0];
    for (const b of boundaries) {
      if (Math.abs(v - b.at) < Math.abs(v - nearest.at)) nearest = b;
    }
    const margin = v - nearest.at;
    return {
      method,
      // Odeh's own scale is in the same units as its boundaries, so the
      // altitude tolerance is the right order of magnitude to compare against.
      verdict: Math.abs(margin) < ENGINE_TOLERANCE.altitudeDeg ? "indeterminate" : "met",
      margin,
      tolerance: ENGINE_TOLERANCE.altitudeDeg,
      unit: "deg",
      binding: `Odeh's v = ${v.toFixed(2)} (how far above the faintest crescent ever recorded at this width); nearest grade boundary "${nearest.name}" at ${nearest.at}`,
    };
  }

  throw new Error(`unsupported method: ${method}`);
}

/** Human-readable margin, e.g. "+0.42°" or "−3.1 min". */
export function formatMargin(m: CriterionMargin): string | null {
  if (m.margin === null) return null;
  const sign = m.margin >= 0 ? "+" : "−";
  const value = Math.abs(m.margin);
  return m.unit === "deg"
    ? `${sign}${value.toFixed(2)}°`
    : `${sign}${value.toFixed(1)} min`;
}
