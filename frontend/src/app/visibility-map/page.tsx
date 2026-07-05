"use client";

import { useMemo, useState } from "react";
import * as d3 from "d3";
import { motion } from "framer-motion";
import { Map, Loader2, Info, Search } from "lucide-react";
import { HisabDisclaimer } from "@/components/HisabDisclaimer";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, inputClasses } from "@/components/ui/Field";
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
      <PageHeader
        icon={Map}
        title="Visibility Map (Indonesia)"
        description="Choropleth of calculated hilal visibility across a 0.5° lat/lon grid, precomputed by a background Celery task rather than on request."
      />

      <HisabDisclaimer />

      <Card className="p-5">
        <form onSubmit={load} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-4">
          <Field label="Date (evening)">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="Method">
            <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputClasses}>
              <option value="mabims_2021">MABIMS 2021</option>
              <option value="wujudul_hilal">Wujudul Hilal</option>
              <option value="odeh">Odeh</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" loading={loading} className="w-full">
              {!loading && <Search className="size-4" />}
              {loading ? "Loading…" : "Load grid"}
            </Button>
          </div>
        </form>
      </Card>

      {error && <ErrorBanner message={error} />}

      {result?.status === "computing" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 rounded-xl border border-moon-500/30 bg-moon-500/[0.07] px-4 py-3.5 text-sm text-neutral-700 dark:text-neutral-300"
        >
          <Loader2 className="size-4 shrink-0 animate-spin text-moon-500" />
          The grid for this date/method isn&apos;t cached yet — a background task has been queued to compute it.
          Try &quot;Load grid&quot; again in a moment.
        </motion.div>
      )}

      {result?.status === "ready" && result.points && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <Card className="overflow-x-auto p-5">
            <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full max-w-full" role="img" aria-label="Indonesia hilal visibility grid">
              <rect x={0} y={0} width={WIDTH} height={HEIGHT} rx={12} className="fill-neutral-100 dark:fill-night-900" />
              {result.points.map((p) => {
                const visible = p.verdict === "True" || p.verdict === "visible" || p.verdict === "visible_optical_aid";
                return (
                  <rect
                    key={`${p.lat}-${p.lon}`}
                    x={xScale(p.lon) - CELL / 2}
                    y={yScale(p.lat) - CELL / 2}
                    width={CELL - 1}
                    height={CELL - 1}
                    rx={1.5}
                    className={visible ? "fill-moon-500" : "fill-neutral-300 dark:fill-night-700"}
                  >
                    <title>
                      {`(${p.lat}, ${p.lon}) alt=${p.moon_altitude_deg.toFixed(2)}° elong=${p.elongation_deg.toFixed(2)}° -> ${p.verdict}`}
                    </title>
                  </rect>
                );
              })}
            </svg>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500 dark:text-neutral-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-moon-500" /> Criterion met
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-neutral-300 dark:bg-night-700" /> Not met
                </span>
              </div>
              <span className="flex items-center gap-1.5">
                <Info className="size-3.5" /> Hover a cell for altitude/elongation
              </span>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
