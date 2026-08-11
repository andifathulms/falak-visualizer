/**
 * The app's data layer. Every function here used to be an HTTP call to the
 * Django/DRF backend; they now run the astronomy engine in the browser
 * (lib/falak/*), which is a line-by-line port of backend/falak pinned to it by
 * the golden-vector suite.
 *
 * Why the shapes look like a REST API
 * -----------------------------------
 * The exported names, argument objects and snake_case result interfaces are
 * unchanged from the HTTP version, and the functions are still async. That is
 * deliberate: the pages under src/app are untouched by the move off the server,
 * so the diff that removed the backend is confined to this file and is easy to
 * audit. `ApiError` is still what a validation failure throws, so the existing
 * `err instanceof ApiError` handling keeps reporting real messages.
 *
 * Everything the backend did is reproducible here because none of it needed a
 * server: the endpoints were pure functions of their query parameters, the
 * Postgres tables were caches of deterministic output plus one static reference
 * table, and there were no accounts and no writes.
 */
import {
  gregorianToHijri,
  hijriToGregorian,
  HIJRI_MONTH_NAMES,
  JAKARTA_LATITUDE_DEG,
  JAKARTA_LONGITUDE_DEG,
  MONTH_START_METHODS,
  conjunctionForHijriMonth,
  monthStartDateForMethod,
  monthStartTrace,
  observationForMonth,
} from "./falak/converter";
import { computeVisibilityGrid, type GridProgress } from "./falak/gridRunner";
import { compareRecord, ISBAT_RECORDS } from "./falak/isbat";
import { CONVENTIONS, dailyPrayerTimes } from "./falak/prayerTimes";
import { qiblaDirection, rashdulQiblaEvents } from "./falak/qibla";
import {
  daysInMonth,
  formatInstant,
  daysBetween,
  formatPlainDate,
  parsePlainDate,
  type Instant,
  type PlainDate,
} from "./falak/time";
import {
  computeHilalObservation,
  evaluateCriteria,
  hilalTrajectory,
  type HilalMethod as EngineHilalMethod,
} from "./falak/visibility";
import { criterionMargin, type CriterionMargin } from "./falak/tolerance";

/**
 * Where the interactive API docs live, when a backend is running.
 *
 * The static GitHub Pages build has no backend, so this is null there and the
 * nav link is hidden rather than pointing at a dead host. Set
 * NEXT_PUBLIC_API_BASE_URL (as docker-compose does) to surface it again.
 */
export const API_DOCS_URL: string | null =
  process.env.NEXT_PUBLIC_API_BASE_URL === undefined
    ? null
    : `${process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/api\/?$/, "")}/api/schema/swagger-ui/`;

/**
 * Raised for the inputs the DRF views used to reject with a 400/422. Kept as a
 * class with a `status` so existing error handling and messaging still work.
 */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const SUPPORTED_CONVERTER_METHODS = new Set(["mabims_2021"]);
const SUPPORTED_VISIBILITY_METHODS = new Set<string>(MONTH_START_METHODS);

/** Mirrors the views' `_require_date`: an explicit error, never a substituted date. */
function requireDate(value: string | undefined, name = "date"): PlainDate {
  if (value === undefined) {
    throw new ApiError(`missing required query parameter: ${name}`, 400);
  }
  try {
    return parsePlainDate(value);
  } catch {
    throw new ApiError(
      `query parameter '${name}' must be an ISO date (YYYY-MM-DD), got '${value}'`,
      400,
    );
  }
}

/** Mirrors the views' `_require_float`. */
function requireNumber(value: number | undefined, name: string, fallback?: number): number {
  if (value === undefined || Number.isNaN(value)) {
    if (fallback !== undefined) return fallback;
    throw new ApiError(`missing required query parameter: ${name}`, 400);
  }
  return value;
}

function requireVisibilityMethod(method: string): EngineHilalMethod {
  if (!SUPPORTED_VISIBILITY_METHODS.has(method)) {
    throw new ApiError(
      `method '${method}' not recognized; supported: ${[...MONTH_START_METHODS].sort().join(", ")}`,
      400,
    );
  }
  return method as EngineHilalMethod;
}

function isoOrNull(instant: Instant | null): string | null {
  return instant === null ? null : formatInstant(instant);
}

