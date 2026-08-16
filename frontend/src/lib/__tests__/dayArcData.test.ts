import { describe, expect, it } from "vitest";
import { buildDayArcInput } from "../dayArcData";
import { KEMENAG_RI } from "../falak/prayerTimes";
import { qiblaDirection } from "../falak/qibla";
import { parsePlainDate } from "../falak/time";
import { INDONESIAN_CITIES } from "../locations";

function city(name: string) {
  const c = INDONESIAN_CITIES.find((x) => x.name === name);
  if (!c) throw new Error(`fixture city not found: ${name}`);
  return c;
}

describe("buildDayArcInput", () => {
  it("produces a sane same-day set of samples/prayers for an unremarkable case", () => {
    const jakarta = city("Jakarta");
    const bearing = qiblaDirection(jakarta.lat, jakarta.lon).bearingDeg;
    const input = buildDayArcInput(parsePlainDate("2026-06-15"), jakarta.lat, jakarta.lon, KEMENAG_RI, bearing);
    expect(input.samples.length).toBeGreaterThan(0);
    expect(input.prayers).toHaveLength(6);
  });

  /**
   * Regression test for a real defect in the frozen engine's
   * findHorizonCrossing (lib/falak/horizon.ts), discovered while building
   * DayArc - see dayArcData.ts's assertSameCivilDay doc comment for the
   * full explanation. This is not a synthetic edge case: these are real
   * coordinates from lib/locations.ts and a real date. The engine itself
   * is frozen and out of scope to fix here; this test only pins the
   * presentation-layer guard that keeps the bad value from being plotted
   * silently. If this test ever starts failing because dailyPrayerTimes
   * stops reproducing the bug, that's good news - the guard just becomes
   * inert, not wrong - but the test should be revisited rather than
   * deleted reflexively.
   */
  it("throws rather than plotting a mis-dated prayer instant (Banda Aceh, 2026-06-15)", () => {
    const bandaAceh = city("Banda Aceh");
    const bearing = qiblaDirection(bandaAceh.lat, bandaAceh.lon).bearingDeg;
    expect(() =>
      buildDayArcInput(parsePlainDate("2026-06-15"), bandaAceh.lat, bandaAceh.lon, KEMENAG_RI, bearing),
    ).toThrow(/dailyPrayerTimes returned/);
  });
});
