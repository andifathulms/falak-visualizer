/**
 * Conformance suite: the TypeScript engine must reproduce the Python engine.
 *
 * backend/falak is the validated oracle - it is what was cross-checked against
 * JPL DE440 via Skyfield and against Meeus' worked examples. This file replays
 * the inputs frozen in __fixtures__/golden-vectors.json through the port and
 * fails on any deviation beyond tolerance, so the two implementations cannot
 * drift apart unnoticed.
 *
 * Regenerate the fixture after any change to the Python engine:
 *
 *     cd backend && python3 scripts/generate_golden_vectors.py
 *
 * Tolerances are deliberately tight. They are not "close enough for a religious
 * calendar" allowances - in practice the two engines agree to the last digit on
 * every vector here, and the remaining slack only exists so a different libm
 * (Linux CI, another CPU) cannot fail the build over a last-ulp difference in
 * sin/cos/atan2:
 *
 *   - Angles, distances and dimensionless ratios: 1e-9.
 *   - Instants: 1 microsecond, which is the resolution Python's `datetime`
 *     itself stores. Anything looser would hide a real bug: see the note in
 *     time.ts on why sub-microsecond drift in a bisected sunset re-emerges as
 *     ~1e-7 degrees of altitude, which is enough to flip a threshold verdict.
 *   - Verdicts, dates and classification strings: exact. A criterion landing on
 *     the other side of a threshold is a correctness bug, never a tolerance
 *     question.
 */
import { describe, expect, it } from "vitest";

import vectors from "../__fixtures__/golden-vectors.json";

import { generateHijriYear } from "../archive";
import {
  conjunctionNear,
  nextConjunction,
  previousConjunction,
} from "../conjunction";
import {
  gregorianToHijri,
  hijriToGregorian,
  HIJRI_MONTH_NAMES,
  monthStartDateForMethod,
  observationForMonth,
  ANCHOR,
} from "../converter";
import {
  gridCoordinates,
  verdictFor,
  GRID_LAT_RANGE,
  GRID_LON_RANGE,
  GRID_STEP_DEG,
} from "../grid";
import {
  altitudeDeg,
  apparentSiderealTimeDeg,
  equatorialFromEcliptic,
} from "../horizon";
import {
  argumentOfLatitude,
  eccentricityCorrection,
  illuminatedFraction,
  lunarPosition,
  meanElongation,
  meanLongitude,
  moonMeanAnomaly,
  sunMeanAnomaly,
} from "../lunar";
import { CONVENTIONS, dailyPrayerTimes, solarTransit } from "../prayerTimes";
import { qiblaDirection, rashdulQiblaEvents } from "../qibla";
import {
  eccentricity,
  equationOfCenter,
  equationOfTimeMinutes,
  geometricMeanLongitude,
  meanAnomaly,
  obliquityOfEcliptic,
  solarPosition,
} from "../solar";
import { deltaTSeconds, instantFromJulianDay, julianCenturies, julianDay } from "../timescale";
import {
  formatPlainDate,
  parseInstant,
  parsePlainDate,
  plainDateOf,
  type Instant,
  type PlainDate,
} from "../time";
import {
  computeHilalObservation,
  evaluateCriteria,
  hilalTrajectory,
  mabims2021,
  odehCriterion,
  wujudulHilal,
  type HilalMethod,
} from "../visibility";

const ANGLE_TOLERANCE = 1e-9;
const TIME_TOLERANCE_US = 1;

/** Compare a computed instant against a fixture's ISO string. */
function expectInstant(actual: Instant | null, expected: string | null, label: string) {
  if (expected === null) {
    expect(actual, label).toBeNull();
    return;
  }
  expect(actual, label).not.toBeNull();
  expect(Math.abs((actual as number) - parseInstant(expected)), label).toBeLessThanOrEqual(
    TIME_TOLERANCE_US,
  );
}

function expectClose(actual: number, expected: number, label: string, tolerance = ANGLE_TOLERANCE) {
  expect(Math.abs(actual - expected), `${label} (got ${actual}, want ${expected})`).toBeLessThanOrEqual(
    tolerance,
  );
}

