/**
 * Translates each retired route's own query-param shape into the new
 * routes' `?lat=&lon=&d=&sweep=&method=&convention=` contract (migration
 * step 9).
 *
 * "Query params preserved" (DESIGN.md §9.9) has to mean preserving INTENT,
 * not just forwarding a query string whose param NAMES the new pages
 * don't read - lib/observation.ts's ObservationProvider only ever reads
 * `lat`/`lon`/`d`, never the old routes' `date`/`year`/`hijri_year`. A
 * naive pass-through would silently land every old permalink on today's
 * default instead of the date/place it actually linked to, which is a
 * real break of DESIGN.md §4.1's "existing permalinks must not break"
 * even though the page itself would still load without error.
 *
 * `hijriYearToGregorianDate` calls the frozen engine's own
 * hijriToGregorian (already validated, unmodified) to convert an old
 * ?year=/?hijri_year= link into the Gregorian date the new context bar
 * actually reads - not a new calculation, an existing export used for
 * exactly the purpose it already serves everywhere else in this app.
 */
import { hijriToGregorian } from "./falak/converter";
import { formatPlainDate } from "./falak/time";
import { DEFAULT_CITY } from "./locations";

/** The Gregorian date of 1 Muharram of the given Hijri year - close enough to "somewhere in that year" for a redirect to land a reader in the right neighbourhood, which is what old ?year=/?hijri_year= links were ever precise about anyway (the old pages showed a whole year, not one evening). Returns null rather than a guessed date if the engine can't resolve it (out of ephemeris range), so the caller can omit `d` instead of forwarding a wrong one. */
export function hijriYearToGregorianDate(hijriYear: number, latDeg: number, lonDeg: number): string | null {
  try {
    return formatPlainDate(hijriToGregorian(hijriYear, 1, 1, latDeg, lonDeg));
  } catch {
    return null;
  }
}

/** Old pages that took a lat/lon always had one in state (defaulted to DEFAULT_CITY - Jakarta - via lib/locations.ts, the same default the new ContextBar itself uses), so a redirect with no lat/lon in the URL still has a real place to convert against - matching what the old page's own UI actually showed by default, not silently guessing a new one. */
export function legacyLatLon(params: URLSearchParams): { lat: number; lon: number } {
  const lat = params.get("lat");
  const lon = params.get("lon");
  return {
    lat: lat !== null && Number.isFinite(Number(lat)) ? Number(lat) : DEFAULT_CITY.lat,
    lon: lon !== null && Number.isFinite(Number(lon)) ? Number(lon) : DEFAULT_CITY.lon,
  };
}

export function buildSearch(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") qs.set(key, String(value));
  }
  const query = qs.toString();
  return query ? `?${query}` : "";
}
