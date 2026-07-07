const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function getJson<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query.set(key, String(value));
  }
  const res = await fetch(`${API_BASE_URL}${path}?${query.toString()}`, { cache: "no-store" });
  const body = await res.json();
  if (!res.ok) {
    throw new ApiError(body.error ?? `request failed with status ${res.status}`, res.status);
  }
  return body as T;
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
}

export function convertDate(params: {
  direction: "gregorian_to_hijri" | "hijri_to_gregorian";
  date?: string;
  hijri_year?: number;
  hijri_month?: number;
  hijri_day?: number;
  lat?: number;
  lon?: number;
}) {
  return getJson<ConvertResult>("/convert/", params);
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
  trajectory: Array<{
    time_utc: string;
    minutes_from_sunset: number;
    moon_altitude_deg: number;
    sun_altitude_deg: number;
    elongation_deg: number;
  }>;
}

export function fetchHilalVisibility(params: { date: string; lat: number; lon: number }) {
  return getJson<HilalObservation>("/hilal-visibility/", params);
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

export function fetchPrayerTimes(params: { date: string; lat: number; lon: number; convention?: string }) {
  return getJson<PrayerTimesResult>("/prayer-times/", params);
}

export interface PrayerTimesMonthResult {
  year: number;
  month: number;
  latitude_deg: number;
  longitude_deg: number;
  days: PrayerTimesResult[];
}

export function fetchPrayerTimesMonth(params: {
  year: number;
  month: number;
  lat: number;
  lon: number;
  convention?: string;
}) {
  return getJson<PrayerTimesMonthResult>("/prayer-times-month/", params);
}

export interface QiblaResult {
  latitude_deg: number;
  longitude_deg: number;
  bearing_deg: number;
  distance_km: number;
}

export function fetchQibla(params: { lat: number; lon: number }) {
  return getJson<QiblaResult>("/qibla/", params);
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

export function fetchRashdulQibla(params: { year: number; lat?: number; lon?: number }) {
  return getJson<RashdulQiblaResult>("/rashdul-qibla/", params);
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

export function fetchVisibilityGrid(params: { date: string; method?: string }) {
  return getJson<VisibilityGridResult>("/visibility-grid/", params);
}

export type HilalMethod = "wujudul_hilal" | "mabims_2021" | "odeh";

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

export function fetchMethodDivergence(params: { hijri_year: number; lat?: number; lon?: number }) {
  return getJson<MethodDivergenceResult>("/method-divergence/", params);
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

export function fetchVisibilityCalendar(params: {
  hijri_year: number;
  method?: HilalMethod;
  lat?: number;
  lon?: number;
}) {
  return getJson<VisibilityCalendarResult>("/visibility-calendar/", params);
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

export function fetchIsbatAccuracy(params: { hijri_year?: number; lat?: number; lon?: number }) {
  return getJson<IsbatAccuracyResult>("/isbat-accuracy/", params);
}
