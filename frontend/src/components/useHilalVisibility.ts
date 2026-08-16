"use client";

import { useEffect, useState } from "react";
import { ApiError, fetchHilalVisibility, type HilalObservation } from "@/lib/api";

/**
 * The place+date -> single-evening-observation fetch, shared by PetangIni
 * (/hilal) and the home page (migration step 8) - both need the exact same
 * live computation, and duplicating the effect risked the two drifting
 * (e.g. one page's error copy or cancellation handling quietly diverging
 * from the other's). Extracted rather than left inline once there were two
 * real call sites, not preemptively.
 */
export interface HilalVisibilityState {
  obs: HilalObservation | null;
  error: string | null;
  loading: boolean;
}

export function useHilalVisibility(dateIso: string, lat: number, lon: number): HilalVisibilityState {
  const [obs, setObs] = useState<HilalObservation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchHilalVisibility({ date: dateIso, lat, lon })
      .then((r) => {
        if (cancelled) return;
        setObs(r);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Perhitungan gagal.");
        setObs(null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dateIso, lat, lon]);

  return { obs, error, loading };
}
