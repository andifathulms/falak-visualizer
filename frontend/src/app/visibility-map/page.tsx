"use client";

import { useMemo, useState } from "react";
import * as d3 from "d3";
import { HisabDisclaimer } from "@/components/HisabDisclaimer";
import { ApiError, fetchVisibilityGrid, VisibilityGridResult } from "@/lib/api";

const LAT_RANGE: [number, number] = [-11, 6];
const LON_RANGE: [number, number] = [95, 141];
const WIDTH = 640;
const HEIGHT = 320;
const CELL = 8;

export default function VisibilityMapPage() {
  const [date, setDate] = useState("2024-04-09");
  const [method, setMethod] = useState("mabims_2021");
  const [result, setResult] = useState<VisibilityGridResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const xScale = useMemo(() => d3.scaleLinear().domain(LON_RANGE).range([0, WIDTH]), []);
  const yScale = useMemo(() => d3.scaleLinear().domain(LAT_RANGE).range([HEIGHT, 0]), []);

  async function load(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const r = await fetchVisibilityGrid({ date, method });
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
        <h1 className="text-xl font-semibold">Visibility Map (Indonesia)</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Choropleth of calculated hilal visibility across a 0.5° lat/lon grid, precomputed by a background
          Celery task rather than on request. This is an approximate grid rendering (lat/lon axes, not
          coastline outlines) - see note below.
        </p>
      </div>

      <HisabDisclaimer />

      <form onSubmit={load} className="grid grid-cols-1 gap-3 rounded-lg border border-neutral-200 p-4 sm:grid-cols-4 dark:border-neutral-800">
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
          Method
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="mabims_2021">MABIMS 2021</option>
            <option value="wujudul_hilal">Wujudul Hilal</option>
            <option value="odeh">Odeh</option>
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
          >
            {loading ? "Loading…" : "Load grid"}
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      {result?.status === "computing" && (
        <div className="rounded-md border border-blue-300 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
          The grid for this date/method isn&apos;t cached yet — a background task has been queued to compute it.
          Try &quot;Load grid&quot; again in a moment.
        </div>
      )}

      {result?.status === "ready" && result.points && (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <svg width={WIDTH} height={HEIGHT} role="img" aria-label="Indonesia hilal visibility grid">
            <rect x={0} y={0} width={WIDTH} height={HEIGHT} className="fill-neutral-50 dark:fill-neutral-900" />
            {result.points.map((p) => {
              const visible = p.verdict === "True" || p.verdict === "visible" || p.verdict === "visible_optical_aid";
              return (
                <rect
                  key={`${p.lat}-${p.lon}`}
                  x={xScale(p.lon) - CELL / 2}
                  y={yScale(p.lat) - CELL / 2}
                  width={CELL}
                  height={CELL}
                  className={visible ? "fill-green-500" : "fill-neutral-300 dark:fill-neutral-700"}
                >
                  <title>
                    {`(${p.lat}, ${p.lon}) alt=${p.moon_altitude_deg.toFixed(2)}° elong=${p.elongation_deg.toFixed(2)}° -> ${p.verdict}`}
                  </title>
                </rect>
              );
            })}
          </svg>
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            Green = criterion met at that grid point. Axes: longitude (x, 95°–141°E), latitude (y, 11°S–6°N).
            Hover a cell for the underlying numbers.
          </p>
        </div>
      )}
    </div>
  );
}