describe("timescale", () => {
  it("matches Julian Day and its inverse", () => {
    for (const c of vectors.timescale.cases) {
      const instant = parseInstant(c.datetime);
      expectClose(julianDay(instant), c.julian_day, `julianDay ${c.datetime}`, 1e-12);
      expectClose(
        julianCenturies(julianDay(instant)),
        c.julian_centuries,
        `julianCenturies ${c.datetime}`,
        1e-15,
      );
      expectInstant(
        instantFromJulianDay(julianDay(instant)),
        c.roundtrip,
        `roundtrip ${c.datetime}`,
      );
    }
  });

  it("matches the JD inverse across the calendar-reform branch", () => {
    for (const c of vectors.timescale.inverse) {
      expectInstant(instantFromJulianDay(c.julian_day), c.datetime, `inverse ${c.julian_day}`);
    }
  });

  it("matches Delta T in every branch of the piecewise fit", () => {
    for (const c of vectors.timescale.delta_t) {
      expectClose(deltaTSeconds(c.year), c.delta_t_seconds, `deltaT ${c.year}`, 1e-9);
    }
  });
});

describe("solar", () => {
  it("matches each series term", () => {
    for (const c of vectors.solar.terms) {
      expectClose(geometricMeanLongitude(c.t), c.geometric_mean_longitude, `L0 ${c.datetime}`);
      expectClose(meanAnomaly(c.t), c.mean_anomaly, `M ${c.datetime}`);
      expectClose(eccentricity(c.t), c.eccentricity, `e ${c.datetime}`);
      expectClose(
        equationOfCenter(c.t, c.mean_anomaly),
        c.equation_of_center,
        `C ${c.datetime}`,
      );
      expectClose(obliquityOfEcliptic(c.t), c.obliquity_of_ecliptic, `eps0 ${c.datetime}`);
    }
  });

  it("matches the assembled apparent position", () => {
    for (const c of vectors.solar.cases) {
      const p = solarPosition(parseInstant(c.datetime));
      expectClose(p.geometricMeanLongitudeDeg, c.geometric_mean_longitude_deg, `L0 ${c.datetime}`);
      expectClose(p.meanAnomalyDeg, c.mean_anomaly_deg, `M ${c.datetime}`);
      expectClose(p.trueAnomalyDeg, c.true_anomaly_deg, `nu ${c.datetime}`);
      expectClose(p.trueLongitudeDeg, c.true_longitude_deg, `true lon ${c.datetime}`);
      expectClose(p.apparentLongitudeDeg, c.apparent_longitude_deg, `app lon ${c.datetime}`);
      expectClose(p.radiusVectorAu, c.radius_vector_au, `R ${c.datetime}`);
      expectClose(
        p.apparentRightAscensionDeg,
        c.apparent_right_ascension_deg,
        `RA ${c.datetime}`,
      );
      expectClose(p.apparentDeclinationDeg, c.apparent_declination_deg, `Dec ${c.datetime}`);
      expectClose(p.apparentObliquityDeg, c.apparent_obliquity_deg, `eps ${c.datetime}`);
      expectClose(
        equationOfTimeMinutes(parseInstant(c.datetime)),
        c.equation_of_time_minutes,
        `EoT ${c.datetime}`,
      );
    }
  });
});

describe("lunar", () => {
  it("matches each fundamental argument", () => {
    for (const c of vectors.lunar.terms) {
      expectClose(meanLongitude(c.t), c.mean_longitude, `L' ${c.datetime}`);
      expectClose(meanElongation(c.t), c.mean_elongation, `D ${c.datetime}`);
      expectClose(sunMeanAnomaly(c.t), c.sun_mean_anomaly, `M ${c.datetime}`);
      expectClose(moonMeanAnomaly(c.t), c.moon_mean_anomaly, `M' ${c.datetime}`);
      expectClose(argumentOfLatitude(c.t), c.argument_of_latitude, `F ${c.datetime}`);
      expectClose(eccentricityCorrection(c.t), c.eccentricity_correction, `E ${c.datetime}`);
    }
  });

  it("matches position, distance and illuminated fraction", () => {
    for (const c of vectors.lunar.cases) {
      const instant = parseInstant(c.datetime);
      const moon = lunarPosition(instant);
      expectClose(moon.apparentLongitudeDeg, c.apparent_longitude_deg, `lon ${c.datetime}`);
      expectClose(moon.eclipticLatitudeDeg, c.ecliptic_latitude_deg, `lat ${c.datetime}`);
      // 1e-9 km on a ~385,000 km distance is agreement to a nanometre - far
      // beyond what the truncated series resolves, and the port hits it anyway.
      expectClose(moon.distanceKm, c.distance_km, `distance ${c.datetime}`, 1e-9);
      expectClose(
        moon.horizontalParallaxDeg,
        c.horizontal_parallax_deg,
        `parallax ${c.datetime}`,
      );
      expectClose(
        illuminatedFraction(solarPosition(instant).apparentLongitudeDeg, moon),
        c.illuminated_fraction,
        `k ${c.datetime}`,
      );
    }
  });
});