/** One evening the month-start search tested, flattened for display. */
export interface DerivationStep {
  evening: string;
  conjunction_before_sunset: boolean;
  criterion_met: boolean;
  sunset_utc: string;
  moonset_utc: string | null;
  moon_altitude_deg: number;
  elongation_deg: number;
  lag_time_minutes: number | null;
}

/**
 * How the converter reached its answer: which conjunction governs the month,
 * which evenings were tested, and what the sky was doing on each.
 *
 * This is the product's whole question - "why does this month start here?" -
 * and the converter previously answered it with the method name and the
 * direction, both of which the user had just chosen.
 */
export interface ConversionDerivation {
  hijri_year: number;
  hijri_month: number;
  hijri_month_name: string;
  conjunction_utc: string;
  steps: DerivationStep[];
  month_start: string;
}

export interface ConvertResult {
  direction: string;
  method: string;
  input_date?: string;
  hijri_year: number;
  hijri_month: number;
  hijri_day: number;
  hijri_month_name?: string;
  gregorian_date?: string;
  /** Absent only if the trace could not be built; never silently faked. */
  derivation?: ConversionDerivation;
}

/**
 * Build the display form of the month-start trace for the month a converted
 * date falls in.
 *
 * Returns undefined rather than a placeholder when the trace cannot be built -
 * an unexplained result is honest, an invented explanation is not.
 */
function buildDerivation(
  hijriYear: number,
  hijriMonth: number,
  method: EngineHilalMethod,
  lat: number,
  lon: number,
): ConversionDerivation | undefined {
  try {
    const conjunction = conjunctionForHijriMonth(hijriYear, hijriMonth);
    const trace = monthStartTrace(conjunction, method, lat, lon);
    return {
      hijri_year: hijriYear,
      hijri_month: hijriMonth,
      hijri_month_name: HIJRI_MONTH_NAMES[hijriMonth - 1],
      conjunction_utc: formatInstant(conjunction),
      month_start: formatPlainDate(trace.start),
      steps: trace.steps.map((step) => ({
        evening: formatPlainDate(step.evening),
        conjunction_before_sunset: step.conjunctionBeforeSunset,
        criterion_met: step.criterionMet,
        sunset_utc: formatInstant(step.observation.sunsetTime),
        moonset_utc: isoOrNull(step.observation.moonsetTime),
        moon_altitude_deg: step.observation.moonAltitudeDeg,
        elongation_deg: step.observation.elongationDeg,
        lag_time_minutes: step.observation.lagTimeMinutes,
      })),
    };
  } catch {
    return undefined;
  }
}

export async function convertDate(params: {
  direction: "gregorian_to_hijri" | "hijri_to_gregorian";
  date?: string;
  hijri_year?: number;
  hijri_month?: number;
  hijri_day?: number;
  lat?: number;
  lon?: number;
  method?: string;
}): Promise<ConvertResult> {
  const method = params.method ?? "mabims_2021";
  if (!SUPPORTED_CONVERTER_METHODS.has(method)) {
    throw new ApiError(
      `method '${method}' is not supported in the MVP converter (only mabims_2021 is implemented)`,
      400,
    );
  }

  const lat = requireNumber(params.lat, "lat", JAKARTA_LATITUDE_DEG);
  const lon = requireNumber(params.lon, "lon", JAKARTA_LONGITUDE_DEG);

  if (params.direction === "gregorian_to_hijri") {
    const date = requireDate(params.date);
    const result = gregorianToHijri(date, lat, lon);
    return {
      direction: params.direction,
      method,
      input_date: formatPlainDate(date),
      hijri_year: result.year,
      hijri_month: result.month,
      hijri_day: result.day,
      hijri_month_name: result.monthName,
      derivation: buildDerivation(result.year, result.month, "mabims_2021", lat, lon),
    };
  }

  if (params.direction === "hijri_to_gregorian") {
    const year = Math.trunc(requireNumber(params.hijri_year, "hijri_year"));
    const month = Math.trunc(requireNumber(params.hijri_month, "hijri_month"));
    const day = Math.trunc(requireNumber(params.hijri_day, "hijri_day"));
    return {
      direction: params.direction,
      method,
      hijri_year: year,
      hijri_month: month,
      hijri_day: day,
      gregorian_date: formatPlainDate(hijriToGregorian(year, month, day, lat, lon)),
      derivation: buildDerivation(year, month, "mabims_2021", lat, lon),
    };
  }

  throw new ApiError(
    "query parameter 'direction' must be 'gregorian_to_hijri' or 'hijri_to_gregorian'",
    400,
  );
}

