import tzLookup from "tz-lookup";

/**
 * tz-lookup's boundary polygons are coarse along the Indonesia - Papua New
 * Guinea border, and put Jayapura (140.72 E, ~20 km from the border) in
 * Pacific/Port_Moresby (UTC+10) instead of WIT (UTC+9) - every Jayapura time
 * rendered an hour late. The land border runs along the 141st meridian for
 * almost its whole length (the Fly River bulge only ever pushes it east of
 * that), so anything tz-lookup assigns to Port Moresby west of 141 E is
 * Indonesian Papua.
 */
const RI_PNG_BORDER_LON_DEG = 141.0;

export function resolveTimeZone(lat: number, lon: number): string | null {
  let zone: string;
  try {
    zone = tzLookup(lat, lon);
  } catch {
    return null;
  }
  if (zone === "Pacific/Port_Moresby" && lon < RI_PNG_BORDER_LON_DEG) return "Asia/Jayapura";
  return zone;
}
