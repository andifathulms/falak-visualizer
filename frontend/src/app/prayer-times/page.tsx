"use client";

import { useState } from "react";
import { ApiError, fetchPrayerTimes, PrayerTimesResult } from "@/lib/api";

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";
}

export default function PrayerTimesPage() {
  const [date, setDate] = useState("2024-03-10");
  const [lat, setLat] = useState(-6.2);
  const [lon, setLon] = useState(106.8);
  const [result, setResult] = useState<PrayerTimesResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetchPrayerTimes({ date, lat, lon, convention: "Kemenag RI" });
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
        <h1 className="text-xl font-semibold">Prayer Times</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Kemenag RI convention (fajr 20°, isha 18°, Shafi&apos;i shadow-length asr) — computed from solar
          position for any coordinate and date. Times are shown in UTC; convert to local time using your
          timezone offset.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 rounded-lg border border-neutral-200 p-4 sm:grid-cols-4 dark:border-neutral-800">
        <label className="text-sm">
          Date
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

      {result && (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left dark:bg-neutral-900">
              <tr>
                {["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"].map((label) => (
                  <th key={label} className="px-4 py-2">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="font-mono">
                <td className="px-4 py-2">{formatTime(result.fajr)}</td>
                <td className="px-4 py-2">{formatTime(result.sunrise)}</td>
                <td className="px-4 py-2">{formatTime(result.dhuhr)}</td>
                <td className="px-4 py-2">{formatTime(result.asr)}</td>
                <td className="px-4 py-2">{formatTime(result.maghrib)}</td>
                <td className="px-4 py-2">{formatTime(result.isha)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
