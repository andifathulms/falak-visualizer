"use client";

import { useEffect, useMemo, useState } from "react";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useObservation } from "@/components/ObservationProvider";
import { ApiError, fetchRashdulQibla, type RashdulQiblaResult } from "@/lib/api";
import { qiblaDirection } from "@/lib/falak/qibla";

/** /kiblat - bearing, distance, Rashdul Qibla (DESIGN.md v2 §6). */
export default function KiblatPage() {
  const { lat, lon, timeZone } = useObservation();
  const qibla = useMemo(() => qiblaDirection(lat, lon), [lat, lon]);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [rashdul, setRashdul] = useState<RashdulQiblaResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetchRashdulQibla({ year })
      .then((r) => !cancelled && setRashdul(r))
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : "Perhitungan gagal."));
    return () => {
      cancelled = true;
    };
  }, [year]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Arah kiblat</h1>
      <dl className="card flex flex-wrap gap-x-10 gap-y-3 p-5">
        <div>
          <dt className="text-2xs font-semibold text-ink-muted">Arah dari utara sejati</dt>
          <dd className="text-3xl font-extrabold tabular-nums">{qibla.bearingDeg.toFixed(1)}°</dd>
        </div>
        <div>
          <dt className="text-2xs font-semibold text-ink-muted">Jarak ke Ka&apos;bah</dt>
          <dd className="text-3xl font-extrabold tabular-nums">{Math.round(qibla.distanceKm).toLocaleString("id-ID")} km</dd>
        </div>
      </dl>
      <section className="card space-y-3 p-5">
        <h2 className="text-md font-bold">Rashdul Kiblat {year}</h2>
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="h-10 w-28 rounded-control border border-border bg-surface-page px-3 text-sm"
          aria-label="Tahun"
        />
        {error && <ErrorBanner message={error} />}
        {rashdul && (
          <ul className="grid gap-3 sm:grid-cols-2">
            {rashdul.events.map((e) => (
              <li key={e.direction} className="rounded-control bg-surface-raised p-4 text-lg font-bold tabular-nums">
                {new Date(e.utc_time).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: timeZone ?? "UTC" })}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
