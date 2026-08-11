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
import { GRID_POINT_COUNT, GRID_STEP_DEG } from "@/lib/falak/grid";
import { todayIso } from "@/lib/date";
import { INDONESIAN_CITIES } from "@/lib/locations";
import indonesiaGeo from "@/lib/geo/indonesia.geo.json";
import { ResultAnnouncer } from "@/components/ResultAnnouncer";

const LAT_RANGE: [number, number] = [-11, 6];
const LON_RANGE: [number, number] = [95, 141];
const WIDTH = 640;

// Height follows from the width so that a degree of longitude and a degree of
// latitude get the same number of pixels. The old 640x320 box stretched 17
// degrees of latitude over the same span as 46 of longitude, which was harmless
// when this was an abstract lattice but visibly deforms a real coastline.
//
// Equal scaling also makes the grid cells square without being asked: 0.5
// degrees is 0.5 degrees on both axes.
const LON_SPAN = LON_RANGE[1] - LON_RANGE[0];
const LAT_SPAN = LAT_RANGE[1] - LAT_RANGE[0];
const HEIGHT = Math.round((WIDTH * LAT_SPAN) / LON_SPAN);

// One cell per grid step, derived rather than guessed - the previous fixed 8px
// was wider than the 6.96px longitude spacing, so columns overlapped and the map
// read as horizontal stripes.
const CELL = WIDTH / (LON_SPAN / GRID_STEP_DEG);

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

// Real coastlines, extracted from Natural Earth at build time by
// scripts/build-indonesia-geo.mjs and committed - not fetched from a CDN, which
// would put a runtime dependency back into an app that deliberately has none.
const INDONESIA_FEATURE = indonesiaGeo.features.find((f) => f.properties.role === "focus")!
  .geometry as GeoJSON.MultiPolygon;
const NEIGHBOURS_FEATURE = indonesiaGeo.features.find((f) => f.properties.role === "context")!
  .geometry as GeoJSON.MultiPolygon;

