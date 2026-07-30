/**
 * Tests for the data layer that replaced the HTTP API.
 *
 * The golden-vector suite proves the engine computes the right numbers. This
 * proves the thin layer above it hands those numbers to the pages in the same
 * shape the Django/DRF responses did - because the pages were left untouched and
 * are still parsing them the same way.
 *
 * The timestamp format gets its own test for a specific reason: the pages call
 * `new Date(observation.sunset_time_utc)`, and JavaScript reads an ISO string
 * with no zone designator as *local* time. DRF emitted a trailing `Z`, so that
 * worked. Drop the `Z` here and every displayed time silently shifts by the
 * viewer's UTC offset - seven hours in Jakarta - while still looking plausible.
 */
import { describe, expect, it } from "vitest";

import vectors from "../falak/__fixtures__/golden-vectors.json";

import {
  ApiError,
  convertDate,
  fetchHilalVisibility,
  fetchIsbatAccuracy,
  fetchMethodDivergence,
  fetchPrayerTimes,
  fetchPrayerTimesMonth,
  fetchQibla,
  fetchRashdulQibla,
  fetchVisibilityCalendar,
} from "../api";

/** Jakarta, the converter's reference location - matches the fixture defaults. */
const JAKARTA = { lat: -6.2, lon: 106.8 };

describe("timestamp format", () => {
  it("emits UTC-designated ISO strings the pages can parse with new Date()", async () => {
    const result = await fetchHilalVisibility({ date: "2024-04-08", ...JAKARTA });

    for (const [field, value] of [
      ["conjunction_time_utc", result.conjunction_time_utc],
      ["sunset_time_utc", result.sunset_time_utc],
      ["moonset_time_utc", result.moonset_time_utc],
    ] as Array<[string, string | null]>) {
      if (value === null) continue;
      expect(value, `${field} must be explicitly UTC`).toMatch(/Z$/);
      expect(Number.isNaN(new Date(value).getTime()), `${field} must parse`).toBe(false);
    }
  });

  it("agrees with the oracle's own timestamps to the second", async () => {
    const expected = vectors.visibility.observations.find(
      (o) => o.date === "2024-04-08" && o.location === "Jakarta",
    );
    expect(expected, "fixture case present").toBeDefined();

    const result = await fetchHilalVisibility({ date: "2024-04-08", ...JAKARTA });

    // The fixture stores Python's naive-UTC isoformat; appending Z makes the
    // comparison explicit rather than relying on the parser's default.
    for (const [actual, want] of [
      [result.sunset_time_utc, expected!.sunset_time],
      [result.conjunction_time_utc, expected!.conjunction_time],
      [result.moonset_time_utc, expected!.moonset_time],
    ] as Array<[string | null, string | null]>) {
      if (want === null) {
        expect(actual).toBeNull();
        continue;
      }
      expect(new Date(actual as string).getTime()).toBe(new Date(`${want}Z`).getTime());
    }
  });
});

