import tzLookup from "tz-lookup";

export function resolveTimeZone(lat: number, lon: number): string | null {
  try {
    return tzLookup(lat, lon);
  } catch {
    return null;
  }
}
