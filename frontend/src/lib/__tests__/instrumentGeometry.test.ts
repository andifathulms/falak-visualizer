import { describe, expect, it } from "vitest";
import goldenVectors from "../falak/__fixtures__/golden-vectors.json";
import { odehCriterion } from "../falak/visibility";
import {
  circleOverlapVisibleFraction,
  computeInstrumentLayout,
  crescentOffsetForIllumination,
  crescentOffsetForVisibleFraction,
  perceptualCrescentFraction,
  mabimsThresholdBand,
  odehThresholdBand,
  wujudulHilalMarkerBand,
  allThresholdBands,
  horizonReadingFromObservation,
  DEFAULT_VIEWPORT,
  MOON_RADIUS,
  type HorizonReading,
} from "../instrumentGeometry";

// Same oracle-generated fixtures the astronomy engine itself is pinned
// against (see golden.test.ts) - reused here not to re-test the engine, but
// to drive the geometry module against realistic, real-world value ranges
// rather than hand-picked round numbers.
const OBSERVATIONS = goldenVectors.visibility.observations as Array<{
  altitude?: number;
  moon_altitude_deg: number;
  sun_altitude_deg: number;
  elongation_deg: number;
  illumination_fraction: number;
  lag_time_minutes: number | null;
  crescent_width_arcmin: number | null;
  criteria: { mabims_2021: boolean; odeh: string; wujudul_hilal: boolean };
  location: string;
  date: string;
}>;

function readingFrom(o: (typeof OBSERVATIONS)[number]): HorizonReading {
  return {
    moonAltitudeDeg: o.moon_altitude_deg,
    sunAltitudeDeg: o.sun_altitude_deg,
    elongationDeg: o.elongation_deg,
    illuminationFraction: o.illumination_fraction,
    lagTimeMinutes: o.lag_time_minutes,
    crescentWidthArcmin: o.crescent_width_arcmin,
  };
}

describe("circleOverlapVisibleFraction", () => {
  it("is 0 when the circles fully coincide", () => {
    expect(circleOverlapVisibleFraction(0, 20)).toBe(0);
  });

  it("is 1 once the circles no longer overlap", () => {
    expect(circleOverlapVisibleFraction(40, 20)).toBe(1);
    expect(circleOverlapVisibleFraction(100, 20)).toBe(1);
  });

  it("is monotonically non-decreasing in the offset", () => {
    const r = 22;
    let prev = -Infinity;
    for (let d = 0; d <= 2 * r; d += 0.5) {
      const f = circleOverlapVisibleFraction(d, r);
      expect(f).toBeGreaterThanOrEqual(prev);
      prev = f;
    }
  });
});

describe("crescentOffsetForVisibleFraction (pure area geometry)", () => {
  it("round-trips through circleOverlapVisibleFraction within tight tolerance", () => {
    const fractions = [0, 0.0000147, 0.002, 0.05, 0.25, 0.5, 0.75, 0.919, 1];
    for (const f of fractions) {
      const offset = crescentOffsetForVisibleFraction(f, MOON_RADIUS);
      const back = circleOverlapVisibleFraction(offset, MOON_RADIUS);
      expect(back).toBeCloseTo(f, 3);
    }
  });

  it("is 0 at fraction 0 and 2r at fraction 1", () => {
    expect(crescentOffsetForVisibleFraction(0, MOON_RADIUS)).toBe(0);
    expect(crescentOffsetForVisibleFraction(1, MOON_RADIUS)).toBe(2 * MOON_RADIUS);
  });

  it("increases monotonically with the target fraction, unlike HilalMoon's inverted formula", () => {
    // The bug this module's own header comment documents: HilalMoon's shift
    // is LARGEST at illumination=0. This asserts the opposite - and correct
    // - direction, so a regression back to that shape fails loudly here.
    let prevOffset = -Infinity;
    for (const f of [0, 0.01, 0.1, 0.3, 0.6, 1]) {
      const offset = crescentOffsetForVisibleFraction(f, MOON_RADIUS);
      expect(offset).toBeGreaterThanOrEqual(prevOffset);
      prevOffset = offset;
    }
  });
});

describe("perceptualCrescentFraction", () => {
  it("is exact at both ends: 0 stays 0, 1 stays 1", () => {
    expect(perceptualCrescentFraction(0)).toBe(0);
    expect(perceptualCrescentFraction(1)).toBe(1);
  });

  it("is monotonically increasing", () => {
    let prev = -Infinity;
    for (const f of [0, 0.0001, 0.002, 0.01, 0.05, 0.2, 0.5, 0.9, 1]) {
      const out = perceptualCrescentFraction(f);
      expect(out).toBeGreaterThan(prev);
      prev = out;
    }
  });

  it("expands realistic hilal-scale illumination into a visually perceptible range", () => {
    // The actual bug this exists to fix: rendered against MOON_RADIUS, the
    // fixture set's real minimum (0.0000147) and a typical thin-crescent
    // value (0.002) both came out as sub-pixel offsets under literal
    // area-proportionality (crescentOffsetForVisibleFraction fed directly
    // by illumination fraction) - confirmed by looking at an actual
    // rendered preview, not assumed. This asserts the fix holds: real
    // hilal-scale values must clear a visually meaningful floor.
    const thinCrescent = 0.002; // Jakarta 2021-04-12, in golden-vectors.json
    const veryThinCrescent = 0.0000147; // the fixture set's minimum (London 2024-04-08)
    expect(perceptualCrescentFraction(thinCrescent)).toBeGreaterThan(0.15);
    expect(perceptualCrescentFraction(veryThinCrescent)).toBeGreaterThan(0.03);
    // But still meaningfully thinner than a several-percent crescent, so
    // relative order survives the compression, not just the floor.
    expect(perceptualCrescentFraction(veryThinCrescent)).toBeLessThan(
      perceptualCrescentFraction(thinCrescent),
    );
    expect(perceptualCrescentFraction(thinCrescent)).toBeLessThan(perceptualCrescentFraction(0.03));
  });
});

