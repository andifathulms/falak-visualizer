/**
 * Pure geometry for HorizonInstrument (DESIGN.md §5.1) - takes already-
 * validated engine numbers and produces SVG-ready layout, nothing more. No
 * astronomy happens here: every physical value (altitude, elongation,
 * illumination, lag time) is consumed as given, never derived or
 * re-estimated. This module is deliberately outside lib/falak/ - it is
 * presentation math (px-per-degree scales, mask offsets), not engine
 * surface, so it isn't subject to the freeze on that directory, even though
 * two of its band helpers below read (never modify) lib/falak/visibility.ts
 * exports.
 *
 * Horizontal placement note (read before changing anything here): DESIGN.md
 * §5.1 asks for the moon's "true azimuth offset from the sun". No azimuth
 * function exists anywhere in lib/falak/ - only altitude does (horizon.ts) -
 * and adding one now would be new, unvalidated astronomical output, which
 * CLAUDE.md's validation rule forbids shipping without a Skyfield
 * cross-check this environment can't run. Horizontal placement here uses
 * lagTimeMinutes (moonset - sunset) instead: already validated, already
 * exported, and DESIGN.md independently wants a lag-time bracket drawn on
 * this same horizontal axis anyway - this unifies the two rather than
 * inventing a second unvalidated quantity. It is a time axis, not a compass
 * bearing; nothing here claims otherwise.
 */
import {
  MABIMS_MIN_ALTITUDE_DEG,
  odehVValue,
} from "./falak/visibility";

export interface HorizonReading {
  moonAltitudeDeg: number;
  sunAltitudeDeg: number;
  elongationDeg: number;
  illuminationFraction: number;
  /** Hours since conjunction - display only, not used for any geometry. */
  moonAgeHours?: number;
  /** null when moonset could not be found that day - see positionIndeterminate below. */
  lagTimeMinutes: number | null;
  crescentWidthArcmin: number | null;
}

export interface ThresholdBand {
  key: string;
  label: string;
  /** null for a criterion with no altitude threshold (wujudul hilal) - rendered as a horizon marker instead of a band. */
  minAltitudeDeg: number | null;
}

export interface InstrumentViewport {
  width: number;
  height: number;
}

export const DEFAULT_VIEWPORT: InstrumentViewport = { width: 720, height: 320 };

const ALT_PX_PER_DEG = 8;
const HORIZON_Y_FRACTION = 0.66;
const LAG_PX_PER_MINUTE = 2.5;
const LAG_DOMAIN_MIN = -60;
const LAG_DOMAIN_MAX = 180;
// Real hilal-evening altitudes never approach these bounds (0-15deg is the
// practical range); this exists so a genuinely out-of-range input (found by
// rendering the fixture set's own stress case: 37deg, a near-full moon far
// outside hilal territory) clamps onto the canvas instead of drawing the
// moon off it entirely, which is what happened before this was added -
// confirmed by looking at an actual rendered preview, not assumed.
const ALT_DOMAIN_MIN_DEG = -10;
const ALT_DOMAIN_MAX_DEG = 22;
export const SUN_RADIUS = 14;
export const MOON_RADIUS = 22;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Area of the part of one circle (radius r) NOT covered by an equal circle
 * offset by distance d, as a fraction of the circle's own area. 0 at d=0
 * (the circles coincide, nothing left uncovered); 1 at d>=2r (no overlap,
 * the whole circle is uncovered). Standard circle-circle intersection area,
 * plane geometry - not astronomy.
 */
export function circleOverlapVisibleFraction(d: number, r: number): number {
  if (r <= 0) return 0;
  if (d <= 0) return 0;
  if (d >= 2 * r) return 1;
  const x = clamp(d / (2 * r), -1, 1);
  const overlapArea = 2 * r * r * Math.acos(x) - (d / 2) * Math.sqrt(Math.max(0, 4 * r * r - d * d));
  return clamp(1 - overlapArea / (Math.PI * r * r), 0, 1);
}

/**
 * The offset distance between the two same-radius circles that make up the
 * crescent mask (see HorizonInstrument.tsx) whose visible sliver's AREA
 * equals the given illumination fraction. Solved by bisection -
 * circleOverlapVisibleFraction has no closed-form inverse, but it is
 * continuous and monotonic in d, so bisection converges cleanly in well
 * under 40 steps for any float precision this ever needs.
 *
 * This supersedes HilalMoon.tsx's clamped-linear shift formula, which -
 * worked through the same two-circle mask - puts the offset in the wrong
 * direction: largest at illumination=0, when the AREA that offset actually
 * uncovers is the largest fraction of the circle, not the thinnest sliver.
 *
 * `target` here is a VISUAL area fraction, not necessarily the raw
 * illumination fraction - see perceptualCrescentFraction below for why the
 * two have to be different numbers.
 */
export function crescentOffsetForVisibleFraction(target: number, radius: number): number {
  const clamped = clamp(target, 0, 1);
  if (clamped <= 0) return 0;
  if (clamped >= 1) return 2 * radius;
  let lo = 0;
  let hi = 2 * radius;
  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) / 2;
    if (circleOverlapVisibleFraction(mid, radius) < clamped) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}