describe("horizon", () => {
  it("matches apparent sidereal time, including pre-J2000 dates", () => {
    for (const c of vectors.horizon.sidereal) {
      expectClose(
        apparentSiderealTimeDeg(c.julian_day),
        c.apparent_sidereal_time_deg,
        `theta0 ${c.datetime}`,
        1e-8,
      );
    }
  });

  it("matches the ecliptic-to-equatorial conversion in every quadrant", () => {
    for (const c of vectors.horizon.equatorial_from_ecliptic) {
      const [ra, dec] = equatorialFromEcliptic(c.lon_deg, c.lat_deg, c.obliquity_deg);
      expectClose(ra, c.ra_deg, `RA ${c.lon_deg}/${c.lat_deg}`);
      expectClose(dec, c.dec_deg, `Dec ${c.lon_deg}/${c.lat_deg}`);
    }
  });

  it("matches topocentric altitude", () => {
    for (const c of vectors.horizon.altitudes) {
      expectClose(
        altitudeDeg(c.ra_deg, c.dec_deg, c.lat_deg, c.lon_deg, julianDay(parseInstant(c.datetime))),
        c.altitude_deg,
        `alt ${c.location} ${c.datetime}`,
        1e-8,
      );
    }
  });
});

describe("conjunction", () => {
  it("matches conjunctionNear", () => {
    for (const c of vectors.conjunction.near) {
      expectInstant(conjunctionNear(parseInstant(c.datetime)), c.conjunction, `near ${c.datetime}`);
    }
  });

  it("matches nextConjunction", () => {
    for (const c of vectors.conjunction.next) {
      expectInstant(nextConjunction(parseInstant(c.datetime)), c.conjunction, `next ${c.datetime}`);
    }
  });

  it("matches previousConjunction", () => {
    for (const c of vectors.conjunction.previous) {
      expectInstant(
        previousConjunction(parseInstant(c.datetime)),
        c.conjunction,
        `previous ${c.datetime}`,
      );
    }
  });

  it("matches a contiguous 36-month chain", () => {
    let cursor = parseInstant("2023-01-01T00:00:00");
    vectors.conjunction.chain.forEach((expected, index) => {
      cursor = nextConjunction(cursor);
      expectInstant(cursor, expected, `chain step ${index}`);
    });
  });
});

describe("visibility criteria", () => {
  it("matches MABIMS 2021 exactly, including on-threshold inputs", () => {
    for (const c of vectors.visibility.mabims_2021) {
      expect(
        mabims2021(c.altitude_deg, c.elongation_deg),
        `mabims ${c.altitude_deg}/${c.elongation_deg}`,
      ).toBe(c.result);
    }
  });

  it("matches the Odeh classification exactly", () => {
    for (const c of vectors.visibility.odeh) {
      expect(
        odehCriterion(c.altitude_deg, c.elongation_deg, c.crescent_width_arcmin),
        `odeh ${c.altitude_deg}/${c.elongation_deg}/${c.crescent_width_arcmin}`,
      ).toBe(c.result);
    }
  });

  it("matches wujudul hilal, including the no-moonset case", () => {
    for (const c of vectors.visibility.wujudul_hilal) {
      expect(
        wujudulHilal(
          c.moonset === null ? null : parseInstant(c.moonset),
          parseInstant(c.sunset),
          parseInstant(c.conjunction),
        ),
        `wujudul ${c.moonset}/${c.sunset}/${c.conjunction}`,
      ).toBe(c.result);
    }
  });
});