describe("crescentOffsetForIllumination (composed: perceptual + area geometry)", () => {
  it("produces a visually non-trivial offset for the fixture set's real minimum illumination", () => {
    const offset = crescentOffsetForIllumination(0.0000147, MOON_RADIUS);
    // Less than half a pixel would be invisible at render scale - this is
    // exactly the failure mode the perceptual layer exists to prevent.
    expect(offset).toBeGreaterThan(1);
  });

  it("is 0 at illumination 0 and 2r at illumination 1", () => {
    expect(crescentOffsetForIllumination(0, MOON_RADIUS)).toBe(0);
    expect(crescentOffsetForIllumination(1, MOON_RADIUS)).toBe(2 * MOON_RADIUS);
  });
});

describe("computeInstrumentLayout, against real observations", () => {
  it("places the moon above the horizon line exactly when its altitude is positive", () => {
    for (const o of OBSERVATIONS) {
      const layout = computeInstrumentLayout(readingFrom(o));
      // SVG y grows downward, so "above the horizon" means a smaller y.
      if (o.moon_altitude_deg > 0) {
        expect(layout.moon.y).toBeLessThan(layout.horizonY);
      } else if (o.moon_altitude_deg < 0) {
        expect(layout.moon.y).toBeGreaterThan(layout.horizonY);
      }
    }
  });

  it("keeps the sun essentially at the horizon line (evaluated at sunset)", () => {
    // Every fixture observation is evaluated at the sunset instant by
    // construction, so sun_altitude_deg always sits at ~-0.83deg - this
    // isn't something the geometry module decides, just a sanity check that
    // it doesn't mangle it.
    for (const o of OBSERVATIONS.slice(0, 20)) {
      const layout = computeInstrumentLayout(readingFrom(o));
      expect(Math.abs(layout.sun.y - layout.horizonY)).toBeLessThan(8);
      expect(layout.sun.depressionDeg).toBeCloseTo(-o.sun_altitude_deg, 5);
    }
  });

  it("never reports positionIndeterminate when lagTimeMinutes is present", () => {
    for (const o of OBSERVATIONS) {
      const layout = computeInstrumentLayout(readingFrom(o));
      expect(layout.moon.positionIndeterminate).toBe(false);
      expect(layout.lagBracket).not.toBeNull();
      expect(layout.lagBracket?.minutes).toBe(o.lag_time_minutes);
    }
  });

  it("flags positionIndeterminate rather than guessing when lagTimeMinutes is null", () => {
    const reading: HorizonReading = {
      moonAltitudeDeg: 5,
      sunAltitudeDeg: -0.83,
      elongationDeg: 8,
      illuminationFraction: 0.01,
      lagTimeMinutes: null,
      crescentWidthArcmin: null,
    };
    const layout = computeInstrumentLayout(reading);
    expect(layout.moon.positionIndeterminate).toBe(true);
    expect(layout.lagBracket).toBeNull();
    // No silent fallback (CLAUDE.md): the moon must still land somewhere
    // on-canvas so the drawing doesn't break, but it should not appear
    // offset in either direction - that would imply a lag value that
    // doesn't exist.
    expect(layout.moon.x).toBe(layout.viewport.width / 2);
  });

  it("produces a crescentOffset within [0, 2*MOON_RADIUS] for every real observation", () => {
    for (const o of OBSERVATIONS) {
      const layout = computeInstrumentLayout(readingFrom(o));
      expect(layout.moon.crescentOffset).toBeGreaterThanOrEqual(0);
      expect(layout.moon.crescentOffset).toBeLessThanOrEqual(2 * MOON_RADIUS);
    }
  });

  it("clamps the moon's drawn y-position onto the canvas for out-of-hilal-range altitude, without lying about the value", () => {
    // The fixture set's own stress case (37.4deg, a near-full moon, far
    // outside hilal territory) drove the moon off the top of the canvas
    // entirely before this clamp existed - found by rendering an actual
    // preview, not by inspecting numbers alone.
    const extreme = OBSERVATIONS.reduce((max, o) => (o.moon_altitude_deg > max.moon_altitude_deg ? o : max));
    const layout = computeInstrumentLayout(readingFrom(extreme));
    expect(layout.moon.y).toBeGreaterThan(0);
    expect(layout.moon.y).toBeLessThan(layout.viewport.height);
  });

  it("clamps the moon's drawn x-position onto the canvas for an extreme lag time, without lying about the value", () => {
    // The fixture set's own stress case has +562 minutes of lag, which
    // drove the moon 90px past the right edge of the canvas before this
    // clamp existed - found by rendering an actual preview, not by
    // inspecting numbers alone.
    const extreme = OBSERVATIONS.reduce((max, o) =>
      (o.lag_time_minutes ?? 0) > (max.lag_time_minutes ?? 0) ? o : max,
    );
    const layout = computeInstrumentLayout(readingFrom(extreme));
    expect(layout.moon.x).toBeGreaterThan(0);
    expect(layout.moon.x).toBeLessThan(layout.viewport.width);
    // The bracket's label must still show the true, unclamped value.
    expect(layout.lagBracket?.minutes).toBe(extreme.lag_time_minutes);
  });

  it("respects a custom viewport", () => {
    const reading = readingFrom(OBSERVATIONS[0]);
    const layout = computeInstrumentLayout(reading, { viewport: { width: 200, height: 90 } });
    expect(layout.viewport).toEqual({ width: 200, height: 90 });
    expect(layout.horizonY).toBeLessThan(90);
    expect(layout.horizonY).toBeGreaterThan(0);
  });
});

