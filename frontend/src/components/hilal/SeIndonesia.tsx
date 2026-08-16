"use client";

import { useId, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { motion } from "framer-motion";
import { Loader2, Info } from "lucide-react";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Button } from "@/components/ui/Button";
import { HorizonInstrument } from "@/components/HorizonInstrument";
import { useObservation } from "@/components/ObservationProvider";
import { ApiError, fetchVisibilityGrid, type HilalMethod, type VisibilityGridResult } from "@/lib/api";
import { GRID_POINT_COUNT, GRID_STEP_DEG } from "@/lib/falak/grid";
import { INDONESIAN_CITIES } from "@/lib/locations";
import indonesiaGeo from "@/lib/geo/indonesia.geo.json";
import { horizonReadingFromObservation, type InstrumentViewport } from "@/lib/instrumentGeometry";

/**
 * "Se-Indonesia" - one evening, every place (DESIGN.md §4.2/§6). The
 * absorbed replacement for /visibility-map: same D3 grid/coastline
 * machinery (untouched engine, restyled tokens), plus the connection
 * DESIGN.md says the old map was missing - "a cell is not a colour, it is
 * a horizon" - via a reduced-size HorizonInstrument that shows whichever
 * cell is hovered.
 *
 * The only sweep with an explicit trigger (DESIGN.md §4.3's stated
 * exception): ~3,255 points across Web Workers is not "fast and local" the
 * way a single evening's reading is, so date/method changes here do NOT
 * auto-recompute - the button and progress bar survive unchanged in
 * behaviour from the old page.
 *
 * GridPoint carries the full observation now (sun_altitude_deg,
 * illumination_fraction, lag_time_minutes, crescent_width_arcmin,
 * moon_age_hours), not just verdict/altitude/elongation - lib/falak/grid.ts
 * was widened for exactly this (migration step 5), returning more of an
 * already-computed object rather than computing anything new.
 */

const LAT_RANGE: [number, number] = [-11, 6];
const LON_RANGE: [number, number] = [95, 141];
const WIDTH = 640;
const LON_SPAN = LON_RANGE[1] - LON_RANGE[0];
const LAT_SPAN = LAT_RANGE[1] - LAT_RANGE[0];
const HEIGHT = Math.round((WIDTH * LAT_SPAN) / LON_SPAN);
const CELL = WIDTH / (LON_SPAN / GRID_STEP_DEG);

const HOVER_VIEWPORT: InstrumentViewport = { width: 280, height: 130 };

const METHOD_OPTIONS: Array<{ value: HilalMethod; label: string }> = [
  { value: "mabims_2021", label: "MABIMS 2021" },
  { value: "wujudul_hilal", label: "Wujudul Hilal" },
  { value: "odeh", label: "Odeh" },
];

const LABEL_CITY_NAMES = [
  "Banda Aceh", "Medan", "Padang", "Palembang", "Jakarta", "Surabaya",
  "Denpasar", "Kupang", "Pontianak", "Balikpapan", "Banjarmasin", "Manado",
  "Palu", "Kendari", "Makassar", "Ternate", "Ambon", "Jayapura",
];
const LABEL_LEFT = new Set(["Balikpapan"]);
const LABEL_CITIES = INDONESIAN_CITIES.filter((c) => LABEL_CITY_NAMES.includes(c.name));

const INDONESIA_FEATURE = indonesiaGeo.features.find((f) => f.properties.role === "focus")!
  .geometry as GeoJSON.MultiPolygon;
const NEIGHBOURS_FEATURE = indonesiaGeo.features.find((f) => f.properties.role === "context")!
  .geometry as GeoJSON.MultiPolygon;

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

