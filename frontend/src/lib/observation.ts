/**
 * The persisted shape of "place and date" (DESIGN.md §4.3) - pure state
 * transforms only, no React. ObservationProvider.tsx is the React layer on
 * top of this.
 *
 * Deliberately NOT under lib/falak/: this is UI state persistence (URL
 * params, localStorage), not astronomy. It reads lib/locations.ts (already
 * "keep as-is" per MIGRATION.md) and nothing under lib/falak/ at all.
 *
 * The URL only ever carries lat/lon/tz/d (DESIGN.md §4.3's literal spec) -
 * no separate "city name" param. A friendly label is always re-derived from
 * the coordinates (matchCity below), never stored as its own field, so a
 * shared link can't end up with a label that disagrees with its own
 * coordinates.
 */
import { DEFAULT_CITY, INDONESIAN_CITIES, type CityLocation } from "./locations";
import { resolveTimeZone } from "./timezone";
import { todayIso } from "./date";

export interface Observation {
  lat: number;
  lon: number;
  dateIso: string;
}

export const OBSERVATION_STORAGE_KEY = "falak-observation";

/** Server-safe default - must render identically on the server and on the client's first paint, so real values are only ever applied post-mount (see ObservationProvider.tsx), the same pattern lib/permalink.ts's own header comment documents for the pages that already do this. */
export function defaultObservation(): Observation {
  return { lat: DEFAULT_CITY.lat, lon: DEFAULT_CITY.lon, dateIso: todayIso() };
}

/** A coordinate match close enough to call "this city", not floating-point equality - a value round-tripped through a URL's fixed-precision string, or nudged a hair by geolocation jitter at the same spot, should still resolve to its city. */
const CITY_MATCH_TOLERANCE_DEG = 0.01;

export function matchCity(lat: number, lon: number): CityLocation | null {
  return (
    INDONESIAN_CITIES.find(
      (c) => Math.abs(c.lat - lat) < CITY_MATCH_TOLERANCE_DEG && Math.abs(c.lon - lon) < CITY_MATCH_TOLERANCE_DEG,
    ) ?? null
  );
}

export function observationFromParams(params: URLSearchParams): Partial<Observation> {
  const out: Partial<Observation> = {};
  const lat = params.get("lat");
  const lon = params.get("lon");
  if (lat !== null && lon !== null) {
    const latNum = Number(lat);
    const lonNum = Number(lon);
    if (Number.isFinite(latNum) && Number.isFinite(lonNum)) {
      out.lat = latNum;
      out.lon = lonNum;
    }
  }
  const d = params.get("d");
  if (d !== null && /^\d{4}-\d{2}-\d{2}$/.test(d)) out.dateIso = d;
  return out;
}

/** tz is derived and included for transparency/debuggability of a shared link, never trusted back on read - see ObservationProvider.tsx, which always recomputes it from lat/lon rather than parsing it out of the URL. */
export function observationToParams(obs: Observation): Record<string, string> {
  const tz = resolveTimeZone(obs.lat, obs.lon);
  return {
    lat: obs.lat.toFixed(4),
    lon: obs.lon.toFixed(4),
    tz: tz ?? "",
    d: obs.dateIso,
  };
}

export function readStoredObservation(): Partial<Observation> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(OBSERVATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const candidate = parsed as Partial<Observation>;
    const out: Partial<Observation> = {};
    if (typeof candidate.lat === "number" && Number.isFinite(candidate.lat)) out.lat = candidate.lat;
    if (typeof candidate.lon === "number" && Number.isFinite(candidate.lon)) out.lon = candidate.lon;
    if (typeof candidate.dateIso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(candidate.dateIso)) {
      out.dateIso = candidate.dateIso;
    }
    return out;
  } catch {
    return null;
  }
}

export function writeStoredObservation(obs: Observation): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(OBSERVATION_STORAGE_KEY, JSON.stringify(obs));
  } catch {
    // Storage can be unavailable (private browsing, quota) - the session
    // still works via in-memory state, it just won't persist across visits.
  }
}

/**
 * Resolution order for the value to show on first client render: URL query
 * params (an incoming permalink is the most specific intent) win over
 * localStorage (a returning visitor's last session) win over the
 * server-safe default.
 */
export function resolveInitialObservation(params: URLSearchParams): Observation {
  const fallback = defaultObservation();
  const stored = readStoredObservation();
  const fromUrl = observationFromParams(params);
  return {
    lat: fromUrl.lat ?? stored?.lat ?? fallback.lat,
    lon: fromUrl.lon ?? stored?.lon ?? fallback.lon,
    dateIso: fromUrl.dateIso ?? stored?.dateIso ?? fallback.dateIso,
  };
}