describe("hilal observations", () => {
  it("matches every observational quantity and verdict", () => {
    for (const c of vectors.visibility.observations) {
      const label = `${c.date} ${c.location}`;
      const date = parsePlainDate(c.date);

      if ("error" in c) {
        expect(() => computeHilalObservation(date, c.lat, c.lon), label).toThrow();
        continue;
      }

      const obs = computeHilalObservation(date, c.lat, c.lon);
      expectInstant(obs.conjunctionTime, c.conjunction_time, `conjunction ${label}`);
      expectInstant(obs.sunsetTime, c.sunset_time, `sunset ${label}`);
      expectInstant(obs.moonsetTime, c.moonset_time, `moonset ${label}`);
      expectClose(obs.moonAltitudeDeg, c.moon_altitude_deg, `moon alt ${label}`, 1e-9);
      expectClose(obs.sunAltitudeDeg, c.sun_altitude_deg, `sun alt ${label}`, 1e-9);
      expectClose(obs.elongationDeg, c.elongation_deg, `elongation ${label}`, 1e-9);
      expectClose(obs.moonAgeHours, c.moon_age_hours, `moon age ${label}`, 1e-9);
      expectClose(obs.illuminationFraction, c.illumination_fraction, `illumination ${label}`, 1e-9);
      expectClose(obs.crescentWidthArcmin, c.crescent_width_arcmin, `width ${label}`, 1e-9);
      if (c.lag_time_minutes === null) {
        expect(obs.lagTimeMinutes, `lag ${label}`).toBeNull();
      } else {
        expectClose(obs.lagTimeMinutes as number, c.lag_time_minutes, `lag ${label}`, 1e-9);
      }

      // The verdicts are the product's actual output; they must be identical,
      // not merely close.
      expect(evaluateCriteria(obs), `criteria ${label}`).toEqual(c.criteria);
    }
  });

  it("matches the sunset-window trajectory", () => {
    for (const c of vectors.visibility.trajectories) {
      const label = `${c.date} ${c.location}`;
      const date = parsePlainDate(c.date);

      if ("error" in c) {
        expect(() => hilalTrajectory(date, c.lat, c.lon), label).toThrow();
        continue;
      }

      const points = hilalTrajectory(date, c.lat, c.lon);
      expect(points.length, `point count ${label}`).toBe(c.points.length);
      points.forEach((point, index) => {
        const expected = c.points[index];
        expectInstant(point.time, expected.time, `time ${label}[${index}]`);
        expectClose(
          point.minutesFromSunset,
          expected.minutes_from_sunset,
          `offset ${label}[${index}]`,
          1e-9,
        );
        expectClose(
          point.moonAltitudeDeg,
          expected.moon_altitude_deg,
          `moon alt ${label}[${index}]`,
          1e-8,
        );
        expectClose(
          point.sunAltitudeDeg,
          expected.sun_altitude_deg,
          `sun alt ${label}[${index}]`,
          1e-8,
        );
        expectClose(
          point.elongationDeg,
          expected.elongation_deg,
          `elongation ${label}[${index}]`,
          1e-8,
        );
      });
    }
  });
});

describe("qibla", () => {
  it("matches bearing and distance, including the poles and antimeridian", () => {
    for (const c of vectors.qibla.directions) {
      const result = qiblaDirection(c.lat, c.lon);
      expectClose(result.bearingDeg, c.bearing_deg, `bearing ${c.location}`);
      expectClose(result.distanceKm, c.distance_km, `distance ${c.location}`, 1e-9);
    }
  });

  it("matches the Rashdul Qibla instants", () => {
    for (const c of vectors.qibla.rashdul) {
      const events = rashdulQiblaEvents(c.year);
      expect(events.length, `event count ${c.year}`).toBe(c.events.length);
      events.forEach((event, index) => {
        expectInstant(event.utcTime, c.events[index].utc_time, `rashdul ${c.year}[${index}]`);
        expect(event.direction, `direction ${c.year}[${index}]`).toBe(c.events[index].direction);
      });
    }
  });
});

