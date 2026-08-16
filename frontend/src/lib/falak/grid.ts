/**
 * Port of backend/falak/tasks.py precompute_visibility_grid, minus Celery.
 *
 * The Python version existed because computing ~3,255 grid points takes seconds
 * and CLAUDE.md Phase 1.3 forbids doing that in the request path. Running in the
 * browser removes the request path entirely: there is no server to block, so the
 * work is sharded across Web Workers (see gridRunner.ts) instead of queued.
 *
 * The grid geometry, the iteration order and the verdict strings are all kept
 * identical to the Celery task, so the map renders exactly what the API used to
 * return - including `"True"`/`"False"`, which are Python's `str(bool)` and what
 * the map page already matches on.
 */
import { parsePlainDate, type PlainDate } from "./time";
import {
  computeHilalObservation,
  mabims2021,
  odehCriterion,
  wujudulHilal,
  type HilalMethod,
} from "./visibility";

// Indonesia bounding box, 0.5 deg steps (PRD 4.2 / 10: Indonesia-only for MVP).
export const GRID_LAT_RANGE: readonly [number, number] = [-11.0, 6.0];
export const GRID_LON_RANGE: readonly [number, number] = [95.0, 141.0];
export const GRID_STEP_DEG = 0.5;

export interface GridPoint {
  lat: number;
  lon: number;
  verdict: string;
  moon_altitude_deg: number;
  elongation_deg: number;
  /**
   * DESIGN.md's HorizonInstrument, shown at reduced size beside the
   * Indonesia sweep for the hovered cell (migration step 5), needs the rest
   * of the observation this function already computes below - not new
   * astronomy, just returning more of the same object literal instead of
   * discarding it. Confirmed against the golden-vector suite before adding:
   * golden.test.ts's "visibility grid" describe block asserts against
   * computeHilalObservation/verdictFor directly, never GridPoint's shape,
   * so widening it here pins nothing new and breaks nothing existing.
   */
  sun_altitude_deg: number;
  illumination_fraction: number;
  lag_time_minutes: number | null;
  crescent_width_arcmin: number;
  moon_age_hours: number;
}

/**
 * Every grid coordinate, in the same order the Celery task walked them.
 *
 * 0.5 is exactly representable in binary floating point, so accumulating it -
 * as the Python task does - produces exact half-degree values; the `round(_, 2)`
 * in the original is a no-op that is preserved here only in spirit.
 */
export function gridCoordinates(): Array<[number, number]> {
  const coordinates: Array<[number, number]> = [];
  for (let lat = GRID_LAT_RANGE[0]; lat <= GRID_LAT_RANGE[1]; lat += GRID_STEP_DEG) {
    for (let lon = GRID_LON_RANGE[0]; lon <= GRID_LON_RANGE[1]; lon += GRID_STEP_DEG) {
      coordinates.push([lat, lon]);
    }
  }
  return coordinates;
}

export const GRID_POINT_COUNT = gridCoordinates().length;

/**
 * The verdict string for one observation under one method. Booleans are
 * stringified as `"True"`/`"False"` to match Python's `str(bool)`, which is what
 * the stored API values looked like.
 */
export function verdictFor(
  observation: ReturnType<typeof computeHilalObservation>,
  method: HilalMethod,
): string {
  if (method === "wujudul_hilal") {
    return wujudulHilal(
      observation.moonsetTime,
      observation.sunsetTime,
      observation.conjunctionTime,
    )
      ? "True"
      : "False";
  }
  if (method === "mabims_2021") {
    return mabims2021(observation.moonAltitudeDeg, observation.elongationDeg) ? "True" : "False";
  }
  if (method === "odeh") {
    return odehCriterion(
      observation.moonAltitudeDeg,
      observation.elongationDeg,
      observation.crescentWidthArcmin,
    );
  }
  throw new Error(`unsupported method: ${method}`);
}

export interface GridSliceResult {
  points: GridPoint[];
  /** Coordinates where no sunset exists; counted, never given a fabricated verdict. */
  failed: number;
}

/**
 * Compute grid points `[from, to)` of `gridCoordinates()`.
 *
 * Slicing by index is what lets several workers cover the archipelago
 * concurrently without any of them needing to know about the others.
 */
export function computeGridSlice(
  date: PlainDate,
  method: HilalMethod,
  from: number,
  to: number,
  onProgress?: (completed: number) => void,
): GridSliceResult {
  const coordinates = gridCoordinates();
  const end = Math.min(to, coordinates.length);
  const points: GridPoint[] = [];
  let failed = 0;

  for (let index = from; index < end; index += 1) {
    const [lat, lon] = coordinates[index];
    try {
      const observation = computeHilalObservation(date, lat, lon);
      points.push({
        lat,
        lon,
        verdict: verdictFor(observation, method),
        moon_altitude_deg: observation.moonAltitudeDeg,
        elongation_deg: observation.elongationDeg,
        sun_altitude_deg: observation.sunAltitudeDeg,
        illumination_fraction: observation.illuminationFraction,
        lag_time_minutes: observation.lagTimeMinutes,
        crescent_width_arcmin: observation.crescentWidthArcmin,
        moon_age_hours: observation.moonAgeHours,
      });
    } catch {
      // No silent fallback: skip and count, don't fabricate a verdict.
      failed += 1;
    }
    if (onProgress !== undefined && (index - from + 1) % 64 === 0) {
      onProgress(index - from + 1);
    }
  }

  onProgress?.(end - from);
  return { points, failed };
}

export interface GridSliceRequest {
  dateIso: string;
  method: HilalMethod;
  from: number;
  to: number;
}

/** Run a slice request described in plain data - the worker message contract. */
export function runGridSliceRequest(
  request: GridSliceRequest,
  onProgress?: (completed: number) => void,
): GridSliceResult {
  return computeGridSlice(
    parsePlainDate(request.dateIso),
    request.method,
    request.from,
    request.to,
    onProgress,
  );
}
