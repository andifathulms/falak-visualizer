import { describe, expect, it } from "vitest";

import { computeHilalObservation } from "../visibility";
import { criterionMargin, ENGINE_TOLERANCE, formatMargin } from "../tolerance";

const JAKARTA: [number, number] = [-6.2, 106.8];

/** Eve of 1 Syawal 1445H - the evening Kemenag declared Idul Fitri from. */
const SYAWAL_1445_EVE = { year: 2024, month: 4, day: 9 };

describe("criterionMargin", () => {
  it("measures MABIMS against whichever condition has less room", () => {
    const obs = computeHilalObservation(SYAWAL_1445_EVE, ...JAKARTA);
    const m = criterionMargin(obs, "mabims_2021");

    // Altitude ~6.0 (margin +3.0), elongation ~9.7 (margin +3.3). Altitude is
    // the tighter of the two, so it is the one reported.
    expect(m.binding).toContain("altitude");
    expect(m.margin).toBeCloseTo(obs.moonAltitudeDeg - 3.0, 9);
    expect(m.verdict).toBe("met");
  });

  it("agrees with the criterion it measures", () => {
    // The margin layer must never disagree with the verdict. A positive margin
    // beyond tolerance and a "not met" verdict would mean two different
    // thresholds are in play.
    const obs = computeHilalObservation(SYAWAL_1445_EVE, ...JAKARTA);
    const m = criterionMargin(obs, "mabims_2021");
    const met = obs.moonAltitudeDeg >= 3.0 && obs.elongationDeg >= 6.4;
    expect(m.verdict === "met").toBe(met);
  });

  it("reports wujudul hilal in minutes of lag, not degrees", () => {
    const obs = computeHilalObservation(SYAWAL_1445_EVE, ...JAKARTA);
    const m = criterionMargin(obs, "wujudul_hilal");
    expect(m.unit).toBe("min");
    expect(m.margin).toBeCloseTo(obs.lagTimeMinutes ?? NaN, 9);
  });

  it("measures Odeh against its nearest classification boundary", () => {
    const obs = computeHilalObservation(SYAWAL_1445_EVE, ...JAKARTA);
    const m = criterionMargin(obs, "odeh");
    // v lands near 1.1 for this evening, whose nearest boundary is the
    // optical-aid cut at 2.0.
    expect(m.binding).toContain("2");
    expect(Math.abs(m.margin ?? Infinity)).toBeLessThan(5.65);
  });

  it("calls a verdict indeterminate when the margin is inside tolerance", () => {
    // Constructed rather than searched for: the point is the classification
    // rule, and pinning it to a real date would make the test hostage to the
    // ephemeris rather than to the logic.
    const obs = computeHilalObservation(SYAWAL_1445_EVE, ...JAKARTA);
    const onTheLine = {
      ...obs,
      moonAltitudeDeg: 3.0 + ENGINE_TOLERANCE.altitudeDeg / 2,
      elongationDeg: 20,
    };
    expect(criterionMargin(onTheLine, "mabims_2021").verdict).toBe("indeterminate");

    const clear = { ...obs, moonAltitudeDeg: 3.0 + ENGINE_TOLERANCE.altitudeDeg * 3, elongationDeg: 20 };
    expect(criterionMargin(clear, "mabims_2021").verdict).toBe("met");

    const clearlyShort = {
      ...obs,
      moonAltitudeDeg: 3.0 - ENGINE_TOLERANCE.altitudeDeg * 3,
      elongationDeg: 20,
    };
    expect(criterionMargin(clearlyShort, "mabims_2021").verdict).toBe("not_met");
  });

  it("gives no margin, and no false verdict, when conjunction is after sunset", () => {
    const obs = computeHilalObservation(SYAWAL_1445_EVE, ...JAKARTA);
    const beforeConjunction = { ...obs, conjunctionTime: obs.sunsetTime + 1 };
    const m = criterionMargin(beforeConjunction, "wujudul_hilal");
    expect(m.verdict).toBe("not_met");
    expect(m.margin).toBeNull();
    expect(m.binding).toContain("conjunction");
  });
});

describe("formatMargin", () => {
  it("signs both directions and keeps units distinct", () => {
    const base = { method: "mabims_2021" as const, verdict: "met" as const, tolerance: 0.03, binding: "x" };
    expect(formatMargin({ ...base, margin: 0.4211, unit: "deg" })).toBe("+0.42°");
    expect(formatMargin({ ...base, margin: -0.4211, unit: "deg" })).toBe("−0.42°");
    expect(formatMargin({ ...base, margin: -3.14, unit: "min" })).toBe("−3.1 min");
    expect(formatMargin({ ...base, margin: null, unit: "deg" })).toBeNull();
  });
});