describe("payload shapes", () => {
  it("returns the converter payload the page expects", async () => {
    const g2h = await convertDate({ direction: "gregorian_to_hijri", date: "2024-03-12" });
    expect(g2h).toMatchObject({
      direction: "gregorian_to_hijri",
      method: "mabims_2021",
      input_date: "2024-03-12",
      hijri_year: 1445,
      hijri_month: 9,
      hijri_day: 1,
      hijri_month_name: "Ramadhan",
    });

    const h2g = await convertDate({
      direction: "hijri_to_gregorian",
      hijri_year: 1445,
      hijri_month: 9,
      hijri_day: 1,
    });
    expect(h2g.gregorian_date).toBe("2024-03-12");
  });

  it("returns hilal criteria as booleans plus the Odeh string", async () => {
    const result = await fetchHilalVisibility({ date: "2024-04-08", ...JAKARTA });
    expect(typeof result.criteria.wujudul_hilal).toBe("boolean");
    expect(typeof result.criteria.mabims_2021).toBe("boolean");
    expect(["visible", "visible_optical_aid", "marginal", "not_visible"]).toContain(
      result.criteria.odeh,
    );
    // 13 samples across a +/-30 minute window in 5 minute steps.
    expect(result.trajectory).toHaveLength(13);
    expect(result.trajectory[0].minutes_from_sunset).toBe(-30);
    expect(result.trajectory[12].minutes_from_sunset).toBe(30);
  });

  it("returns a full month of prayer times, including a leap February", async () => {
    const february = await fetchPrayerTimesMonth({ year: 2024, month: 2, ...JAKARTA });
    expect(february.days).toHaveLength(29);
    expect(february.days[28].date).toBe("2024-02-29");

    const daily = await fetchPrayerTimes({ date: "2024-02-29", ...JAKARTA });
    expect(daily.convention).toBe("Kemenag RI");
    expect(daily).toEqual(february.days[28]);
  });

  it("returns qibla bearing and distance", async () => {
    const result = await fetchQibla(JAKARTA);
    const expected = vectors.qibla.directions.find((d) => d.location === "Jakarta");
    expect(result.bearing_deg).toBeCloseTo(expected!.bearing_deg, 9);
    expect(result.distance_km).toBeCloseTo(expected!.distance_km, 9);
  });

  it("attaches the local bearing to Rashdul Qibla events only when given a location", async () => {
    const withLocation = await fetchRashdulQibla({ year: 2026, ...JAKARTA });
    expect(withLocation.events.length).toBeGreaterThan(0);
    expect(withLocation.events[0].bearing_deg).toBeDefined();

    const withoutLocation = await fetchRashdulQibla({ year: 2026 });
    expect(withoutLocation.events[0].bearing_deg).toBeUndefined();
  });

  it("returns twelve months of divergence with a diverges flag", async () => {
    const result = await fetchMethodDivergence({ hijri_year: 1446 });
    expect(result.months).toHaveLength(12);
    for (const month of result.months) {
      expect(month.errors).toBeNull();
      expect(typeof month.diverges).toBe("boolean");
      expect(Object.keys(month.start_dates).sort()).toEqual([
        "mabims_2021",
        "odeh",
        "wujudul_hilal",
      ]);
    }
  });

  it("returns twelve calendar months carrying the selected method's verdict", async () => {
    const result = await fetchVisibilityCalendar({ hijri_year: 1446, method: "odeh" });
    expect(result.months).toHaveLength(12);
    for (const month of result.months) {
      expect(month.error).toBeUndefined();
      expect(typeof month.verdict).toBe("string");
    }
  });

  it("returns an empty isbat comparison until records are sourced", async () => {
    // The Django seed migration shipped with SEED_RECORDS = [] pending citable
    // Kemenag sources; the port carries that state over rather than inventing
    // rows, so this asserting zero is correct, not a gap in the test.
    const result = await fetchIsbatAccuracy({});
    expect(result.count).toBe(0);
    expect(result.records).toEqual([]);
  });
});

describe("input validation", () => {
  it("rejects a bad date with the message the view used to return", async () => {
    await expect(fetchPrayerTimes({ date: "12-03-2024", ...JAKARTA })).rejects.toThrow(ApiError);
    await expect(fetchPrayerTimes({ date: "12-03-2024", ...JAKARTA })).rejects.toThrow(
      /must be an ISO date/,
    );
  });

  it("rejects an unknown convention and lists the supported ones", async () => {
    await expect(
      fetchPrayerTimes({ date: "2024-04-08", ...JAKARTA, convention: "Umm al-Qura" }),
    ).rejects.toThrow(/not recognized; supported: ISNA, Kemenag RI, Muslim World League/);
  });

  it("rejects an unknown visibility method", async () => {
    await expect(
      fetchVisibilityCalendar({ hijri_year: 1446, method: "yallop" as never }),
    ).rejects.toThrow(/not recognized/);
  });

  it("rejects a converter method the MVP does not implement", async () => {
    await expect(
      convertDate({ direction: "gregorian_to_hijri", date: "2024-03-12", method: "odeh" }),
    ).rejects.toThrow(/only mabims_2021 is implemented/);
  });

  it("rejects an out-of-range month", async () => {
    await expect(fetchPrayerTimesMonth({ year: 2024, month: 13, ...JAKARTA })).rejects.toThrow(
      /month must be between 1 and 12/,
    );
  });

  it("rejects a missing direction", async () => {
    await expect(
      convertDate({ direction: "sideways" as never, date: "2024-03-12" }),
    ).rejects.toThrow(/must be 'gregorian_to_hijri' or 'hijri_to_gregorian'/);
  });

  it("carries the status code the HTTP version used", async () => {
    await expect(fetchPrayerTimes({ date: "nope", ...JAKARTA })).rejects.toMatchObject({
      status: 400,
    });
  });
});
