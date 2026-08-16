/**
 * Pure geometry for DayArc (DESIGN.md §5.3) - the sun's altitude across a
 * day, drawn as an arc, with the five prayer moments marked where the
 * curve crosses their defining altitude, plus a compass strip sharing the
 * arc's horizon baseline for the qibla bearing.
 *
 * Outside lib/falak/ for the same reason instrumentGeometry.ts and
 * boundaryRibbonGeometry.ts are: layout math, not astronomy. The altitude
 * SAMPLES this module lays out are computed by the caller (dayArcData.ts)
 * from lib/falak/solar.ts's solarPosition + lib/falak/horizon.ts's
 * altitudeDeg - both already-exported, already-validated - not by this
 * module, which only turns (instant, altitude) pairs and prayer instants
 * into SVG coordinates.
 */
import type { Instant } from "./falak/time";

export interface DayArcSample {
  instant: Instant;
  altitudeDeg: number;
}

export type PrayerKey = "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";

export interface PrayerInput {
  key: PrayerKey;
  instant: Instant | null;
  /** The altitude that DEFINES this prayer's moment (fajr/isha's convention angle, -0.8333 for sunrise/maghrib, the shadow-length target for asr, the sun's own peak for dhuhr) - not necessarily equal to its plotted position if instant is null. */
  definingAltitudeDeg: number;
}

export interface DayArcInput {
  /** Ascending by instant, spanning at least fajr (or a fallback) to isha (or a fallback) - see dayArcData.ts. */
  samples: DayArcSample[];
  prayers: PrayerInput[];
  qiblaBearingDeg: number;
}

export interface DayArcViewport {
  width: number;
  /** Height of the arc portion; the compass strip adds a fixed band below it. */
  archHeight: number;
}

export const DEFAULT_DAY_ARC_VIEWPORT: DayArcViewport = { width: 960, archHeight: 280 };
const COMPASS_STRIP_HEIGHT = 70;
const ALTITUDE_PADDING_DEG = 8;
const ALTITUDE_FLOOR_DEG = -30;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface PlottedPoint {
  x: number;
  y: number;
}

export interface PlottedPrayer extends PrayerInput {
  /** Null when instant is null - nothing to plot, not a fabricated position. */
  point: PlottedPoint | null;
  belowHorizon: boolean;
}

export interface DayArcLayout {
  viewport: DayArcViewport;
  totalHeight: number;
  horizonY: number;
  /** SVG path `d` for the full altitude curve (both above and below horizon - the caller clips/styles the two halves differently, see DayArc.tsx). */
  curvePath: string;
  /** Horizontal bands (x1..x2) where the curve dips below the horizon - the depression zone DESIGN.md asks be drawn distinctly rather than pretending fajr/isha sit on the arc. */
  depressionBands: Array<{ x1: number; x2: number }>;
  prayers: PlottedPrayer[];
  compassStripY: number;
  qiblaX: number;
}

function timeToX(instant: Instant, domain: [Instant, Instant], width: number): number {
  const [lo, hi] = domain;
  const span = hi - lo || 1;
  return clamp(((instant - lo) / span) * width, 0, width);
}

/**
 * Rounds a coordinate before it's embedded in an SVG attribute string.
 *
 * Found by rendering DayArc where it's computed synchronously at render
 * time (this component's data flows straight from synchronous engine
 * calls, unlike every fetchXxx-shaped async flow elsewhere in this app):
 * Math.sin/cos/atan2 are not guaranteed bit-identical across JS engines
 * (ECMA-262 leaves their precision implementation-defined), so a value
 * computed during Node's static-export prerender can differ from the same
 * value recomputed in the browser at the last representable bit - server:
 * "277.6145417944082", client: "277.61454179440825" as one real example
 * from testing this directly. React's hydration check does an exact
 * string compare on DOM attributes, so any such difference throws a
 * hydration-mismatch error even though the numbers are visually and
 * physically identical. Two decimal places is far finer than a screen can
 * render anyway - this isn't a precision loss that matters, only one that
 * was never meaningful to keep.
 */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeDayArcLayout(input: DayArcInput, viewport: DayArcViewport = DEFAULT_DAY_ARC_VIEWPORT): DayArcLayout {
  const { width, archHeight } = viewport;
  const totalHeight = archHeight + COMPASS_STRIP_HEIGHT;

  const samples = input.samples;
  const domain: [Instant, Instant] = [
    samples[0]?.instant ?? 0,
    samples[samples.length - 1]?.instant ?? 1,
  ];

  const maxAltitude = Math.max(...samples.map((s) => s.altitudeDeg), 10);
  const altTop = clamp(maxAltitude + ALTITUDE_PADDING_DEG, 20, 120);
  const altBottom = ALTITUDE_FLOOR_DEG;
  const altSpan = altTop - altBottom || 1;

  const altToY = (altitudeDeg: number): number => {
    const clamped = clamp(altitudeDeg, altBottom, altTop);
    return round2(archHeight - ((clamped - altBottom) / altSpan) * archHeight);
  };
  const horizonY = altToY(0);

  const points = samples.map((s) => ({ x: round2(timeToX(s.instant, domain, width)), y: altToY(s.altitudeDeg) }));
  const curvePath = points.length === 0 ? "" : `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`;

  const depressionBands: Array<{ x1: number; x2: number }> = [];
  let bandStart: number | null = null;
  for (let i = 0; i < samples.length; i += 1) {
    const below = samples[i].altitudeDeg < 0;
    if (below && bandStart === null) bandStart = points[i].x;
    if (!below && bandStart !== null) {
      depressionBands.push({ x1: bandStart, x2: points[i].x });
      bandStart = null;
    }
  }
  if (bandStart !== null) depressionBands.push({ x1: bandStart, x2: width });

  const prayers: PlottedPrayer[] = input.prayers.map((p) => ({
    ...p,
    point:
      p.instant === null
        ? null
        : { x: round2(timeToX(p.instant, domain, width)), y: altToY(p.definingAltitudeDeg) },
    belowHorizon: p.definingAltitudeDeg < 0,
  }));

  // Qibla bearing (0-360, clockwise from true north) mapped linearly across
  // the compass strip's width - a schematic reference strip, not a true
  // compass rendering, since the arc above it is a time axis and the strip
  // deliberately doesn't try to reconcile two different coordinate systems
  // into one (see the module comment in DayArc.tsx).
  const qiblaX = round2((input.qiblaBearingDeg / 360) * width);

  return {
    viewport,
    totalHeight,
    horizonY,
    curvePath,
    depressionBands,
    prayers,
    compassStripY: archHeight,
    qiblaX,
  };
}
