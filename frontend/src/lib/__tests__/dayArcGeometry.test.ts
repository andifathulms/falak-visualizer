import { describe, expect, it } from "vitest";
import {
  computeDayArcLayout,
  DEFAULT_DAY_ARC_VIEWPORT,
  type DayArcInput,
  type DayArcSample,
} from "../dayArcGeometry";

const HOUR = 3_600_000_000; // microseconds, matching lib/falak/time.ts's Instant unit

/** A stylised day: altitude rises from -25 (fajr-ish) through 0 (sunrise) to a
 * midday peak, back down through 0 (maghrib) to -25 (isha-ish) - not real
 * engine output (this module doesn't compute astronomy), just a shape
 * exercising every branch computeDayArcLayout has to handle. */
function stylisedDay(): DayArcSample[] {
  const samples: DayArcSample[] = [];
  for (let i = 0; i <= 48; i += 1) {
    const t = i * (HOUR / 4); // every 15 minutes across 12 hours
    const hoursFromStart = i / 4;
    const altitude = 60 * Math.sin((Math.PI * hoursFromStart) / 12) - 5;
    samples.push({ instant: t, altitudeDeg: altitude });
  }
  return samples;
}

function baseInput(overrides: Partial<DayArcInput> = {}): DayArcInput {
  const samples = stylisedDay();
  return {
    samples,
    prayers: [
      { key: "fajr", instant: samples[2].instant, definingAltitudeDeg: -20 },
      { key: "sunrise", instant: samples[10].instant, definingAltitudeDeg: -0.8333 },
      { key: "dhuhr", instant: samples[24].instant, definingAltitudeDeg: 55 },
      { key: "asr", instant: samples[34].instant, definingAltitudeDeg: 30 },
      { key: "maghrib", instant: samples[38].instant, definingAltitudeDeg: -0.8333 },
      { key: "isha", instant: samples[46].instant, definingAltitudeDeg: -18 },
    ],
    qiblaBearingDeg: 292, // roughly WNW, matching qibla/page.tsx's own description for Indonesia
    ...overrides,
  };
}

describe("computeDayArcLayout", () => {
  it("produces a non-empty SVG path spanning the samples", () => {
    const layout = computeDayArcLayout(baseInput());
    expect(layout.curvePath.startsWith("M ")).toBe(true);
    expect(layout.curvePath.length).toBeGreaterThan(10);
  });

  it("plots every prayer with a non-null instant, and skips ones without one", () => {
    const input = baseInput();
    input.prayers = input.prayers.map((p) => (p.key === "fajr" ? { ...p, instant: null } : p));
    const layout = computeDayArcLayout(input);
    const fajr = layout.prayers.find((p) => p.key === "fajr")!;
    expect(fajr.point).toBeNull();
    const sunrise = layout.prayers.find((p) => p.key === "sunrise")!;
    expect(sunrise.point).not.toBeNull();
  });

  it("marks fajr/isha (negative defining altitude) as below the horizon", () => {
    const layout = computeDayArcLayout(baseInput());
    const fajr = layout.prayers.find((p) => p.key === "fajr")!;
    const dhuhr = layout.prayers.find((p) => p.key === "dhuhr")!;
    expect(fajr.belowHorizon).toBe(true);
    expect(dhuhr.belowHorizon).toBe(false);
  });

  it("detects at least one depression band where the stylised curve dips below zero", () => {
    const layout = computeDayArcLayout(baseInput());
    expect(layout.depressionBands.length).toBeGreaterThan(0);
    for (const band of layout.depressionBands) {
      expect(band.x2).toBeGreaterThan(band.x1);
    }
  });

  it("places every plotted point within the viewport bounds", () => {
    const layout = computeDayArcLayout(baseInput());
    const { width, archHeight } = DEFAULT_DAY_ARC_VIEWPORT;
    for (const p of layout.prayers) {
      if (!p.point) continue;
      expect(p.point.x).toBeGreaterThanOrEqual(0);
      expect(p.point.x).toBeLessThanOrEqual(width);
      expect(p.point.y).toBeGreaterThanOrEqual(0);
      expect(p.point.y).toBeLessThanOrEqual(archHeight);
    }
  });

  it("maps the qibla bearing linearly across the compass strip width", () => {
    const { width } = DEFAULT_DAY_ARC_VIEWPORT;
    const layoutAt0 = computeDayArcLayout(baseInput({ qiblaBearingDeg: 0 }));
    const layoutAt180 = computeDayArcLayout(baseInput({ qiblaBearingDeg: 180 }));
    const layoutAt360 = computeDayArcLayout(baseInput({ qiblaBearingDeg: 360 }));
    expect(layoutAt0.qiblaX).toBeCloseTo(0, 5);
    expect(layoutAt180.qiblaX).toBeCloseTo(width / 2, 5);
    expect(layoutAt360.qiblaX).toBeCloseTo(width, 5);
  });

  it("places the compass strip directly below the arc, sharing its horizon baseline", () => {
    const layout = computeDayArcLayout(baseInput());
    expect(layout.compassStripY).toBe(DEFAULT_DAY_ARC_VIEWPORT.archHeight);
    expect(layout.totalHeight).toBeGreaterThan(DEFAULT_DAY_ARC_VIEWPORT.archHeight);
  });

  it("respects a custom viewport", () => {
    const layout = computeDayArcLayout(baseInput(), { width: 480, archHeight: 140 });
    expect(layout.viewport).toEqual({ width: 480, archHeight: 140 });
  });

  it("does not throw on an empty sample list", () => {
    expect(() => computeDayArcLayout({ samples: [], prayers: [], qiblaBearingDeg: 0 })).not.toThrow();
  });
});
