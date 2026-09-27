"use client";

import { useEffect, useId, useMemo, useState } from "react";
import * as d3 from "d3";
import { Loader2 } from "lucide-react";
import { ErrorBanner } from "@/components/ErrorBanner";
import { HorizonInstrument } from "@/components/HorizonInstrument";
import { VerdictIcon } from "@/components/VerdictPill";
import { ApiError, fetchVisibilityGrid, type HilalMethod, type VisibilityGridResult } from "@/lib/api";
import { CRITERIA } from "@/lib/criteria";
import { contourPath } from "@/lib/contours";
import { GRID_POINT_COUNT, GRID_STEP_DEG } from "@/lib/falak/grid";
import { INDONESIAN_CITIES } from "@/lib/locations";
import indonesiaGeo from "@/lib/geo/indonesia.geo.json";
import { horizonReadingFromObservation, type InstrumentViewport } from "@/lib/instrumentGeometry";
import { SKY_INK, SKY_LIT } from "@/lib/skyPalette";

/**
 * IndonesiaMap (DESIGN.md v2 §5.5): one evening, every place. Moon altitude at
 * sunset shaded continuously across the 0.5° grid, contour lines every 1° (the
 * BMKG altitude-map convention falak teachers already read), a bold line where
 * the selected criterion flips, and the not-met side hatched so the verdict
 * never rests on colour alone.
 *
 * Computed on entry - no button - across Web Workers with a progress bar, and
 * cached per evening and criterion so switching tabs never recomputes.
 */

const LAT_RANGE: [number, number] = [-11, 6];
const LON_RANGE: [number, number] = [95, 141];
const WIDTH = 920;
const HEIGHT = Math.round((WIDTH * (LAT_RANGE[1] - LAT_RANGE[0])) / (LON_RANGE[1] - LON_RANGE[0]));
const CELL = WIDTH / ((LON_RANGE[1] - LON_RANGE[0]) / GRID_STEP_DEG);
const ROWS = Math.round((LAT_RANGE[1] - LAT_RANGE[0]) / GRID_STEP_DEG) + 1;
const COLS = Math.round((LON_RANGE[1] - LON_RANGE[0]) / GRID_STEP_DEG) + 1;

/** Altitude colour ramp, drawn on the dark map panel in both themes (sky palette family). */
const RAMP: Array<[number, string]> = [
  [-6, "#161838"],
  [0, "#34307a"],
  [3, "#7d4f96"],
  [6, "#d0786a"],
  [10, "#f6d78b"],
];
const rampColor = d3
  .scaleLinear<string>()
  .domain(RAMP.map((r) => r[0]))
  .range(RAMP.map((r) => r[1]))
  .interpolate(d3.interpolateRgb)
  .clamp(true);

const LABEL_CITY_NAMES = ["Banda Aceh", "Medan", "Padang", "Palembang", "Jakarta", "Surabaya", "Denpasar", "Kupang", "Pontianak", "Balikpapan", "Makassar", "Manado", "Ambon", "Jayapura"];
const LABEL_CITIES = INDONESIAN_CITIES.filter((c) => LABEL_CITY_NAMES.includes(c.name));

const INDONESIA_FEATURE = indonesiaGeo.features.find((f) => f.properties.role === "focus")!.geometry as GeoJSON.MultiPolygon;
const NEIGHBOURS_FEATURE = indonesiaGeo.features.find((f) => f.properties.role === "context")!.geometry as GeoJSON.MultiPolygon;

type GridPoint = NonNullable<VisibilityGridResult["points"]>[number];

const cache = new Map<string, VisibilityGridResult>();

function isMet(p: GridPoint) {
  return p.verdict === "True" || p.verdict === "visible" || p.verdict === "visible_optical_aid";
}

function rowCol(p: { lat: number; lon: number }): [number, number] {
  return [Math.round((LAT_RANGE[1] - p.lat) / GRID_STEP_DEG), Math.round((p.lon - LON_RANGE[0]) / GRID_STEP_DEG)];
}

