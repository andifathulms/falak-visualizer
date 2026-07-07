"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { motion } from "framer-motion";
import { Map, Loader2, Info, Search } from "lucide-react";
import { HisabDisclaimer } from "@/components/HisabDisclaimer";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, inputClasses } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { ApiError, fetchVisibilityGrid, VisibilityGridResult } from "@/lib/api";
import { todayIso } from "@/lib/date";
import { INDONESIAN_CITIES } from "@/lib/locations";
import { cn } from "@/lib/cn";

const LAT_RANGE: [number, number] = [-11, 6];
const LON_RANGE: [number, number] = [95, 141];
const WIDTH = 640;
const HEIGHT = 320;
const CELL = 8;

const METHOD_OPTIONS = [
  { value: "mabims_2021", label: "MABIMS 2021" },
  { value: "wujudul_hilal", label: "Wujudul Hilal" },
  { value: "odeh", label: "Odeh" },
];

// A handful of well-known cities spread across the archipelago, used purely
// as visual anchors ("oh, that's where Jakarta is") so the abstract grid
// reads as a map instead of a wall of squares - not every city, to avoid
// crowding a 640x320 chart.
const LABEL_CITY_NAMES = [
  "Banda Aceh",
  "Medan",
  "Jakarta",
  "Surabaya",
  "Denpasar",
  "Makassar",
  "Manado",
  "Kupang",
  "Ambon",
  "Jayapura",
];
const LABEL_CITIES = INDONESIAN_CITIES.filter((c) => LABEL_CITY_NAMES.includes(c.name));

type GridPoint = NonNullable<VisibilityGridResult["points"]>[number];

function isVisiblePoint(p: GridPoint) {
  return p.verdict === "True" || p.verdict === "visible" || p.verdict === "visible_optical_aid";
}