/**
 * DESIGN.md §5.1 asks that "a 0.4% crescent must look like a 0.4% crescent" -
 * checked against a real preview render (see MIGRATION.md's step 3 notes),
 * a LITERALLY area-proportional crescent fails that goal for exactly the
 * values this app cares about: hilal illumination is essentially always
 * under a few percent (that's what makes it a hilal rather than any other
 * lunar phase), and at MOON_RADIUS scale, 0.2% of a circle's area is a
 * fraction of a pixel wide - genuinely imperceptible, not merely subtle.
 * A literal mapping would render nearly every real observation as a bare
 * dot, which contradicts the drawing's whole purpose (making the geometry
 * visible) far more than a documented, order-preserving compression does.
 *
 * This maps illumination fraction through a fixed power curve (gamma < 1,
 * i.e. it EXPANDS the low end and compresses the high end) before handing
 * the result to crescentOffsetForVisibleFraction. It is monotonic (a
 * thinner crescent always renders thinner than a fatter one) and exact at
 * both ends (0 stays 0, 1 stays 1) - what it gives up is literal
 * area-for-area truth in exchange for the low end actually being visible.
 * The true illumination_fraction number is never hidden: it is always
 * shown as text beside the drawing (HorizonInstrument's readout), so
 * nothing here is a substitute for the real value, only its shape on screen.
 */
const CRESCENT_PERCEPTUAL_GAMMA = 0.3;

export function perceptualCrescentFraction(illuminationFraction: number): number {
  const k = clamp(illuminationFraction, 0, 1);
  if (k <= 0) return 0;
  return k ** CRESCENT_PERCEPTUAL_GAMMA;
}

export function crescentOffsetForIllumination(illuminationFraction: number, radius: number): number {
  return crescentOffsetForVisibleFraction(perceptualCrescentFraction(illuminationFraction), radius);
}

export interface BodyPoint {
  x: number;
  y: number;
}

export interface BandLayout extends ThresholdBand {
  rect: { x: number; y: number; width: number; height: number } | null;
}

export interface LagBracket {
  x1: number;
  x2: number;
  y: number;
  minutes: number;
}

export interface InstrumentLayout {
  viewport: InstrumentViewport;
  horizonY: number;
  sun: BodyPoint & { radius: number; depressionDeg: number };
  moon: BodyPoint & {
    radius: number;
    crescentOffset: number;
    /** Unit vector, in this drawing's own 2D space, pointing from the sun's drawn position toward the moon's. The mask's subtractive circle shifts the opposite way, so the visible sliver bulges toward the sun - see the module comment on why this is self-referential rather than a true compass bearing. */
    awayFromSunX: number;
    awayFromSunY: number;
    /** True when lagTimeMinutes was null: there is no basis for a horizontal position, and CLAUDE.md's no-silent-fallback rule means the component must say so rather than guess one. */
    positionIndeterminate: boolean;
  };
  bands: BandLayout[];
  lagBracket: LagBracket | null;
}

export function computeInstrumentLayout(
  reading: HorizonReading,
  options?: { viewport?: InstrumentViewport; bands?: ThresholdBand[] },
): InstrumentLayout {
  const viewport = options?.viewport ?? DEFAULT_VIEWPORT;
  const horizonY = viewport.height * HORIZON_Y_FRACTION;
  const centerX = viewport.width / 2;

  const sunAltDrawDeg = clamp(reading.sunAltitudeDeg, ALT_DOMAIN_MIN_DEG, ALT_DOMAIN_MAX_DEG);
  const moonAltDrawDeg = clamp(reading.moonAltitudeDeg, ALT_DOMAIN_MIN_DEG, ALT_DOMAIN_MAX_DEG);
  // Same two-clamp reasoning as moonX below: the degree-domain clamp keeps
  // the altitude VALUE sensible, this pixel clamp is the actual on-canvas
  // guarantee, independent of whether ALT_PX_PER_DEG/ALT_DOMAIN_* and the
  // viewport height stay in sync.
  const sunY = clamp(horizonY - sunAltDrawDeg * ALT_PX_PER_DEG, SUN_RADIUS, viewport.height - SUN_RADIUS);
  const moonY = clamp(horizonY - moonAltDrawDeg * ALT_PX_PER_DEG, MOON_RADIUS, viewport.height - MOON_RADIUS);

  const positionIndeterminate = reading.lagTimeMinutes === null;
  const lagClamped =
    reading.lagTimeMinutes === null
      ? 0
      : clamp(reading.lagTimeMinutes, LAG_DOMAIN_MIN, LAG_DOMAIN_MAX);
  // Two clamps, not one: LAG_DOMAIN_{MIN,MAX} keeps the minute VALUE within a
  // semantically reasonable range before scaling; this second clamp is a
  // defensive guarantee, in canvas pixels, that the moon can never be
  // drawn off-canvas regardless of how those constants (or MOON_RADIUS, or
  // the viewport) get tuned later - the lag-domain constants and the pixel
  // scale can drift out of sync with each other, canvas bounds cannot. The
  // fixture set's own stress case (+562 minutes of lag) pushed the moon
  // 90px past the right edge under the domain clamp alone before this was
  // added - found by rendering an actual preview, not assumed.
  const moonXUnclamped = centerX + lagClamped * LAG_PX_PER_MINUTE;
  const moonX = clamp(moonXUnclamped, MOON_RADIUS, viewport.width - MOON_RADIUS);

  const dx = moonX - centerX;
  const dy = moonY - sunY;
  const dist = Math.hypot(dx, dy) || 1;

  const bands: BandLayout[] = (options?.bands ?? []).map((band) => {
    if (band.minAltitudeDeg === null) {
      return { ...band, rect: null };
    }
    const bandHeight = Math.max(0, band.minAltitudeDeg * ALT_PX_PER_DEG);
    return {
      ...band,
      rect: { x: 0, y: horizonY - bandHeight, width: viewport.width, height: bandHeight },
    };
  });

  const lagBracket: LagBracket | null =
    reading.lagTimeMinutes === null
      ? null
      : { x1: centerX, x2: moonX, y: horizonY + 30, minutes: reading.lagTimeMinutes };

  return {
    viewport,
    horizonY,
    sun: { x: centerX, y: sunY, radius: SUN_RADIUS, depressionDeg: -reading.sunAltitudeDeg },
    moon: {
      x: moonX,
      y: moonY,
      radius: MOON_RADIUS,
      crescentOffset: crescentOffsetForIllumination(reading.illuminationFraction, MOON_RADIUS),
      awayFromSunX: dx / dist,
      awayFromSunY: dy / dist,
      positionIndeterminate,
    },
    bands,
    lagBracket,
  };
}