export interface HilalObservation {
  date: string;
  latitude_deg: number;
  longitude_deg: number;
  conjunction_time_utc: string;
  sunset_time_utc: string;
  moonset_time_utc: string | null;
  moon_altitude_deg: number;
  sun_altitude_deg: number;
  elongation_deg: number;
  moon_age_hours: number;
  illumination_fraction: number;
  lag_time_minutes: number | null;
  crescent_width_arcmin: number;
  criteria: {
    wujudul_hilal: boolean;
    mabims_2021: boolean;
    odeh: string;
  };
  /**
   * How much room each criterion had, and whether that room exceeded the
   * engine's own accuracy. Derived from the same observation as `criteria`,
   * so the two can never disagree.
   */
  margins: Record<EngineHilalMethod, CriterionMargin>;
  trajectory: Array<{
    time_utc: string;
    minutes_from_sunset: number;
    moon_altitude_deg: number;
    sun_altitude_deg: number;
    elongation_deg: number;
  }>;
}

/** The serializer shape shared by the hilal-visibility and calendar payloads. */
function serializeObservation(observation: ReturnType<typeof computeHilalObservation>) {
  return {
    date: formatPlainDate(observation.date),
    latitude_deg: observation.latitudeDeg,
    longitude_deg: observation.longitudeDeg,
    conjunction_time_utc: formatInstant(observation.conjunctionTime),
    sunset_time_utc: formatInstant(observation.sunsetTime),
    moonset_time_utc: isoOrNull(observation.moonsetTime),
    moon_altitude_deg: observation.moonAltitudeDeg,
    sun_altitude_deg: observation.sunAltitudeDeg,
    elongation_deg: observation.elongationDeg,
    moon_age_hours: observation.moonAgeHours,
    illumination_fraction: observation.illuminationFraction,
    lag_time_minutes: observation.lagTimeMinutes,
    crescent_width_arcmin: observation.crescentWidthArcmin,
  };
}

export async function fetchHilalVisibility(params: {
  date: string;
  lat: number;
  lon: number;
  method?: string;
}): Promise<HilalObservation> {
  const date = requireDate(params.date);
  const lat = requireNumber(params.lat, "lat");
  const lon = requireNumber(params.lon, "lon");
  if (params.method !== undefined) requireVisibilityMethod(params.method);

  let observation: ReturnType<typeof computeHilalObservation>;
  try {
    observation = computeHilalObservation(date, lat, lon);
  } catch (error) {
    // 422 is what the view returned for a date/location with no sunset.
    throw new ApiError(error instanceof Error ? error.message : String(error), 422);
  }

  return {
    ...serializeObservation(observation),
    criteria: evaluateCriteria(observation),
    margins: {
      wujudul_hilal: criterionMargin(observation, "wujudul_hilal"),
      mabims_2021: criterionMargin(observation, "mabims_2021"),
      odeh: criterionMargin(observation, "odeh"),
    },
    trajectory: hilalTrajectory(date, lat, lon).map((point) => ({
      time_utc: formatInstant(point.time),
      minutes_from_sunset: point.minutesFromSunset,
      moon_altitude_deg: point.moonAltitudeDeg,
      sun_altitude_deg: point.sunAltitudeDeg,
      elongation_deg: point.elongationDeg,
    })),
  };
}

export interface PrayerTimesResult {
  date: string;
  latitude_deg: number;
  longitude_deg: number;
  convention: string;
  fajr: string | null;
  sunrise: string | null;
  dhuhr: string;
  asr: string | null;
  maghrib: string | null;
  isha: string | null;
}

function requireConvention(name: string) {
  const convention = CONVENTIONS[name];
  if (convention === undefined) {
    throw new ApiError(
      `convention '${name}' not recognized; supported: ${Object.keys(CONVENTIONS).sort().join(", ")}`,
      400,
    );
  }
  return convention;
}