function nearestPoint(lat: number, lon: number, points: GridPoint[]): GridPoint | null {
  let best: GridPoint | null = null;
  let bestDist = Infinity;
  for (const p of points) {
    const d = (p.lat - lat) ** 2 + (p.lon - lon) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}

export default function VisibilityMapPage() {
  const [date, setDate] = useState("");
  const [method, setMethod] = useState("mabims_2021");
  const [result, setResult] = useState<VisibilityGridResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hover, setHover] = useState<{ x: number; y: number; point: GridPoint } | null>(null);
  const svgWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDate(todayIso());
  }, []);

  const xScale = useMemo(() => d3.scaleLinear().domain(LON_RANGE).range([0, WIDTH]), []);
  const yScale = useMemo(() => d3.scaleLinear().domain(LAT_RANGE).range([HEIGHT, 0]), []);

  async function load(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    setHover(null);
    try {
      const r = await fetchVisibilityGrid({ date, method });
      setResult(r);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reach the Falak API.");
    } finally {
      setLoading(false);
    }
  }

  const points = useMemo(() => result?.points ?? [], [result]);

  const cityMarkers = useMemo(() => {
    if (points.length === 0) return [];
    return LABEL_CITIES.map((city) => {
      const nearest = nearestPoint(city.lat, city.lon, points);
      return { city, visible: nearest ? isVisiblePoint(nearest) : null };
    });
  }, [points]);

  const summary = useMemo(() => {
    if (points.length === 0) return null;
    const visiblePoints = points.filter(isVisiblePoint);
    const percent = Math.round((visiblePoints.length / points.length) * 100);

    if (percent === 0) {
      return "Not visible anywhere in Indonesia yet on this evening, under this method.";
    }
    if (percent >= 97) {
      return "Visible essentially everywhere in Indonesia on this evening, under this method.";
    }

    const midLon = (LON_RANGE[0] + LON_RANGE[1]) / 2;
    const avgLon = d3.mean(visiblePoints, (p) => p.lon) ?? midLon;
    const eastWest = avgLon < midLon ? "the western part of Indonesia (toward Sumatra/Java)" : "the eastern part of Indonesia (toward Sulawesi/Papua)";

    return `Visible in about ${percent}% of Indonesia this evening — mostly concentrated in ${eastWest}.`;
  }, [points]);

  function handlePointerMove(e: React.MouseEvent<SVGRectElement>, point: GridPoint) {
    const wrap = svgWrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top, point });
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
          <Select label="Method" value={method} onChange={setMethod} options={METHOD_OPTIONS} />
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
          <Card className="p-5">
            {summary && (
              <p className="mb-3 text-sm text-neutral-700 dark:text-neutral-300">
                <strong className="font-semibold">{summary}</strong> Each square below is one calculated location —
                city names are landmarks to help you get your bearings, not extra data points.
              </p>
            )}

            <div ref={svgWrapRef} className="relative overflow-x-auto">
              <svg
                width={WIDTH}
                height={HEIGHT}
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                className="w-full max-w-full"
                role="img"
                aria-label="Indonesia hilal visibility grid"
                onMouseLeave={() => setHover(null)}
              >
                <defs>
                  <clipPath id="visibility-map-reveal">
                    <motion.rect
                      y={0}
                      height={HEIGHT}
                      initial={{ width: 0 }}
                      animate={{ width: WIDTH }}
                      transition={{ duration: 0.9, ease: "easeInOut" }}
                    />
                  </clipPath>
                </defs>

                <rect x={0} y={0} width={WIDTH} height={HEIGHT} rx={12} className="fill-neutral-100 dark:fill-night-900" />

                {/* Faint compass labels so the grid reads as oriented geography, not an arbitrary heatmap. */}
                <text x={8} y={14} className="fill-neutral-400 text-[10px] dark:fill-neutral-500">
                  W
                </text>
                <text x={WIDTH - 14} y={14} className="fill-neutral-400 text-[10px] dark:fill-neutral-500">
                  E
                </text>
                <text x={8} y={HEIGHT - 6} className="fill-neutral-400 text-[10px] dark:fill-neutral-500">
                  S
                </text>

                <g clipPath="url(#visibility-map-reveal)">
                  {result.points.map((p) => {
                    const visible = isVisiblePoint(p);
                    return (
                      <rect
                        key={`${p.lat}-${p.lon}`}
                        x={xScale(p.lon) - CELL / 2}
                        y={yScale(p.lat) - CELL / 2}
                        width={CELL - 1}
                        height={CELL - 1}
                        rx={1.5}
                        className={cn(
                          "transition-opacity",
                          visible ? "fill-moon-500" : "fill-neutral-300 dark:fill-night-700",
                        )}
                        onMouseMove={(e) => handlePointerMove(e, p)}
                      />
                    );
                  })}
                </g>

                {cityMarkers.map(({ city, visible }) => (
                  <g key={city.name}>
                    <circle
                      cx={xScale(city.lon)}
                      cy={yScale(city.lat)}
                      r={2.5}
                      className={visible === null ? "fill-neutral-400" : "fill-neutral-900 dark:fill-white"}
                      stroke="white"
                      strokeWidth={0.75}
                    />
                    <text
                      x={xScale(city.lon) + 5}
                      y={yScale(city.lat) + 3}
                      className="fill-neutral-700 text-[9px] font-medium dark:fill-neutral-200"
                      style={{ paintOrder: "stroke", stroke: "var(--card)", strokeWidth: 3 }}
                    >
                      {city.name}
                    </text>
                  </g>
                ))}
              </svg>

              {hover && (
                <div
                  className="glass-card pointer-events-none absolute z-10 max-w-[220px] rounded-lg px-3 py-2 text-xs shadow-lg"
                  style={{
                    left: Math.min(hover.x + 12, WIDTH - 160),
                    top: Math.max(hover.y - 60, 0),
                  }}
                >
                  <div className="font-semibold">
                    {isVisiblePoint(hover.point) ? "Likely visible here" : "Not visible here"}
                  </div>
                  <div className="mt-1 text-neutral-500 dark:text-neutral-400">
                    Moon altitude {hover.point.moon_altitude_deg.toFixed(1)}°, elongation{" "}
                    {hover.point.elongation_deg.toFixed(1)}°
                  </div>
                  <div className="mt-0.5 text-neutral-400 dark:text-neutral-500">
                    {hover.point.lat.toFixed(2)}, {hover.point.lon.toFixed(2)}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500 dark:text-neutral-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-moon-500" /> Criterion met (likely visible)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-neutral-300 dark:bg-night-700" /> Not met
                </span>
              </div>
              <span className="flex items-center gap-1.5">
                <Info className="size-3.5" /> Hover any square for the numbers behind it
              </span>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