function fmt(v: number, digits = 1) {
  return v.toFixed(digits).replace(".", ",");
}

const HOVER_VIEWPORT: InstrumentViewport = { width: 300, height: 150 };

export function IndonesiaMap({ eveningIso, method }: { eveningIso: string; method: HilalMethod }) {
  const uid = useId();
  const key = `${eveningIso}|${method}`;
  const [result, setResult] = useState<VisibilityGridResult | null>(() => cache.get(key) ?? null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [hover, setHover] = useState<GridPoint | null>(null);

  useEffect(() => {
    const cached = cache.get(key);
    if (cached) {
      setResult(cached);
      return;
    }
    let cancelled = false;
    setResult(null);
    setError(null);
    setHover(null);
    setProgress(0);
    fetchVisibilityGrid({ date: eveningIso, method }, (p) => !cancelled && setProgress(p.completed / p.total))
      .then((r) => {
        cache.set(key, r);
        if (!cancelled) setResult(r);
      })
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : String(err)))
      .finally(() => !cancelled && setProgress(null));
    return () => {
      cancelled = true;
    };
  }, [key, eveningIso, method]);

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

  const points = useMemo(() => result?.points ?? [], [result]);

  const fields = useMemo(() => {
    if (points.length === 0) return null;
    const alt: number[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(NaN));
    const met: number[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(NaN));
    for (const p of points) {
      const [r, c] = rowCol(p);
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
        alt[r][c] = p.moon_altitude_deg;
        met[r][c] = isMet(p) ? 1 : 0;
      }
    }
    const values = points.map((p) => p.moon_altitude_deg);
    const lo = Math.ceil(Math.min(...values));
    const hi = Math.floor(Math.max(...values));
    const levels = [];
    for (let l = lo; l <= hi; l += 1) levels.push({ level: l, ...contourPath(alt, l) });
    return { levels, boundary: contourPath(met, 0.5).d, min: Math.min(...values), max: Math.max(...values) };
  }, [points]);

  const metShare = points.length ? points.filter(isMet).length / points.length : 0;
  const summary =
    points.length === 0
      ? null
      : metShare === 0
        ? `Petang ini ${CRITERIA[method].name} belum terpenuhi di mana pun di Indonesia.`
        : metShare > 0.97
          ? `Petang ini ${CRITERIA[method].name} terpenuhi di hampir seluruh Indonesia.`
          : `Petang ini ${CRITERIA[method].name} terpenuhi di sekitar ${Math.round(metShare * 100)}% wilayah, terutama di ${
              (d3.mean(points.filter(isMet), (p) => p.lon) ?? 118) < 118 ? "bagian barat" : "bagian timur"
            } Indonesia.`;

  // Grid index space -> map pixels, for contour paths.
  const toMap = `translate(${xScale(LON_RANGE[0])} ${yScale(LAT_RANGE[1])}) scale(${CELL} ${CELL})`;

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = e.currentTarget.getBoundingClientRect();
    const lon = LON_RANGE[0] + ((e.clientX - svg.left) / svg.width) * (LON_RANGE[1] - LON_RANGE[0]);
    const lat = LAT_RANGE[1] - ((e.clientY - svg.top) / svg.height) * (LAT_RANGE[1] - LAT_RANGE[0]);
    let best: GridPoint | null = null;
    let bd = Infinity;
    for (const p of points) {
      const d = (p.lat - lat) ** 2 + (p.lon - lon) ** 2;
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    setHover(best);
  }

  const cityRows = LABEL_CITIES.map((city) => {
    let best: GridPoint | null = null;
    let bd = Infinity;
    for (const p of points) {
      const d = (p.lat - city.lat) ** 2 + (p.lon - city.lon) ** 2;
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return { city, point: best };
  });

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message="Peta se-Indonesia tidak bisa dihitung untuk petang ini." detail={error} />}

      {summary && <p className="font-display text-xl leading-snug">{summary}</p>}

      <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
        <div className="relative self-start overflow-hidden rounded-card bg-sky-zenith">
          {progress !== null && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-sky-zenith/80 text-sky-ink">
              <Loader2 className="size-6 animate-spin text-sky-sun" aria-hidden="true" />
              <p className="text-sm">Menghitung {GRID_POINT_COUNT.toLocaleString("id-ID")} titik se-Indonesia… {Math.round(progress * 100)}%</p>
              <div className="h-1.5 w-48 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-sky-sun transition-[width]" style={{ width: `${progress * 100}%` }} />
              </div>
            </div>
          )}
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="block h-auto w-full"
            role="img"
            aria-label={`Peta ketinggian hilal se-Indonesia saat matahari terbenam, ${eveningIso}. ${summary ?? ""}`}
            onMouseMove={points.length ? onMove : undefined}
            onMouseLeave={() => setHover(null)}
          >
            <defs>
              <pattern id={`${uid}-hatch`} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1={0} y1={0} x2={0} y2={6} stroke="#05060f" strokeWidth={2.2} strokeOpacity={0.55} />
              </pattern>
            </defs>
            <rect width={WIDTH} height={HEIGHT} fill="#0b0d1f" />

            {points.map((p) => (
              <rect
                key={`${p.lat},${p.lon}`}
                x={xScale(p.lon) - CELL / 2}
                y={yScale(p.lat) - CELL / 2}
                width={CELL + 0.6}
                height={CELL + 0.6}
                fill={rampColor(p.moon_altitude_deg)}
              />
            ))}
            {points.filter((p) => !isMet(p)).map((p) => (
              <rect key={`h${p.lat},${p.lon}`} x={xScale(p.lon) - CELL / 2} y={yScale(p.lat) - CELL / 2} width={CELL + 0.6} height={CELL + 0.6} fill={`url(#${uid}-hatch)`} />
            ))}

            {fields && (
              <g transform={toMap} fill="none">
                {fields.levels.map((l) => (
                  <path key={l.level} d={l.d} stroke="#05060f" strokeOpacity={0.45} strokeWidth={0.9} vectorEffect="non-scaling-stroke" />
                ))}
                <path d={fields.boundary} stroke={SKY_LIT} strokeWidth={2.6} vectorEffect="non-scaling-stroke" strokeLinecap="round" />
              </g>
            )}
            {fields?.levels.map((l) =>
              l.labelAt ? (
                <text
                  key={`t${l.level}`}
                  x={xScale(LON_RANGE[0]) + l.labelAt[0] * CELL}
                  y={yScale(LAT_RANGE[1]) + l.labelAt[1] * CELL + 4}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={800}
                  fill={SKY_INK}
                  style={{ paintOrder: "stroke", stroke: "#0b0d1f", strokeWidth: 3 }}
                >
                  {l.level}°
                </text>
              ) : null,
            )}

            <path d={neighboursPath} fill="none" stroke={SKY_INK} strokeOpacity={0.25} strokeWidth={0.6} pointerEvents="none" />
            <path d={indonesiaPath} fill={SKY_INK} fillOpacity={0.06} stroke={SKY_INK} strokeOpacity={0.9} strokeWidth={0.9} strokeLinejoin="round" pointerEvents="none" />

            {LABEL_CITIES.map((city) => {
              const x = xScale(city.lon);
              const flip = x > WIDTH * 0.85 || city.name === "Balikpapan";
              return (
                <g key={city.name} pointerEvents="none">
                  <circle cx={x} cy={yScale(city.lat)} r={3} fill={SKY_INK} stroke="#0b0d1f" strokeWidth={1} />
                  <text
                    x={flip ? x - 6 : x + 6}
                    y={yScale(city.lat) + 4}
                    textAnchor={flip ? "end" : "start"}
                    fontSize={11.5}
                    fontWeight={700}
                    fill={SKY_INK}
                    style={{ paintOrder: "stroke", stroke: "#0b0d1f", strokeWidth: 3 }}
                  >
                    {city.name}
                  </text>
                </g>
              );
            })}

            {hover && (
              <rect x={xScale(hover.lon) - CELL / 2} y={yScale(hover.lat) - CELL / 2} width={CELL} height={CELL} fill="none" stroke={SKY_INK} strokeWidth={2} pointerEvents="none" />
            )}
          </svg>
        </div>

        <aside className="card flex flex-col gap-3 p-4" aria-live="polite">
          <p className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-muted">
            {hover ? `${fmt(Math.abs(hover.lat))}° ${hover.lat < 0 ? "LS" : "LU"}, ${fmt(hover.lon)}° BT` : "Arahkan kursor ke peta"}
          </p>
          {hover ? (
            <>
              <HorizonInstrument reading={horizonReadingFromObservation(hover)} viewport={HOVER_VIEWPORT} mini showReadout={false} className="overflow-hidden rounded-control" />
              <p className="flex items-center gap-2 text-sm font-bold">
                <VerdictIcon tone={isMet(hover) ? "lit" : "dark"} className={isMet(hover) ? "text-verdict-lit" : "text-verdict-dark"} />
                {isMet(hover) ? "Kriteria terpenuhi" : "Belum terpenuhi"}
              </p>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-2xs text-ink-muted">Tinggi</dt>
                  <dd className="font-bold tabular-nums">{fmt(hover.moon_altitude_deg, 2)}°</dd>
                </div>
                <div>
                  <dt className="text-2xs text-ink-muted">Elongasi</dt>
                  <dd className="font-bold tabular-nums">{fmt(hover.elongation_deg, 2)}°</dd>
                </div>
              </dl>
            </>
          ) : (
            <p className="text-sm text-ink-muted">Setiap kotak adalah satu titik hitung (0,5°). Langit titik itu akan tampak di sini — satu warna di peta adalah satu ufuk.</p>
          )}
          <div className="mt-auto space-y-2 border-t border-border pt-3 text-xs text-ink-muted">
            <div className="h-2.5 rounded-full" style={{ background: `linear-gradient(90deg, ${RAMP.map((r) => r[1]).join(",")})` }} />
            <div className="flex justify-between tabular-nums">
              <span>{RAMP[0][0]}°</span>
              <span>tinggi hilal saat terbenam</span>
              <span>{RAMP[RAMP.length - 1][0]}°+</span>
            </div>
            <p className="flex items-center gap-2">
              <span className="inline-block h-0.5 w-6 rounded bg-verdict-lit" /> batas {CRITERIA[method].name}
            </p>
            <p className="flex items-center gap-2">
              <span className="inline-block size-3 rounded-sm bg-[repeating-linear-gradient(45deg,#7d4f96_0_2px,#05060f_2px_4px)]" /> belum memenuhi
            </p>
            <p>Garis tipis: kontur tiap 1°.</p>
          </div>
        </aside>
      </div>

      {points.length > 0 && (
        <details className="card px-4 py-3 text-sm">
          <summary className="cursor-pointer font-bold">Hasil per kota ({cityRows.length})</summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-max text-left text-sm">
              <caption className="sr-only">Hasil titik grid terdekat tiap kota berlabel.</caption>
              <thead className="text-2xs uppercase tracking-wider text-ink-muted">
                <tr>
                  <th scope="col" className="px-3 py-2">Kota</th>
                  <th scope="col" className="px-3 py-2">Hasil</th>
                  <th scope="col" className="px-3 py-2 text-right">Tinggi</th>
                  <th scope="col" className="px-3 py-2 text-right">Elongasi</th>
                </tr>
              </thead>
              <tbody>
                {cityRows.map(({ city, point }) => (
                  <tr key={city.name} className="border-t border-border/70">
                    <th scope="row" className="px-3 py-2 font-semibold">{city.name}</th>
                    <td className="px-3 py-2">{point ? (isMet(point) ? "Terpenuhi" : "Belum terpenuhi") : "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{point ? `${fmt(point.moon_altitude_deg, 2)}°` : "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{point ? `${fmt(point.elongation_deg, 2)}°` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
