import { describe, expect, it } from "vitest";
import {
  computeBoundaryRibbonLayout,
  LANES,
  DEFAULT_RIBBON_VIEWPORT,
  type BoundaryPoint,
} from "../boundaryRibbonGeometry";

function point(overrides: Partial<BoundaryPoint> = {}): BoundaryPoint {
  return {
    hijriMonth: 1,
    hijriMonthName: "Muharram",
    methodOffsetDays: { wujudul_hilal: 0, mabims_2021: 0, odeh: 0 },
    isbatOffsetDays: 0,
    mabimsStartDate: "2025-07-01",
    ...overrides,
  };
}

function twelveMonths(overrides: Partial<BoundaryPoint> = {}): BoundaryPoint[] {
  return Array.from({ length: 12 }, (_, i) => point({ hijriMonth: i + 1, ...overrides }));
}

describe("computeBoundaryRibbonLayout", () => {
  it("spaces twelve boundaries evenly across the ribbon width", () => {
    const layout = computeBoundaryRibbonLayout(twelveMonths());
    expect(layout.boundaries).toHaveLength(12);
    expect(layout.segmentWidth).toBeCloseTo(DEFAULT_RIBBON_VIEWPORT.width / 12, 5);
    layout.boundaries.forEach((b, i) => {
      expect(b.segmentX).toBeCloseTo(i * layout.segmentWidth, 5);
    });
  });

  it("marks a boundary merged when every resolved method and isbat agree (offset 0)", () => {
    const layout = computeBoundaryRibbonLayout(twelveMonths());
    for (const b of layout.boundaries) {
      expect(b.merged).toBe(true);
    }
  });

  it("marks a boundary split when methods disagree", () => {
    const layout = computeBoundaryRibbonLayout(
      twelveMonths({ methodOffsetDays: { wujudul_hilal: 1, mabims_2021: 0, odeh: -1 } }),
    );
    for (const b of layout.boundaries) {
      expect(b.merged).toBe(false);
    }
  });

  it("produces exactly one tick per lane (3 methods + isbat) per boundary", () => {
    const layout = computeBoundaryRibbonLayout(twelveMonths());
    for (const b of layout.boundaries) {
      expect(b.ticks).toHaveLength(LANES.length + 1);
      expect(new Set(b.ticks.map((t) => t.lane)).size).toBe(LANES.length + 1);
    }
  });

  it("flags an unresolved method as unresolved rather than defaulting its offset to 0", () => {
    const layout = computeBoundaryRibbonLayout(
      twelveMonths({ methodOffsetDays: { mabims_2021: 0, odeh: 0 } }), // wujudul_hilal absent
    );
    const wujudulTick = layout.boundaries[0].ticks.find((t) => t.lane === "wujudul_hilal")!;
    expect(wujudulTick.resolved).toBe(false);
    expect(wujudulTick.offsetDays).toBeNull();
    // An unresolved method must not silently count as "agreeing" with the rest.
    expect(layout.boundaries[0].merged).toBe(true); // the other 3 still agree with each other
  });

  it("has no isbat tick position drift when isbatOffsetDays is null", () => {
    const layout = computeBoundaryRibbonLayout(twelveMonths({ isbatOffsetDays: null }));
    const isbatTick = layout.boundaries[0].ticks.find((t) => t.lane === "isbat")!;
    expect(isbatTick.resolved).toBe(false);
    expect(isbatTick.offsetDays).toBeNull();
  });

  it("clamps extreme offsets so a boundary's ticks never bleed into a neighbouring segment", () => {
    const layout = computeBoundaryRibbonLayout(
      twelveMonths({ methodOffsetDays: { wujudul_hilal: 30, mabims_2021: 0, odeh: -30 } }),
      { viewport: { width: 960, height: 160 } },
    );
    const segmentWidth = 960 / 12;
    for (const b of layout.boundaries) {
      for (const t of b.ticks) {
        expect(Math.abs(t.x - b.segmentX)).toBeLessThan(segmentWidth / 2);
      }
    }
  });

  it("respects a custom viewport", () => {
    const layout = computeBoundaryRibbonLayout(twelveMonths(), { viewport: { width: 480, height: 100 } });
    expect(layout.viewport).toEqual({ width: 480, height: 100 });
    expect(layout.segmentWidth).toBeCloseTo(40, 5);
  });
});