describe("prayer times", () => {
  it("matches the convention presets", () => {
    for (const c of vectors.prayer_times.conventions) {
      const convention = CONVENTIONS[c.name];
      expect(convention, `convention ${c.name}`).toBeDefined();
      expect(convention.fajrAngleDeg).toBe(c.fajr_angle_deg);
      expect(convention.ishaAngleDeg).toBe(c.isha_angle_deg);
      expect(convention.asrShadowFactor).toBe(c.asr_shadow_factor);
      expect(convention.dhuhrCorrectionMinutes).toBe(c.dhuhr_correction_minutes);
    }
  });

  it("matches solar transit", () => {
    for (const c of vectors.prayer_times.solar_transit) {
      expectInstant(
        solarTransit(parsePlainDate(c.date), c.lon),
        c.solar_transit,
        `transit ${c.date} ${c.location}`,
      );
    }
  });

  it("matches every daily prayer time under every convention", () => {
    for (const c of vectors.prayer_times.daily) {
      const label = `${c.date} ${c.location} ${c.convention}`;
      const result = dailyPrayerTimes(
        parsePlainDate(c.date),
        c.lat,
        c.lon,
        CONVENTIONS[c.convention],
      );
      expectInstant(result.fajr, c.fajr, `fajr ${label}`);
      expectInstant(result.sunrise, c.sunrise, `sunrise ${label}`);
      expectInstant(result.dhuhr, c.dhuhr, `dhuhr ${label}`);
      expectInstant(result.asr, c.asr, `asr ${label}`);
      expectInstant(result.maghrib, c.maghrib, `maghrib ${label}`);
      expectInstant(result.isha, c.isha, `isha ${label}`);
    }
  });
});

describe("converter", () => {
  it("uses the same anchor", () => {
    expect(ANCHOR.hijriYear).toBe(vectors.converter.anchor.hijri_year);
    expect(ANCHOR.hijriMonth).toBe(vectors.converter.anchor.hijri_month);
    expect(formatPlainDate(ANCHOR.gregorianDate)).toBe(vectors.converter.anchor.gregorian_date);
    expectInstant(ANCHOR.conjunction, vectors.converter.anchor.conjunction, "anchor conjunction");
  });

  it("uses the same month names", () => {
    expect([...HIJRI_MONTH_NAMES]).toEqual(vectors.converter.month_names);
  });

  it("matches month starts for every method", () => {
    for (const c of vectors.converter.month_starts) {
      const label = `${c.hijri_year}-${c.hijri_month} ${c.method}`;
      const method = c.method as HilalMethod;
      if ("error" in c) {
        expect(() => monthStartDateForMethod(c.hijri_year, c.hijri_month, method), label).toThrow();
        continue;
      }
      expect(
        formatPlainDate(monthStartDateForMethod(c.hijri_year, c.hijri_month, method)),
        label,
      ).toBe(c.start_date);
    }
  });

  it("matches Gregorian to Hijri", () => {
    for (const c of vectors.converter.gregorian_to_hijri) {
      const date = parsePlainDate(c.date);
      if ("error" in c) {
        expect(() => gregorianToHijri(date), c.date).toThrow();
        continue;
      }
      const result = gregorianToHijri(date);
      expect(result.year, `year ${c.date}`).toBe(c.hijri_year);
      expect(result.month, `month ${c.date}`).toBe(c.hijri_month);
      expect(result.day, `day ${c.date}`).toBe(c.hijri_day);
      expect(result.monthName, `name ${c.date}`).toBe(c.month_name);
    }
  });

  it("matches Hijri to Gregorian", () => {
    for (const c of vectors.converter.hijri_to_gregorian) {
      const label = `${c.hijri_year}-${c.hijri_month}-${c.hijri_day}`;
      if ("error" in c) {
        expect(
          () => hijriToGregorian(c.hijri_year, c.hijri_month, c.hijri_day),
          label,
        ).toThrow();
        continue;
      }
      expect(
        formatPlainDate(hijriToGregorian(c.hijri_year, c.hijri_month, c.hijri_day)),
        label,
      ).toBe(c.gregorian_date);
    }
  });

  it("matches the reference observation per month", () => {
    for (const c of vectors.converter.observation_for_month) {
      const label = `${c.hijri_year}-${c.hijri_month}`;
      if ("error" in c) {
        expect(() => observationForMonth(c.hijri_year, c.hijri_month), label).toThrow();
        continue;
      }
      const obs = observationForMonth(c.hijri_year, c.hijri_month);
      expect(formatPlainDate(obs.date), `date ${label}`).toBe(c.date);
      expectClose(obs.moonAltitudeDeg, c.moon_altitude_deg, `alt ${label}`, 1e-9);
      expectClose(obs.elongationDeg, c.elongation_deg, `elongation ${label}`, 1e-9);
      expectClose(obs.moonAgeHours, c.moon_age_hours, `age ${label}`, 1e-9);
      expectClose(obs.illuminationFraction, c.illumination_fraction, `illumination ${label}`);
      expectClose(obs.crescentWidthArcmin, c.crescent_width_arcmin, `width ${label}`, 1e-9);
    }
  });

  it("matches full Hijri year generation", () => {
    for (const c of vectors.converter.hijri_years) {
      if ("error" in c) {
        expect(() => generateHijriYear(c.hijri_year), String(c.hijri_year)).toThrow();
        continue;
      }
      const records = generateHijriYear(c.hijri_year);
      expect(records.length, `month count ${c.hijri_year}`).toBe(c.months.length);
      records.forEach((record, index) => {
        const expected = c.months[index];
        const label = `${c.hijri_year}-${expected.month}`;
        expect(record.month, `month ${label}`).toBe(expected.month);
        expect(record.monthName, `name ${label}`).toBe(expected.month_name);
        expect(record.startDateGregorian, `start ${label}`).toBe(expected.start_date_gregorian);
        expect(record.endDateGregorian, `end ${label}`).toBe(expected.end_date_gregorian);
        expect(record.lengthDays, `length ${label}`).toBe(expected.length_days);
      });
    }
  });
});