function serializePrayerTimes(result: ReturnType<typeof dailyPrayerTimes>): PrayerTimesResult {
  return {
    date: formatPlainDate(result.date),
    latitude_deg: result.latitudeDeg,
    longitude_deg: result.longitudeDeg,
    convention: result.convention,
    fajr: isoOrNull(result.fajr),
    sunrise: isoOrNull(result.sunrise),
    dhuhr: formatInstant(result.dhuhr),
    asr: isoOrNull(result.asr),
    maghrib: isoOrNull(result.maghrib),
    isha: isoOrNull(result.isha),
  };
}

export async function fetchPrayerTimes(params: {
  date: string;
  lat: number;
  lon: number;
  convention?: string;
}): Promise<PrayerTimesResult> {
  const date = requireDate(params.date);
  const lat = requireNumber(params.lat, "lat");
  const lon = requireNumber(params.lon, "lon");
  const convention = requireConvention(params.convention ?? "Kemenag RI");
  return serializePrayerTimes(dailyPrayerTimes(date, lat, lon, convention));
}

export interface PrayerTimesMonthResult {
  year: number;
  month: number;
  latitude_deg: number;
  longitude_deg: number;
  days: PrayerTimesResult[];
}

export async function fetchPrayerTimesMonth(params: {
  year: number;
  month: number;
  lat: number;
  lon: number;
  convention?: string;
}): Promise<PrayerTimesMonthResult> {
  const year = Math.trunc(requireNumber(params.year, "year"));
  const month = Math.trunc(requireNumber(params.month, "month"));
  const lat = requireNumber(params.lat, "lat");
  const lon = requireNumber(params.lon, "lon");
  if (month < 1 || month > 12) {
    throw new ApiError("month must be between 1 and 12", 400);
  }
  const convention = requireConvention(params.convention ?? "Kemenag RI");

  const days: PrayerTimesResult[] = [];
  for (let day = 1; day <= daysInMonth(year, month); day += 1) {
    days.push(serializePrayerTimes(dailyPrayerTimes({ year, month, day }, lat, lon, convention)));
  }

  return { year, month, latitude_deg: lat, longitude_deg: lon, days };
}

export interface QiblaResult {
  latitude_deg: number;
  longitude_deg: number;
  bearing_deg: number;
  distance_km: number;
}

export async function fetchQibla(params: { lat: number; lon: number }): Promise<QiblaResult> {
  const lat = requireNumber(params.lat, "lat");
  const lon = requireNumber(params.lon, "lon");
  const result = qiblaDirection(lat, lon);
  return {
    latitude_deg: lat,
    longitude_deg: lon,
    bearing_deg: result.bearingDeg,
    distance_km: result.distanceKm,
  };
}

export interface RashdulQiblaEvent {
  utc_time: string;
  direction: "ascending" | "descending";
  bearing_deg?: number;
}

export interface RashdulQiblaResult {
  year: number;
  events: RashdulQiblaEvent[];
}

export async function fetchRashdulQibla(params: {
  year: number;
  lat?: number;
  lon?: number;
}): Promise<RashdulQiblaResult> {
  const year = Math.trunc(requireNumber(params.year, "year"));
  const hasLocation = params.lat !== undefined && params.lon !== undefined;
  const bearing = hasLocation
    ? qiblaDirection(params.lat as number, params.lon as number).bearingDeg
    : undefined;

  return {
    year,
    events: rashdulQiblaEvents(year).map((event) => ({
      utc_time: formatInstant(event.utcTime),
      direction: event.direction,
      ...(bearing === undefined ? {} : { bearing_deg: bearing }),
    })),
  };
}

export interface VisibilityGridResult {
  date: string;
  method: string;
  status: "ready" | "computing";
  points?: Array<{
    lat: number;
    lon: number;
    verdict: string;
    moon_altitude_deg: number;
    elongation_deg: number;
  }>;
}

/**
 * Compute the Indonesia visibility grid.
 *
 * The HTTP version could answer `status: "computing"` and leave the caller to
 * poll while Celery worked. Here the promise simply takes as long as the grid
 * takes, so the result is always `"ready"`; pass `onProgress` to show how far
 * along it is rather than an indefinite spinner.
 */
export async function fetchVisibilityGrid(
  params: { date: string; method?: string },
  onProgress?: (progress: GridProgress) => void,
): Promise<VisibilityGridResult> {
  const date = requireDate(params.date);
  const method = requireVisibilityMethod(params.method ?? "mabims_2021");

  const grid = await computeVisibilityGrid(formatPlainDate(date), method, onProgress);

  return {
    date: formatPlainDate(date),
    method,
    status: "ready",
    points: grid.points,
  };
}

