import { describe, expect, it } from "vitest";
import { conjunctionForHijriMonth, monthStartTrace } from "../converter";
import { formatPlainDate } from "../time";

describe("monthStartTrace ijtimak gate", () => {
  it("does not tick 'ijtimak before sunset' on an evening before this month's ijtimak", () => {
    // Jumadilawal 1448: ijtimak 2026-10-10 15:51 UTC (22:51 WIB), after that
    // evening's sunset in Jakarta. The gate once compared against the previous
    // month's conjunction and passed.
    const conj = conjunctionForHijriMonth(1448, 5);
    const trace = monthStartTrace(conj, "wujudul_hilal", -6.2088, 106.8456);
    expect(formatPlainDate(trace.steps[0].evening)).toBe("2026-10-10");
    expect(trace.steps[0].conjunctionBeforeSunset).toBe(false);
    expect(trace.steps[0].criterionMet).toBe(false);
    expect(trace.steps[1].conjunctionBeforeSunset).toBe(true);
    expect(formatPlainDate(trace.start)).toBe("2026-10-12");
  });
});

describe("Wujudul Hilal needs this month's ijtimak", () => {
  it("starts Ramadan 1439 in Jakarta on 17 May 2018, not the pre-ijtimak 16 May", () => {
    const trace = monthStartTrace(conjunctionForHijriMonth(1439, 9), "wujudul_hilal", -6.2088, 106.8456);
    expect(formatPlainDate(trace.start)).toBe("2018-05-17");
  });
});