describe("visibility grid", () => {
  it("has the same geometry as the Celery task", () => {
    const coordinates = gridCoordinates();
    const shape = vectors.grid.shape;
    expect(coordinates.length, "point count").toBe(shape.count);
    expect(GRID_LAT_RANGE, "lat range").toEqual(shape.lat_range);
    expect(GRID_LON_RANGE, "lon range").toEqual(shape.lon_range);
    expect(GRID_STEP_DEG, "step").toBe(shape.step_deg);
    expect(coordinates[0], "first point").toEqual(shape.first);
    expect(coordinates[coordinates.length - 1], "last point").toEqual(shape.last);
  });

  it("produces the same verdict strings the API used to store", () => {
    const date = parsePlainDate(vectors.grid.date);
    for (const sample of vectors.grid.samples) {
      const label = `grid[${sample.index}] ${sample.lat},${sample.lon}`;

      if ("error" in sample) {
        expect(() => computeHilalObservation(date, sample.lat, sample.lon), label).toThrow();
        continue;
      }

      const observation = computeHilalObservation(date, sample.lat, sample.lon);
      expectClose(observation.moonAltitudeDeg, sample.moon_altitude_deg, `alt ${label}`, 1e-9);
      expectClose(observation.elongationDeg, sample.elongation_deg, `elongation ${label}`, 1e-9);
      // "True"/"False" are Python's str(bool), which is what the map page
      // matches on - a camelCased "true" here would silently blank the map.
      for (const method of ["wujudul_hilal", "mabims_2021", "odeh"] as HilalMethod[]) {
        expect(verdictFor(observation, method), `${method} ${label}`).toBe(
          sample.verdicts[method],
        );
      }
    }
  });
});

describe("plain date helpers", () => {
  it("round-trips dates without drifting through a local time zone", () => {
    // Guards the one bug class this port is most exposed to: `new Date(iso)`
    // reads an offset-less string as local time, which would shift every
    // calendar boundary by a day for users east or west of UTC.
    const samples = ["2024-03-12", "2026-01-01", "2026-12-31", "1970-01-01"];
    for (const sample of samples) {
      const date: PlainDate = parsePlainDate(sample);
      expect(formatPlainDate(date)).toBe(sample);
      expect(formatPlainDate(plainDateOf(parseInstant(`${sample}T00:00:00`)))).toBe(sample);
      expect(formatPlainDate(plainDateOf(parseInstant(`${sample}T23:59:59`)))).toBe(sample);
    }
  });
});