export type HilalMethod = EngineHilalMethod;

export interface MethodDivergenceMonth {
  hijri_month: number;
  hijri_month_name: string;
  start_dates: Partial<Record<HilalMethod, string>>;
  errors: Record<string, string> | null;
  diverges: boolean | null;
}

export interface MethodDivergenceResult {
  hijri_year: number;
  latitude_deg: number;
  longitude_deg: number;
  months: MethodDivergenceMonth[];
}

export async function fetchMethodDivergence(params: {
  hijri_year: number;
  lat?: number;
  lon?: number;
}): Promise<MethodDivergenceResult> {
  const hijriYear = Math.trunc(requireNumber(params.hijri_year, "hijri_year"));
  const lat = requireNumber(params.lat, "lat", JAKARTA_LATITUDE_DEG);
  const lon = requireNumber(params.lon, "lon", JAKARTA_LONGITUDE_DEG);

  const months: MethodDivergenceMonth[] = [];
  for (let month = 1; month <= 12; month += 1) {
    const startDates: Partial<Record<HilalMethod, string>> = {};
    const errors: Record<string, string> = {};

    for (const method of MONTH_START_METHODS) {
      try {
        startDates[method] = formatPlainDate(
          monthStartDateForMethod(hijriYear, month, method, lat, lon),
        );
      } catch (error) {
        errors[method] = error instanceof Error ? error.message : String(error);
      }
    }

    const hasErrors = Object.keys(errors).length > 0;
    months.push({
      hijri_month: month,
      hijri_month_name: HIJRI_MONTH_NAMES[month - 1],
      start_dates: startDates,
      errors: hasErrors ? errors : null,
      diverges: hasErrors ? null : new Set(Object.values(startDates)).size > 1,
    });
  }

  return { hijri_year: hijriYear, latitude_deg: lat, longitude_deg: lon, months };
}

export interface VisibilityCalendarMonth {
  hijri_month: number;
  hijri_month_name: string;
  error?: string;
  date?: string;
  moon_altitude_deg?: number;
  sun_altitude_deg?: number;
  elongation_deg?: number;
  moon_age_hours?: number;
  illumination_fraction?: number;
  lag_time_minutes?: number | null;
  crescent_width_arcmin?: number;
  verdict?: boolean | string;
}

export interface VisibilityCalendarResult {
  hijri_year: number;
  method: HilalMethod;
  latitude_deg: number;
  longitude_deg: number;
  months: VisibilityCalendarMonth[];
}

