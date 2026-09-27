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
   * Regression test for a real defect in findHorizonCrossing
   * (lib/falak/horizon.ts): it compared candidate crossings modulo 24h
   * inside a 36h window, so the requested day's fajr and the next day's
   * could tie and the wrong one won. Banda Aceh on 2026-06-15 and Jakarta
   * on 2026-09-27 both hit it. This test used to pin the presentation
   * guard (assertSameCivilDay) that refused to plot the bad value; the
   * engine is now fixed, so these cases must build cleanly. The guard stays
   * in dayArcData.ts as a backstop.
   */
  it.each([
    ["Banda Aceh", "2026-06-15"],
    ["Jakarta", "2026-09-27"],
  ])("builds a same-day arc for %s on %s (formerly a mis-dated fajr)", (name, iso) => {
    const c = city(name);
    const bearing = qiblaDirection(c.lat, c.lon).bearingDeg;
    const input = buildDayArcInput(parsePlainDate(iso), c.lat, c.lon, KEMENAG_RI, bearing);
    expect(input.prayers).toHaveLength(6);
  });
});