/** MABIMS 2021's fixed altitude threshold, as a band - trivial, it's already a constant; kept here so callers don't need to import the engine constant by name. */
export function mabimsThresholdBand(): ThresholdBand {
  return { key: "mabims_2021", label: "MABIMS 2021", minAltitudeDeg: MABIMS_MIN_ALTITUDE_DEG };
}

/**
 * Odeh's minimum-visibility altitude at a GIVEN crescent width, solved from
 * the engine's own odehVValue (visibility.ts) rather than re-deriving the
 * classification. odehVValue(altitude, width) is linear in altitude -
 * v = altitude + (0.8333 - f(width)) - so "v = 5.65" (Odeh's
 * visible/marginal boundary) has a closed-form solution for altitude at a
 * fixed width. This is arithmetic on an already-validated, already-exported
 * function, not a new formula, and it only has an answer once a width is
 * known (unlike MABIMS, Odeh's threshold isn't a single fixed altitude).
 */
export function odehThresholdBand(crescentWidthArcmin: number | null): ThresholdBand {
  const vAtZeroAltitude = odehVValue(0, crescentWidthArcmin ?? 0);
  return { key: "odeh", label: "Odeh", minAltitudeDeg: 5.65 - vAtZeroAltitude };
}

/** Wujudul hilal has no altitude threshold - it's a moonset-after-sunset timing test, already visible from the lag-time bracket. Represented as a horizon marker (minAltitudeDeg: null), not a fabricated band. */
export function wujudulHilalMarkerBand(): ThresholdBand {
  return { key: "wujudul_hilal", label: "Wujudul hilal", minAltitudeDeg: null };
}

/** All three criteria's bands, in the order DESIGN.md §5.1's stacked comparison shows them. */
export function allThresholdBands(crescentWidthArcmin: number | null): ThresholdBand[] {
  return [wujudulHilalMarkerBand(), mabimsThresholdBand(), odehThresholdBand(crescentWidthArcmin)];
}

/**
 * Shared snake_case shape across lib/api.ts's HilalObservation, its
 * VisibilityGridResult points, and VisibilityCalendarResult months - the
 * three places migration step 5 needs a HorizonReading from. A structural
 * type, not an import from lib/api.ts, so this module doesn't take on a
 * dependency the other direction.
 */
export interface ObservationLike {
  moon_altitude_deg: number;
  sun_altitude_deg: number;
  elongation_deg: number;
  moon_age_hours?: number;
  illumination_fraction: number;
  lag_time_minutes: number | null;
  crescent_width_arcmin: number | null;
}

/** Maps an engine observation (however it reached the caller) onto HorizonInstrument's input shape. Pure field renaming, no computation. */
export function horizonReadingFromObservation(obs: ObservationLike): HorizonReading {
  return {
    moonAltitudeDeg: obs.moon_altitude_deg,
    sunAltitudeDeg: obs.sun_altitude_deg,
    elongationDeg: obs.elongation_deg,
    moonAgeHours: obs.moon_age_hours,
    illuminationFraction: obs.illumination_fraction,
    lagTimeMinutes: obs.lag_time_minutes,
    crescentWidthArcmin: obs.crescent_width_arcmin,
  };
}
