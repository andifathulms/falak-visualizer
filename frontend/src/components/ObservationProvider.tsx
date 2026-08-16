"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { readQueryParams, writeQueryParams } from "@/lib/permalink";
import { resolveTimeZone } from "@/lib/timezone";
import { type CityLocation } from "@/lib/locations";
import {
  defaultObservation,
  matchCity,
  observationToParams,
  readStoredObservation,
  resolveInitialObservation,
  writeStoredObservation,
  type Observation,
} from "@/lib/observation";
import { gregorianToHijri } from "@/lib/falak/converter";
import { parsePlainDate } from "@/lib/falak/time";

/**
 * Place and date, lifted out of the per-page LocationPicker form into one
 * provider every route can read (DESIGN.md §4.3). The LOGIC below is
 * LocationPicker.tsx's - city selection, geolocation, custom coordinates -
 * moved here; the UI that renders it lives in ContextBar.tsx.
 *
 * lib/falak/converter.ts's gregorianToHijri is called directly here (not
 * through lib/api.ts) to get the live Hijri equivalent DESIGN.md's mockup
 * shows beside the date picker - a read of an existing, already-validated,
 * unmodified export, same as every other consumer of this module.
 *
 * SSR-safe rendering: initial state MUST match the server-rendered default
 * exactly (defaultObservation()), with URL params and localStorage applied
 * in a useEffect after mount. This is the same pattern lib/permalink.ts's
 * own header comment documents for the pages that already read the query
 * string post-mount rather than during render - diverging from it here
 * would reintroduce the hydration mismatch that pattern exists to avoid.
 */

export interface HijriEquivalent {
  label: string;
  error?: string;
}

interface GeoState {
  locating: boolean;
  error: string | null;
  /** True only right after a successful "use my location" call, so ContextBar can show the transient "using your device location" caption LocationPicker used to - distinct from "a custom lat/lon that happens not to match a city for some other reason". */
  fromGeolocation: boolean;
}

export interface ObservationContextValue {
  lat: number;
  lon: number;
  dateIso: string;
  timeZone: string | null;
  matchedCity: CityLocation | null;
  hijri: HijriEquivalent;
  geo: GeoState;
  setCity: (city: CityLocation) => void;
  setCustomCoords: (lat: number, lon: number) => void;
  setDate: (dateIso: string) => void;
  requestGeolocation: () => void;
}

const ObservationContext = createContext<ObservationContextValue | null>(null);

export function useObservation(): ObservationContextValue {
  const ctx = useContext(ObservationContext);
  if (ctx === null) {
    throw new Error("useObservation must be used within an ObservationProvider");
  }
  return ctx;
}

export function ObservationProvider({ children }: { children: React.ReactNode }) {
  const [observation, setObservation] = useState<Observation>(defaultObservation);
  const [geo, setGeo] = useState<GeoState>({ locating: false, error: null, fromGeolocation: false });
  const [hydrated, setHydrated] = useState(false);

  // Post-mount only - see the module comment on why this can't happen during
  // the initial render.
  useEffect(() => {
    setObservation(resolveInitialObservation(readQueryParams()));
    setHydrated(true);
  }, []);

  // Mirror every change to both the URL and localStorage, but only once
  // hydrated - otherwise this would immediately overwrite a real permalink's
  // query params with the server-safe default before it's had a chance to
  // be read.
  useEffect(() => {
    if (!hydrated) return;
    writeQueryParams(observationToParams(observation));
    writeStoredObservation(observation);
  }, [observation, hydrated]);

  const setCity = useCallback((city: CityLocation) => {
    setGeo((g) => ({ ...g, error: null, fromGeolocation: false }));
    setObservation((o) => ({ ...o, lat: city.lat, lon: city.lon }));
  }, []);

  const setCustomCoords = useCallback((lat: number, lon: number) => {
    setGeo((g) => ({ ...g, fromGeolocation: false }));
    setObservation((o) => ({ ...o, lat, lon }));
  }, []);

  const setDate = useCallback((dateIso: string) => {
    setObservation((o) => ({ ...o, dateIso }));
  }, []);

  const requestGeolocation = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setGeo({ locating: false, error: "Geolocation isn't supported by this browser.", fromGeolocation: false });
      return;
    }
    setGeo({ locating: true, error: null, fromGeolocation: false });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setObservation((o) => ({ ...o, lat: position.coords.latitude, lon: position.coords.longitude }));
        setGeo({ locating: false, error: null, fromGeolocation: true });
      },
      (err) => {
        setGeo({
          locating: false,
          fromGeolocation: false,
          error:
            err.code === err.PERMISSION_DENIED
              ? "Location permission denied - allow it in your browser settings, or pick a city instead."
              : "Couldn't get your location. Pick a city instead.",
        });
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  }, []);

  const timeZone = useMemo(() => resolveTimeZone(observation.lat, observation.lon), [observation.lat, observation.lon]);
  const matchedCity = useMemo(() => matchCity(observation.lat, observation.lon), [observation.lat, observation.lon]);

  const hijri = useMemo<HijriEquivalent>(() => {
    try {
      const plainDate = parsePlainDate(observation.dateIso);
      const result = gregorianToHijri(plainDate, observation.lat, observation.lon);
      return { label: `${result.day} ${result.monthName} ${result.year}` };
    } catch (error) {
      // CLAUDE.md: no silent fallback. A date outside ephemeris range or an
      // unparseable value surfaces here explicitly rather than showing a
      // blank or guessed Hijri date.
      return { label: "—", error: error instanceof Error ? error.message : String(error) };
    }
  }, [observation.dateIso, observation.lat, observation.lon]);

  const value: ObservationContextValue = {
    lat: observation.lat,
    lon: observation.lon,
    dateIso: observation.dateIso,
    timeZone,
    matchedCity,
    hijri,
    geo,
    setCity,
    setCustomCoords,
    setDate,
    requestGeolocation,
  };

  return <ObservationContext.Provider value={value}>{children}</ObservationContext.Provider>;
}

// Re-exported so callers that only need the stored-observation read (e.g. a
// future page migrating off its own permalink logic) don't have to import
// both modules separately.
export { readStoredObservation };