export async function fetchVisibilityCalendar(params: {
  hijri_year: number;
  method?: HilalMethod;
  lat?: number;
  lon?: number;
}): Promise<VisibilityCalendarResult> {
  const hijriYear = Math.trunc(requireNumber(params.hijri_year, "hijri_year"));
  const lat = requireNumber(params.lat, "lat", JAKARTA_LATITUDE_DEG);
  const lon = requireNumber(params.lon, "lon", JAKARTA_LONGITUDE_DEG);
  const method = requireVisibilityMethod(params.method ?? "mabims_2021");

  const months: VisibilityCalendarMonth[] = [];
  for (let month = 1; month <= 12; month += 1) {
    let observation: ReturnType<typeof observationForMonth>;
    try {
      observation = observationForMonth(hijriYear, month, lat, lon);
    } catch (error) {
      months.push({
        hijri_month: month,
        hijri_month_name: HIJRI_MONTH_NAMES[month - 1],
        error: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    const criteria = evaluateCriteria(observation);
    months.push({
      ...serializeObservation(observation),
      hijri_month: month,
      hijri_month_name: HIJRI_MONTH_NAMES[month - 1],
      verdict: criteria[method],
    });
  }

  return {
    hijri_year: hijriYear,
    method,
    latitude_deg: lat,
    longitude_deg: lon,
    months,
  };
}

export interface IsbatComparisonRecord {
  hijri_year: number;
  hijri_month: number;
  hijri_month_name: string;
  actual_start_date: string;
  source_note: string;
  verified: boolean;
  predicted: Partial<Record<HilalMethod, string>>;
  errors: Record<string, string>;
  matches: Partial<Record<HilalMethod, boolean | null>>;
}

export interface IsbatAccuracyResult {
  count: number;
  records: IsbatComparisonRecord[];
}

export async function fetchIsbatAccuracy(params: {
  hijri_year?: number;
  lat?: number;
  lon?: number;
}): Promise<IsbatAccuracyResult> {
  const lat = requireNumber(params.lat, "lat", JAKARTA_LATITUDE_DEG);
  const lon = requireNumber(params.lon, "lon", JAKARTA_LONGITUDE_DEG);

  const selected =
    params.hijri_year === undefined
      ? ISBAT_RECORDS
      : ISBAT_RECORDS.filter((record) => record.hijriYear === Math.trunc(params.hijri_year as number));

  const records = selected.map((record) => compareRecord(record, lat, lon));
  return { count: records.length, records };
}

/** One Hijri month as resolved by every criterion, for the archive view. */
export interface ArchiveMonth {
  month: number;
  month_name: string;
  /** Gregorian start date per method, ISO. */
  starts: Record<EngineHilalMethod, string>;
  /** Days each method sits away from the MABIMS-2021 start. Zero when agreed. */
  offsets: Record<EngineHilalMethod, number>;
  /** True when every method resolved to the same Gregorian date. */
  unanimous: boolean;
  /** Per-method failures, never silently dropped. */
  errors: Partial<Record<EngineHilalMethod, string>>;
}

export interface HijriYearArchive {
  hijri_year: number;
  months: ArchiveMonth[];
  unanimous_months: number;
  diverging_months: number;
}

/**
 * A full Hijri year resolved under all three criteria.
 *
 * Composed here rather than in falak/archive.ts because archive.ts is a
 * one-to-one port of archive.py and generates a single-method calendar; adding
 * a multi-method variant there would mean changing the oracle and regenerating
 * the vector suite to gain nothing the existing exports do not already provide.
 *
 * `onProgress` exists because this is the heaviest thing the app computes
 * synchronously - 36 month-start searches, each solving a conjunction and
 * evaluating candidate evenings. The caller yields between months so the page
 * can paint, which is why this is async despite doing no I/O.
 */
export async function fetchHijriYearArchive(params: {
  hijriYear: number;
  lat: number;
  lon: number;
  onProgress?: (done: number, total: number) => void;
}): Promise<HijriYearArchive> {
  const year = requireNumber(params.hijriYear, "hijriYear");
  const lat = requireNumber(params.lat, "lat");
  const lon = requireNumber(params.lon, "lon");
  if (!Number.isInteger(year) || year < 1 || year > 2000) {
    throw new ApiError(`hijriYear '${year}' is out of the supported range (1-2000)`, 400);
  }

  const months: ArchiveMonth[] = [];
  for (let month = 1; month <= 12; month += 1) {
    const starts: Partial<Record<EngineHilalMethod, string>> = {};
    const errors: Partial<Record<EngineHilalMethod, string>> = {};

    for (const method of MONTH_START_METHODS) {
      try {
        starts[method] = formatPlainDate(monthStartDateForMethod(year, month, method, lat, lon));
      } catch (error) {
        // A criterion that cannot resolve a month is reported as such. It must
        // not inherit another method's date, which would invent agreement.
        errors[method] = error instanceof Error ? error.message : String(error);
      }
    }

    const baseline = starts.mabims_2021;
    const offsets: Partial<Record<EngineHilalMethod, number>> = {};
    for (const method of MONTH_START_METHODS) {
      const value = starts[method];
      if (value !== undefined && baseline !== undefined) {
        offsets[method] = daysBetween(parsePlainDate(baseline), parsePlainDate(value));
      }
    }

    const resolved = Object.values(starts);
    months.push({
      month,
      month_name: HIJRI_MONTH_NAMES[month - 1],
      starts: starts as Record<EngineHilalMethod, string>,
      offsets: offsets as Record<EngineHilalMethod, number>,
      // Months where a criterion failed are not counted as unanimous - absence
      // of a verdict is not agreement.
      unanimous: resolved.length === MONTH_START_METHODS.length && new Set(resolved).size === 1,
      errors,
    });

    params.onProgress?.(month, 12);
    // Yield to the event loop so the caller's progress UI can paint.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  const unanimous = months.filter((m) => m.unanimous).length;
  return {
    hijri_year: year,
    months,
    unanimous_months: unanimous,
    diverging_months: months.length - unanimous,
  };
}