describe("threshold bands", () => {
  it("mabimsThresholdBand is exactly the engine's own 3deg constant, scaled", () => {
    const band = mabimsThresholdBand();
    expect(band.minAltitudeDeg).toBe(3.0);
    const layout = computeInstrumentLayout(readingFrom(OBSERVATIONS[0]), { bands: [band] });
    const rect = layout.bands[0].rect;
    expect(rect).not.toBeNull();
    // 3deg * 8px/deg = 24px, and it should sit flush on the horizon line.
    expect(rect?.height).toBe(24);
    expect(rect && rect.y + rect.height).toBeCloseTo(layout.horizonY, 5);
  });

  it("wujudulHilalMarkerBand has no rect - it isn't an altitude threshold", () => {
    const layout = computeInstrumentLayout(readingFrom(OBSERVATIONS[0]), {
      bands: [wujudulHilalMarkerBand()],
    });
    expect(layout.bands[0].rect).toBeNull();
  });

  it("odehThresholdBand's inverted altitude agrees with the engine's own odehCriterion across every observation", () => {
    // This is the real correctness check: rather than trusting the algebra
    // in isolation, cross-validate the closed-form inversion against the
    // frozen, already-validated odehCriterion for all 195 real
    // observations. If the inversion were wrong, this would catch it as a
    // verdict disagreeing with where the band says it should land.
    let visibleChecked = 0;
    let notVisibleChecked = 0;
    for (const o of OBSERVATIONS) {
      const band = odehThresholdBand(o.crescent_width_arcmin);
      expect(Number.isFinite(band.minAltitudeDeg)).toBe(true);
      const verdict = odehCriterion(o.moon_altitude_deg, o.elongation_deg, o.crescent_width_arcmin);
      expect(verdict).toBe(o.criteria.odeh);
      if (verdict === "visible") {
        expect(o.moon_altitude_deg).toBeGreaterThanOrEqual((band.minAltitudeDeg as number) - 1e-6);
        visibleChecked += 1;
      } else if (verdict === "not_visible") {
        expect(o.moon_altitude_deg).toBeLessThan((band.minAltitudeDeg as number) + 1e-6);
        notVisibleChecked += 1;
      }
    }
    // Guard against the fixture set silently losing coverage of either arm.
    expect(visibleChecked).toBeGreaterThan(0);
    expect(notVisibleChecked).toBeGreaterThan(0);
  });
});

describe("allThresholdBands", () => {
  it("returns wujudul hilal, MABIMS, then Odeh, in that order", () => {
    const bands = allThresholdBands(0.9);
    expect(bands.map((b) => b.key)).toEqual(["wujudul_hilal", "mabims_2021", "odeh"]);
  });
});

describe("horizonReadingFromObservation", () => {
  it("maps every real fixture observation's snake_case fields without loss", () => {
    for (const o of OBSERVATIONS) {
      const reading = horizonReadingFromObservation(o);
      expect(reading.moonAltitudeDeg).toBe(o.moon_altitude_deg);
      expect(reading.sunAltitudeDeg).toBe(o.sun_altitude_deg);
      expect(reading.elongationDeg).toBe(o.elongation_deg);
      expect(reading.illuminationFraction).toBe(o.illumination_fraction);
      expect(reading.lagTimeMinutes).toBe(o.lag_time_minutes);
      expect(reading.crescentWidthArcmin).toBe(o.crescent_width_arcmin);
    }
  });
});

describe("DEFAULT_VIEWPORT", () => {
  it("is wide relative to its height, matching a horizon schematic rather than a square icon", () => {
    expect(DEFAULT_VIEWPORT.width).toBeGreaterThan(DEFAULT_VIEWPORT.height * 1.5);
  });
});
