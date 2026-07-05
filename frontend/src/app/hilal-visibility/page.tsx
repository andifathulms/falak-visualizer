"use client";

import { useState } from "react";
import { HisabDisclaimer } from "@/components/HisabDisclaimer";
import { ApiError, fetchHilalVisibility, HilalObservation } from "@/lib/api";

function verdictBadge(met: boolean | string) {
  const visible = met === true || met === "visible" || met === "visible_optical_aid";
  const color = visible
    ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
    : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300";
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${color}`}>{String(met)}</span>;
}

export default function HilalVisibilityPage() {
  const [date, setDate] = useState("2024-04-09");
  const [lat, setLat] = useState(-6.2);
  const [lon, setLon] = useState(106.8);
  const [obs, setObs] = useState<HilalObservation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setObs(null);
    try {
      const r = await fetchHilalVisibility({ date, lat, lon });
      setObs(r);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reach the Falak API.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Hilal Visibility</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Numeric conditions at sunset on the given evening (intended for the 29th of a Hijri month), classified
          against three criteria side by side.
        </p>
      </div>

      <HisabDisclaimer />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 rounded-lg border border-neutral-200 p-4 sm:grid-cols-4 dark:border-neutral-800">
        <label className="text-sm">
          Date (evening)
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>
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

      {obs && (
        <div className="space-y-4">
          <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <h2 className="font-medium">Observational numbers</h2>
            <dl className="mt-2 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              {[
                ["Conjunction (UTC)", obs.conjunction_time_utc],
                ["Sunset (UTC)", obs.sunset_time_utc],
                ["Moonset (UTC)", obs.moonset_time_utc ?? "—"],
                ["Moon altitude", `${obs.moon_altitude_deg.toFixed(2)}°`],
                ["Elongation", `${obs.elongation_deg.toFixed(2)}°`],
                ["Moon age", `${obs.moon_age_hours.toFixed(1)} h`],
                ["Illumination", `${(obs.illumination_fraction * 100).toFixed(2)}%`],
                ["Lag time", obs.lag_time_minutes != null ? `${obs.lag_time_minutes.toFixed(1)} min` : "—"],
                ["Crescent width", `${obs.crescent_width_arcmin.toFixed(2)}'`],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-neutral-500 dark:text-neutral-400">{label}</dt>
                  <dd className="font-mono">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left dark:bg-neutral-900">
                <tr>
                  <th className="px-4 py-2">Criterion</th>
                  <th className="px-4 py-2">Rule</th>
                  <th className="px-4 py-2">Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                <tr>
                  <td className="px-4 py-2 font-medium">Wujudul Hilal</td>
                  <td className="px-4 py-2 text-neutral-600 dark:text-neutral-400">
                    Conjunction before sunset, moonset after sunset
                  </td>
                  <td className="px-4 py-2">{verdictBadge(obs.criteria.wujudul_hilal)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">MABIMS 2021</td>
                  <td className="px-4 py-2 text-neutral-600 dark:text-neutral-400">
                    Altitude ≥ 3°, elongation ≥ 6.4°
                  </td>
                  <td className="px-4 py-2">{verdictBadge(obs.criteria.mabims_2021)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">Odeh</td>
                  <td className="px-4 py-2 text-neutral-600 dark:text-neutral-400">
                    Continuous classification (ARCV vs. crescent width)
                  </td>
                  <td className="px-4 py-2">{verdictBadge(obs.criteria.odeh)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            These criteria can and do disagree — that is expected, not a bug. This tool does not advocate for one
            method.
          </p>
        </div>
      )}
    </div>
  );
}
