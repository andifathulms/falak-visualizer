"use client";

import { useState } from "react";
import { ApiError, fetchQibla, QiblaResult } from "@/lib/api";

function CompassSvg({ bearingDeg }: { bearingDeg: number }) {
  const size = 220;
  const center = size / 2;
  const radius = size / 2 - 12;
  const rad = (bearingDeg * Math.PI) / 180;
  const tipX = center + radius * Math.sin(rad);
  const tipY = center - radius * Math.cos(rad);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Qibla bearing ${bearingDeg.toFixed(1)} degrees`}>
      <circle cx={center} cy={center} r={radius} className="fill-none stroke-neutral-300 dark:stroke-neutral-700" strokeWidth={2} />
      {["N", "E", "S", "W"].map((label, i) => {
        const angle = (i * 90 * Math.PI) / 180;
        const x = center + (radius + 14) * Math.sin(angle);
        const y = center - (radius + 14) * Math.cos(angle) + 4;
        return (
          <text key={label} x={x} y={y} textAnchor="middle" className="fill-neutral-500 text-xs dark:fill-neutral-400">
            {label}
          </text>
        );
      })}
      <line x1={center} y1={center} x2={tipX} y2={tipY} className="stroke-green-600 dark:stroke-green-400" strokeWidth={3} strokeLinecap="round" />
      <circle cx={tipX} cy={tipY} r={5} className="fill-green-600 dark:fill-green-400" />
      <circle cx={center} cy={center} r={3} className="fill-neutral-900 dark:fill-neutral-100" />
    </svg>
  );
}

export default function QiblaPage() {
  const [lat, setLat] = useState(-6.2);
  const [lon, setLon] = useState(106.8);
  const [result, setResult] = useState<QiblaResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetchQibla({ lat, lon });
      setResult(r);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reach the Falak API.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Qibla Direction</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Great-circle bearing and distance to the Kaaba (21.4225°N, 39.8262°E) from any coordinate.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 rounded-lg border border-neutral-200 p-4 sm:grid-cols-3 dark:border-neutral-800">
        <label className="text-sm">
          Latitude
          <input
            type="number"
            step="0.0001"
            value={lat}
            onChange={(e) => setLat(Number(e.target.value))}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>
        <label className="text-sm">
          Longitude
          <input
            type="number"
            step="0.0001"
            value={lon}
            onChange={(e) => setLon(Number(e.target.value))}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
          >
            {loading ? "Computing…" : "Compute"}
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      {result && (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-neutral-200 p-6 sm:flex-row sm:justify-around dark:border-neutral-800">
          <CompassSvg bearingDeg={result.bearing_deg} />
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Bearing (from true north)</dt>
              <dd className="text-lg font-mono">{result.bearing_deg.toFixed(2)}°</dd>
            </div>
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Distance to Mecca</dt>
              <dd className="text-lg font-mono">{result.distance_km.toFixed(1)} km</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
