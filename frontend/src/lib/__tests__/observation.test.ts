import { describe, expect, it } from "vitest";
import { DEFAULT_CITY, INDONESIAN_CITIES } from "../locations";
import {
  matchCity,
  observationFromParams,
  observationToParams,
  resolveInitialObservation,
  type Observation,
} from "../observation";

describe("matchCity", () => {
  it("matches a city at its exact coordinates", () => {
    const jakarta = INDONESIAN_CITIES.find((c) => c.name === "Jakarta")!;
    expect(matchCity(jakarta.lat, jakarta.lon)?.name).toBe("Jakarta");
  });

  it("matches within a small tolerance (URL round-trip precision, GPS jitter)", () => {
    const jakarta = INDONESIAN_CITIES.find((c) => c.name === "Jakarta")!;
    expect(matchCity(jakarta.lat + 0.001, jakarta.lon - 0.001)?.name).toBe("Jakarta");
  });

  it("returns null for coordinates that don't match any known city", () => {
    expect(matchCity(0, 0)).toBeNull();
  });
});

describe("observationFromParams", () => {
  it("reads lat/lon/d when all present and well-formed", () => {
    const params = new URLSearchParams("lat=-6.2&lon=106.8&d=2026-03-11");
    expect(observationFromParams(params)).toEqual({ lat: -6.2, lon: 106.8, dateIso: "2026-03-11" });
  });

  it("ignores malformed values rather than producing NaN or a bad date", () => {
    const params = new URLSearchParams("lat=notanumber&lon=106.8&d=not-a-date");
    const out = observationFromParams(params);
    expect(out.lat).toBeUndefined();
    expect(out.lon).toBeUndefined();
    expect(out.dateIso).toBeUndefined();
  });

  it("returns an empty object for an empty query string", () => {
    expect(observationFromParams(new URLSearchParams())).toEqual({});
  });
});

describe("observationToParams", () => {
  it("includes a derived tz for a known Indonesian location", () => {
    const obs: Observation = { lat: -6.2, lon: 106.8167, dateIso: "2026-03-11" };
    const params = observationToParams(obs);
    expect(params.lat).toBe("-6.2000");
    expect(params.lon).toBe("106.8167");
    expect(params.d).toBe("2026-03-11");
    expect(params.tz).toMatch(/Jakarta/);
  });
});

describe("resolveInitialObservation", () => {
  it("prefers URL params over everything else", () => {
    const obs = resolveInitialObservation(new URLSearchParams("lat=1&lon=2&d=2020-01-01"));
    expect(obs).toEqual({ lat: 1, lon: 2, dateIso: "2020-01-01" });
  });

  it("falls back to the default city and today when nothing is present (no localStorage in this test environment)", () => {
    const obs = resolveInitialObservation(new URLSearchParams());
    expect(obs.lat).toBe(DEFAULT_CITY.lat);
    expect(obs.lon).toBe(DEFAULT_CITY.lon);
    expect(obs.dateIso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("takes lat/lon from the URL and dateIso from the default when only lat/lon are present", () => {
    const obs = resolveInitialObservation(new URLSearchParams("lat=1&lon=2"));
    expect(obs.lat).toBe(1);
    expect(obs.lon).toBe(2);
    expect(obs.dateIso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