export function SeIndonesia({ method, onMethodChange }: { method: HilalMethod; onMethodChange: (m: HilalMethod) => void }) {
  const uid = useId();
  const revealId = `${uid}-reveal`;
  const frameId = `${uid}-frame`;
  const { dateIso } = useObservation();
  const [result, setResult] = useState<VisibilityGridResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ completed: number; total: number } | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number; point: GridPoint } | null>(null);
  const svgWrapRef = useRef<HTMLDivElement>(null);

  const xScale = useMemo(() => d3.scaleLinear().domain(LON_RANGE).range([0, WIDTH]), []);
  const yScale = useMemo(() => d3.scaleLinear().domain(LAT_RANGE).range([HEIGHT, 0]), []);
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

  async function load() {
    setLoading(true);
    setError(null);
    setHover(null);
    setProgress({ completed: 0, total: GRID_POINT_COUNT });
    try {
      const r = await fetchVisibilityGrid({ date: dateIso, method }, setProgress);
      setResult(r);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menghitung grid visibilitas.");
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
      return { city, visible: nearest ? isVisiblePoint(nearest) : null, nearest };
    });
  }, [points]);

  const summary = useMemo(() => {
    if (points.length === 0) return null;
    const visiblePoints = points.filter(isVisiblePoint);
    const percent = Math.round((visiblePoints.length / points.length) * 100);
    if (percent === 0) return "Belum terlihat di mana pun di Indonesia pada petang ini, dengan metode ini.";
    if (percent >= 97) return "Terlihat hampir di seluruh Indonesia pada petang ini, dengan metode ini.";
    const midLon = (LON_RANGE[0] + LON_RANGE[1]) / 2;
    const avgLon = d3.mean(visiblePoints, (p) => p.lon) ?? midLon;
    const eastWest = avgLon < midLon ? "bagian barat Indonesia (arah Sumatra/Jawa)" : "bagian timur Indonesia (arah Sulawesi/Papua)";
    return `Terlihat di sekitar ${percent}% wilayah Indonesia petang ini — terutama di ${eastWest}.`;
  }, [points]);

  function handlePointerMove(e: React.MouseEvent<SVGRectElement>, point: GridPoint) {
    const wrap = svgWrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top, point });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1.5 block font-medium text-ink-muted">Metode</span>
          <select
            value={method}
            onChange={(e) => onMethodChange(e.target.value as HilalMethod)}
            className="h-11 rounded-lg border border-border bg-surface-card px-3 text-sm text-ink"
          >
            {METHOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <Button type="button" onClick={load} loading={loading}>
          {loading ? "Menghitung…" : "Hitung se-Indonesia"}
        </Button>
      </div>

      {error && <ErrorBanner message={error} />}

      {progress !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-accent-solid/30 bg-accent-solid/[0.07] px-4 py-3.5 text-sm text-ink"
        >
          <div className="flex items-center gap-3">
            <Loader2 className="size-4 shrink-0 animate-spin text-accent-solid" />
            <span>
              Menghitung visibilitas hilal di {progress.total.toLocaleString("id-ID")} lokasi se-Indonesia —{" "}
              {Math.round((progress.completed / progress.total) * 100)}% selesai.
            </span>
          </div>
          <div
            className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-accent-solid/20"
            role="progressbar"
            aria-valuenow={progress.completed}
            aria-valuemin={0}
            aria-valuemax={progress.total}
          >
            <div
              className="h-full rounded-full bg-accent-solid transition-[width] duration-fast"
              style={{ width: `${(progress.completed / progress.total) * 100}%` }}
            />
          </div>
        </motion.div>
      )}

      {result?.status === "ready" && result.points && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-4">
          {summary && (
            <p className="text-sm text-ink-muted">
              <strong className="font-semibold text-ink">{summary}</strong> Setiap kotak adalah satu
              lokasi terhitung — nama kota hanya penanda arah, bukan data tambahan.
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
            <div ref={svgWrapRef} className="relative overflow-x-auto">
              <svg
                width={WIDTH}
                height={HEIGHT}
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                className="h-auto w-full max-w-full"
                role="img"
                aria-label="Peta visibilitas hilal se-Indonesia"
                onMouseLeave={() => setHover(null)}
              >
                <defs>
                  <clipPath id={revealId}>
                    <motion.rect
                      y={0}
                      height={HEIGHT}
                      initial={{ width: 0 }}
                      animate={{ width: WIDTH }}
                      transition={{ duration: 0.9, ease: "easeInOut" }}
                    />
                  </clipPath>
                </defs>
                <clipPath id={frameId}>
                  <rect x={0} y={0} width={WIDTH} height={HEIGHT} rx={12} />
                </clipPath>

                <rect x={0} y={0} width={WIDTH} height={HEIGHT} rx={12} className="fill-surface-page" />

                <g clipPath={`url(#${frameId})`}>
                  <path d={neighboursPath} className="fill-ink-muted/5" />
                  <path d={indonesiaPath} className="fill-ink-muted/10" />
                </g>

                <text x={8} y={14} className="fill-ink-muted text-[10px]">W</text>
                <text x={WIDTH - 14} y={14} className="fill-ink-muted text-[10px]">E</text>
                <text x={8} y={HEIGHT - 6} className="fill-ink-muted text-[10px]">S</text>

                <g clipPath={`url(#${revealId})`}>
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
                            className="fill-verdict-lit/85"
                          />
                        ) : (
                          <circle cx={cx} cy={cy} r={1.15} className="fill-ink-muted/35" />
                        )}
                        {/* fill="transparent" alone does not reliably
                            receive pointer events (confirmed directly via
                            document.elementFromPoint during interactive
                            testing: events fell through to the sea rect
                            behind it). pointerEvents="all" forces hit-
                            testing regardless of paint state. */}
                        <rect
                          x={cx - CELL / 2}
                          y={cy - CELL / 2}
                          width={CELL}
                          height={CELL}
                          fill="transparent"
                          pointerEvents="all"
                          onMouseMove={(e) => handlePointerMove(e, p)}
                        />
                      </g>
                    );
                  })}
                </g>

                {/* pointerEvents="none" set on each path individually, not
                    just the parent <g>: confirmed via getComputedStyle
                    during interactive testing that it was NOT inheriting
                    down to these children, and coastline strokes drawn
                    after the data grid were silently eating the grid's
                    hover events as a result. */}
                <g clipPath={`url(#${frameId})`} fill="none" strokeLinejoin="round">
                  <path d={neighboursPath} className="stroke-ink-muted/30" strokeWidth={0.5} strokeOpacity={0.7} pointerEvents="none" />
                  <path d={indonesiaPath} className="stroke-surface-page" strokeWidth={2} strokeOpacity={0.7} pointerEvents="none" />
                  <path d={indonesiaPath} className="stroke-ink/70" strokeWidth={0.7} pointerEvents="none" />
                </g>

                {cityMarkers.map(({ city, visible }) => {
                  const cx = xScale(city.lon);
                  const flip = cx > WIDTH * 0.8 || LABEL_LEFT.has(city.name);
                  return (
                    <g key={city.name}>
                      <circle
                        cx={cx}
                        cy={yScale(city.lat)}
                        r={2.5}
                        className={visible === null ? "fill-ink-muted/50" : "fill-ink"}
                        stroke="var(--surface-page)"
                        strokeWidth={0.75}
                      />
                      <text
                        x={flip ? cx - 5 : cx + 5}
                        y={yScale(city.lat) + 3}
                        textAnchor={flip ? "end" : "start"}
                        className="fill-ink text-[9px] font-medium"
                        style={{ paintOrder: "stroke", stroke: "var(--surface-page)", strokeWidth: 3 }}
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
                  style={{ left: Math.min(hover.x + 12, WIDTH - 160), top: Math.max(hover.y - 40, 0) }}
                >
                  <div className="font-semibold">{isVisiblePoint(hover.point) ? "Kemungkinan terlihat" : "Tidak terlihat"}</div>
                  <div className="mt-1 text-ink-muted">
                    {hover.point.lat.toFixed(2)}, {hover.point.lon.toFixed(2)}
                  </div>
                </div>
              )}
            </div>

            {/* DESIGN.md §6: "Add the instrument at reduced size beside it,
                showing the hovered cell's sky...a cell is not a colour, it
                is a horizon." Falls back to the archipelago-wide summary
                point (its own tiny sky) when nothing is hovered, rather
                than an empty box. */}
            <div className="rounded-xl border border-border p-3">
              <p className="mb-2 text-xs font-medium text-ink-muted">
                {hover ? `${hover.point.lat.toFixed(1)}, ${hover.point.lon.toFixed(1)}` : "Arahkan kursor ke grid"}
              </p>
              {hover ? (
                <HorizonInstrument
                  reading={horizonReadingFromObservation(hover.point)}
                  viewport={HOVER_VIEWPORT}
                  showReadout={false}
                />
              ) : (
                <div
                  className="flex items-center justify-center rounded-lg bg-ink-muted/5 text-center text-xs text-ink-muted"
                  style={{ aspectRatio: `${HOVER_VIEWPORT.width} / ${HOVER_VIEWPORT.height}` }}
                >
                  Langit lokasi yang disorot akan muncul di sini
                </div>
              )}
            </div>
          </div>

          <details className="rounded-xl border border-border px-3.5 py-2.5 text-sm">
            <summary className="cursor-pointer list-none font-medium [&::-webkit-details-marker]:hidden">
              Hasil per kota{" "}
              <span className="font-normal text-ink-muted underline decoration-dotted underline-offset-2">
                ({cityMarkers.length} lokasi)
              </span>
            </summary>
            <div className="mt-2.5 overflow-x-auto">
              <table className="w-full min-w-max text-left text-xs">
                <caption className="sr-only">
                  Visibilitas hilal terhitung pada titik grid terdekat tiap kota berlabel, dengan altitude
                  dan elongasi bulan di sana.
                </caption>
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="px-3 py-2 font-medium text-ink-muted">Kota</th>
                    <th scope="col" className="px-3 py-2 font-medium text-ink-muted">Hasil</th>
                    <th scope="col" className="px-3 py-2 font-medium text-ink-muted">Altitude</th>
                    <th scope="col" className="px-3 py-2 font-medium text-ink-muted">Elongasi</th>
                  </tr>
                </thead>
                <tbody>
                  {cityMarkers.map(({ city, visible, nearest }) => (
                    <tr key={city.name} className="border-b border-border/60 last:border-0">
                      <th scope="row" className="whitespace-nowrap px-3 py-1.5 font-normal">{city.name}</th>
                      <td className="whitespace-nowrap px-3 py-1.5">
                        {visible === null ? "belum terselesaikan" : visible ? "Kemungkinan terlihat" : "Tidak terlihat"}
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

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-ink-muted">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-verdict-lit" /> Kriteria terpenuhi (kemungkinan terlihat)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-1 rounded-full bg-ink-muted/35" /> Terhitung, kriteria belum terpenuhi
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-ink-muted/10 ring-1 ring-ink-muted/30" /> Daratan
              </span>
            </div>
            <span className="flex items-center gap-1.5">
              <Info className="size-3.5" /> Arahkan kursor ke grid untuk melihat angka di baliknya
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