// The geometry file records the window it was built for. If someone changes the
// map's extent without regenerating it, the coastlines would silently sit a few
// degrees off the grid squares - visually plausible and completely wrong.
if (
  indonesiaGeo.view.lonMin !== LON_RANGE[0] ||
  indonesiaGeo.view.lonMax !== LON_RANGE[1] ||
  indonesiaGeo.view.latMin !== LAT_RANGE[0] ||
  indonesiaGeo.view.latMax !== LAT_RANGE[1]
) {
  throw new Error(
    "indonesia.geo.json was built for a different lat/lon window than the map draws; " +
      "re-run `node scripts/build-indonesia-geo.mjs` after changing LAT_RANGE/LON_RANGE",
  );
}

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
  // The grid is ~3,255 hilal observations computed in this browser, which takes
  // seconds rather than milliseconds - so show real progress instead of an
  // indefinite spinner.
  const [progress, setProgress] = useState<{ completed: number; total: number } | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number; point: GridPoint } | null>(null);
  const svgWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDate(todayIso());
  }, []);

  const xScale = useMemo(() => d3.scaleLinear().domain(LON_RANGE).range([0, WIDTH]), []);
  const yScale = useMemo(() => d3.scaleLinear().domain(LAT_RANGE).range([HEIGHT, 0]), []);

  // Project the coastlines through the *same* scales the grid squares use,
  // rather than fitting a d3 projection to the box independently. Two ways of
  // computing the same mapping is how a map ends up half a degree out of
  // register with its own data.
  const geoPath = useMemo(
    () =>
      d3.geoPath(
        d3.geoTransform({
          point(lon: number, lat: number) {
            this.stream.point(xScale(lon), yScale(lat));
          },
        }),
      ),
    [xScale, yScale],
  );

  const indonesiaPath = useMemo(() => geoPath(INDONESIA_FEATURE) ?? "", [geoPath]);
  const neighboursPath = useMemo(() => geoPath(NEIGHBOURS_FEATURE) ?? "", [geoPath]);

  async function load(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    setHover(null);
    setProgress({ completed: 0, total: GRID_POINT_COUNT });
    try {
      const r = await fetchVisibilityGrid({ date, method }, setProgress);
      setResult(r);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to compute the visibility grid.");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }

  const points = useMemo(() => result?.points ?? [], [result]);

  const cityMarkers = useMemo(() => {
    if (points.length === 0) return [];
    return LABEL_CITIES.map((city) => {
      const nearest = nearestPoint(city.lat, city.lon, points);
      // The nearest point itself is kept, not just its verdict: the city table
      // below is the keyboard and screen reader route to the per-location
      // numbers that were otherwise only reachable by hovering a grid square.
      return { city, visible: nearest ? isVisiblePoint(nearest) : null, nearest };
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
      <ResultAnnouncer message={result ? `Map ready. ${summary ?? ""}` : null} />
      <PageHeader
        icon={Map}
        title="Visibility Map (Indonesia)"
        description="Calculated hilal visibility across a 0.5° lat/lon grid — 3,255 locations, computed in your browser when you press Load grid."
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

      {progress !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-moon-500/30 bg-moon-500/[0.07] px-4 py-3.5 text-sm text-neutral-700 dark:text-neutral-300"
        >
          <div className="flex items-center gap-3">
            <Loader2 className="size-4 shrink-0 animate-spin text-moon-500" />
            <span>
              Calculating hilal visibility at {progress.total.toLocaleString()} locations across
              Indonesia — {Math.round((progress.completed / progress.total) * 100)}% done.
            </span>
          </div>
          <div
            className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-moon-500/20"
            role="progressbar"
            aria-valuenow={progress.completed}
            aria-valuemin={0}
            aria-valuemax={progress.total}
          >
            <div
              className="h-full rounded-full bg-moon-500 transition-[width] duration-200"
              style={{ width: `${(progress.completed / progress.total) * 100}%` }}
            />
          </div>
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
                // h-auto lets the height follow the width through the viewBox's
                // aspect ratio. With a fixed height attribute and a stretched
                // width, the map was letterboxed inside its own card.
                className="h-auto w-full max-w-full"
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

                <clipPath id="visibility-map-frame">
                  <rect x={0} y={0} width={WIDTH} height={HEIGHT} rx={12} />
                </clipPath>

                {/* Sea. */}
                <rect x={0} y={0} width={WIDTH} height={HEIGHT} rx={12} className="fill-neutral-100 dark:fill-night-900" />

                {/*
                  Land fill, beneath the data. Neighbouring countries are dimmer
                  than Indonesia: they orient the reader without implying the
                  grid covers them, which it does not - the MVP is Indonesia-only
                  (PRD 4.2/10). The coastline stroke is drawn after the data, not
                  here; see below.
                */}
                <g clipPath="url(#visibility-map-frame)">
                  <path d={neighboursPath} className="fill-land-light-context dark:fill-land-dark-context" />
                  <path d={indonesiaPath} className="fill-land-light dark:fill-land-dark" />
                </g>

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

                {/*
                  The data. Two marks rather than two colours: a filled square
                  where the criterion is met, a small dot where it is not. The
                  shape difference means the verdict never rests on colour alone
                  - which also lets the "not met" lattice stay recessive enough
                  for the coastline to read through it.

                  Every point gets a transparent hit rect a full cell wide, so
                  the hover target is bigger than the mark it reveals.
                */}
                <g clipPath="url(#visibility-map-reveal)">
                  {result.points.map((p) => {
                    const visible = isVisiblePoint(p);
                    const cx = xScale(p.lon);
                    const cy = yScale(p.lat);
                    return (
                      <g key={`${p.lat}-${p.lon}`}>
                        {visible ? (
                          <rect
                            x={cx - CELL / 2}
                            y={cy - CELL / 2}
                            width={CELL - 1}
                            height={CELL - 1}
                            rx={1.5}
                            // Slightly translucent so the land beneath stays
                            // legible. On an evening when the criterion is met
                            // everywhere - which is common, and exactly when
                            // people look - an opaque field would erase the
                            // archipelago and leave a rectangle of colour.
                            className="fill-moon-700/85 dark:fill-moon-400/85"
                          />
                        ) : (
                          <circle cx={cx} cy={cy} r={1.15} className="fill-lattice-light dark:fill-lattice-dark" />
                        )}
                        <rect
                          x={cx - CELL / 2}
                          y={cy - CELL / 2}
                          width={CELL}
                          height={CELL}
                          fill="transparent"
                          onMouseMove={(e) => handlePointerMove(e, p)}
                        />
                      </g>
                    );
                  })}
                </g>

                {/*
                  Coastline over the data, the way boundaries sit above the fill
                  on any choropleth. Drawn beneath it instead, the outline
                  disappears the moment the criterion is met everywhere - which
                  is exactly when the map is most worth looking at.
                */}
                <g clipPath="url(#visibility-map-frame)" fill="none" pointerEvents="none" strokeLinejoin="round">
                  <path
                    d={neighboursPath}
                    className="stroke-land-light-coast dark:stroke-land-dark-coast"
                    strokeWidth={0.5}
                    strokeOpacity={0.7}
                  />
                  {/*
                    Two passes: a soft light halo, then a thin dark core. A single
                    stroke cannot hold up here - the same line has to cross pale
                    sea and saturated teal fill, and any one colour disappears
                    against one of them.
                  */}
                  <path d={indonesiaPath} className="stroke-white/70 dark:stroke-black/45" strokeWidth={2} />
                  <path
                    d={indonesiaPath}
                    className="stroke-neutral-700/80 dark:stroke-white/70"
                    strokeWidth={0.7}
                  />
                </g>

                {cityMarkers.map(({ city, visible }) => {
                  // Jayapura sits within a degree of the eastern edge, so a
                  // label drawn to its right runs off the map. Anything in the
                  // last fifth of the width flips to the other side of its dot.
                  const cx = xScale(city.lon);
                  const flip = cx > WIDTH * 0.8;
                  return (
                    <g key={city.name}>
                      <circle
                        cx={cx}
                        cy={yScale(city.lat)}
                        r={2.5}
                        className={visible === null ? "fill-neutral-400" : "fill-neutral-900 dark:fill-white"}
                        stroke="white"
                        strokeWidth={0.75}
                      />
                      <text
                        x={flip ? cx - 5 : cx + 5}
                        y={yScale(city.lat) + 3}
                        textAnchor={flip ? "end" : "start"}
                        className="fill-neutral-700 text-[9px] font-medium dark:fill-neutral-200"
                        style={{ paintOrder: "stroke", stroke: "var(--card)", strokeWidth: 3 }}
                      >
                        {city.name}
                      </text>
                    </g>
                  );
                })}
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
                  <div className="mt-1 text-ink-muted">
                    Moon altitude {hover.point.moon_altitude_deg.toFixed(1)}°, elongation{" "}
                    {hover.point.elongation_deg.toFixed(1)}°
                  </div>
                  <div className="mt-0.5 text-ink-muted">
                    {hover.point.lat.toFixed(2)}, {hover.point.lon.toFixed(2)}
                  </div>
                </div>
              )}
            </div>

            {/* Keyboard, screen reader and touch route to the per-location
                figures. The 3,000 grid squares carry their numbers on
                onMouseMove alone, and making each one a tab stop would be a
                3,000-stop tab sequence - worse than useless. These ten cities
                are already the map's landmarks, already computed, and give
                every user the same kind of answer the tooltip gives a mouse. */}
            <details className="mt-3 rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm dark:border-night-700/60">
              <summary className="cursor-pointer list-none font-medium [&::-webkit-details-marker]:hidden">
                Results by city{" "}
                <span className="font-normal text-ink-muted underline decoration-dotted underline-offset-2">
                  ({cityMarkers.length} locations)
                </span>
              </summary>
              <div className="mt-2.5 overflow-x-auto">
                <table className="w-full min-w-max text-left text-xs">
                  <caption className="sr-only">
                    Calculated hilal visibility at the nearest grid point to each labelled city, with
                    the moon altitude and elongation there.
                  </caption>
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-night-700/60">
                      <th scope="col" className="px-3 py-2 font-medium text-ink-muted">City</th>
                      <th scope="col" className="px-3 py-2 font-medium text-ink-muted">Verdict</th>
                      <th scope="col" className="px-3 py-2 font-medium text-ink-muted">Altitude</th>
                      <th scope="col" className="px-3 py-2 font-medium text-ink-muted">Elongation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cityMarkers.map(({ city, visible, nearest }) => (
                      <tr
                        key={city.name}
                        className="border-b border-neutral-100 last:border-0 dark:border-night-700/40"
                      >
                        <th scope="row" className="whitespace-nowrap px-3 py-1.5 font-normal">
                          {city.name}
                        </th>
                        <td className="whitespace-nowrap px-3 py-1.5">
                          {visible === null
                            ? "unresolved"
                            : visible
                              ? "Likely visible"
                              : "Not visible"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-1.5 font-mono tabular-nums">
                          {nearest ? `${nearest.moon_altitude_deg.toFixed(1)}°` : "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-1.5 font-mono tabular-nums">
                          {nearest ? `${nearest.elongation_deg.toFixed(1)}°` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-muted">
              {/* Swatches mirror the marks' shapes, not just their colours, so
                  the legend reads the same way the map does. */}
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-moon-700 dark:bg-moon-400" /> Criterion met (likely visible)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-1 rounded-full bg-lattice-light dark:bg-lattice-dark" /> Calculated, criterion
                  not met
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-land-light ring-1 ring-land-light-coast dark:bg-land-dark dark:ring-land-dark-coast" />{" "}
                  Land
                </span>
              </div>
              <span className="flex items-center gap-1.5">
                <Info className="size-3.5" /> Hover anywhere on the grid for the numbers behind it
              </span>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
