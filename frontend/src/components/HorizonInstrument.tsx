"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Pause, Play, RotateCcw } from "lucide-react";
import { MoonGlyph, SkyBackdrop, SunGlyph } from "@/components/sky/Celestial";
import {
  computeInstrumentLayout,
  DEFAULT_VIEWPORT,
  type HorizonReading,
  type InstrumentViewport,
  type ThresholdBand,
} from "@/lib/instrumentGeometry";
import { SKY_INK, SKY_INK_MUTED, SKY_MARGIN, SKY_MOON, SKY_SUN } from "@/lib/skyPalette";
import { cn } from "@/lib/cn";

/**
 * HorizonInstrument (DESIGN.md v2 §5.1): the western horizon at sunset, drawn
 * from engine output with the shared sky primitives - a sky whose colour follows
 * the Sun's real depression, stars only once it is dark, the Sun (ember) below
 * the horizon and the Moon (pearl) at its true altitude, criterion thresholds
 * as labelled bands, elongation and lag drawn and labelled.
 *
 * Horizontal placement is still the documented lag-time axis from
 * instrumentGeometry.ts, not a compass bearing; every LABEL is the true engine
 * value.
 *
 * With `trajectory` (the engine's topocentric samples every 5 minutes around
 * sunset) the instrument gains a scrubber: drag from sunset toward moonset and
 * the Moon sinks and the sky darkens, interpolated only BETWEEN engine
 * samples. The criteria are still judged at sunset, and the readout always
 * shows the sunset values.
 */

type RowKey = "altitude" | "elongation" | "moonAge" | "lag" | "illumination";

interface TrajectorySample {
  minutes_from_sunset: number;
  moon_altitude_deg: number;
  sun_altitude_deg: number;
}

/** The thin-crescent display curve: order-preserving, exact at 0 and 1, shown beside the true value. */
const CRESCENT_DISPLAY_GAMMA = 0.5;

function fmtDeg(value: number, digits = 2): string {
  return `${value.toFixed(digits).replace(".", ",")}°`;
}

function interpolate(samples: TrajectorySample[], minutes: number): { moon: number; sun: number } | null {
  const sorted = [...samples].sort((a, b) => a.minutes_from_sunset - b.minutes_from_sunset);
  for (let i = 0; i + 1 < sorted.length; i += 1) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (minutes >= a.minutes_from_sunset && minutes <= b.minutes_from_sunset) {
      const f = (minutes - a.minutes_from_sunset) / (b.minutes_from_sunset - a.minutes_from_sunset || 1);
      return {
        moon: a.moon_altitude_deg + (b.moon_altitude_deg - a.moon_altitude_deg) * f,
        sun: a.sun_altitude_deg + (b.sun_altitude_deg - a.sun_altitude_deg) * f,
      };
    }
  }
  return null;
}

export interface HorizonInstrumentProps {
  reading: HorizonReading;
  bands?: ThresholdBand[];
  verdictSentence?: string;
  viewport?: InstrumentViewport;
  animateEntrance?: boolean;
  showReadout?: boolean;
  /** Miniature: no labels, no readout (the Setahun grid, the map's hover sky). */
  mini?: boolean;
  trajectory?: TrajectorySample[];
  /** Local clock time of sunset, for the scrubber's labels ("17.46"). */
  sunsetClock?: (minutesAfter: number) => string;
  className?: string;
}

export function HorizonInstrument({
  reading,
  bands = [],
  verdictSentence,
  viewport = DEFAULT_VIEWPORT,
  animateEntrance = false,
  showReadout = true,
  mini = false,
  trajectory,
  sunsetClock,
  className,
}: HorizonInstrumentProps) {
  const [highlighted, setHighlighted] = useState<RowKey | null>(null);
  const [minutes, setMinutes] = useState(0);
  const [playing, setPlaying] = useState(false);
  const raf = useRef<number | null>(null);

  const maxMinutes = trajectory
    ? Math.min(
        Math.max(...trajectory.map((t) => t.minutes_from_sunset)),
        reading.lagTimeMinutes !== null && reading.lagTimeMinutes > 0 ? Math.ceil(reading.lagTimeMinutes) + 3 : 30,
      )
    : 0;

  // Reset the scrubber when the evening changes.
  useEffect(() => {
    setMinutes(0);
    setPlaying(false);
  }, [reading.moonAltitudeDeg, reading.elongationDeg]);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setMinutes((m) => {
        const next = m + dt * 5; // 5 minutes of evening per second
        if (next >= maxMinutes) {
          setPlaying(false);
          return maxMinutes;
        }
        return next;
      });
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, [playing, maxMinutes]);

  const scrubbed = trajectory && minutes > 0 ? interpolate(trajectory, minutes) : null;
  const drawn: HorizonReading = scrubbed ? { ...reading, moonAltitudeDeg: scrubbed.moon, sunAltitudeDeg: scrubbed.sun } : reading;
  const layout = computeInstrumentLayout(drawn, { viewport, bands });
  const { width, height } = viewport;
  const moonUp = drawn.moonAltitudeDeg > -0.3 || minutes === 0;
  const litToward = (Math.atan2(layout.sun.y - layout.moon.y, layout.sun.x - layout.moon.x) * 180) / Math.PI;
  const displayK = Math.min(1, Math.max(0, reading.illuminationFraction)) ** CRESCENT_DISPLAY_GAMMA;
  const dim = (key: RowKey) => (highlighted !== null && highlighted !== key ? 0.3 : 1);
  const observerX = 26;
  const fs = width < 400 ? 0.85 : 1;

  const desc =
    verdictSentence ??
    `Tinggi bulan ${fmtDeg(reading.moonAltitudeDeg)}, elongasi ${fmtDeg(reading.elongationDeg)}, ${
      reading.lagTimeMinutes === null ? "waktu terbenam bulan tidak ditemukan" : `selisih terbenam ${Math.round(reading.lagTimeMinutes)} menit`
    }.`;

  return (
    <div className={className}>
      <div className={cn("overflow-hidden bg-sky-zenith", !mini && "sm:rounded-card")}>
        <motion.svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={desc}
          className="block h-auto w-full"
          initial={animateEntrance ? { opacity: 0 } : false}
          animate={animateEntrance ? { opacity: 1 } : undefined}
          transition={{ duration: animateEntrance ? 0.9 : 0, ease: [0.22, 0.61, 0.36, 1] }}
        >
          <SkyBackdrop width={width} height={height} horizonY={layout.horizonY} sunAltitudeDeg={drawn.sunAltitudeDeg} stars={mini ? 14 : 70} />

          {/* Threshold bands - labelled, each with its own dash so they are not told apart by colour alone. */}
          {!mini &&
            layout.bands.map((band) =>
              band.rect ? (
                <g key={band.key}>
                  {band.key === "mabims_2021" && (
                    <rect x={0} y={band.rect.y} width={width} height={band.rect.height} fill={SKY_MARGIN} fillOpacity={0.1} />
                  )}
                  <line
                    x1={0}
                    y1={band.rect.y}
                    x2={width}
                    y2={band.rect.y}
                    stroke={SKY_MARGIN}
                    strokeOpacity={0.75}
                    strokeDasharray={band.key === "mabims_2021" ? "6 5" : "2 4"}
                  />
                  <text x={width - 10} y={band.rect.y - 6} textAnchor="end" fontSize={12 * fs} fontWeight={600} fill={SKY_MARGIN}>
                    {band.key === "mabims_2021" ? "batas tinggi MABIMS · 3°" : `batas Odeh pada lebar sabit ini · ${fmtDeg(band.minAltitudeDeg ?? 0, 1)}`}
                  </text>
                </g>
              ) : null,
            )}

          {/* Elongation: the sightlines from the observer, labelled with the true value. */}
          {!mini && moonUp && (
            <g opacity={dim("elongation")} style={{ transition: "opacity 150ms ease" }}>
              <circle cx={observerX} cy={layout.horizonY} r={3.5} fill={SKY_INK} />
              <line x1={observerX} y1={layout.horizonY} x2={layout.sun.x} y2={layout.sun.y} stroke={SKY_INK} strokeOpacity={0.35} strokeDasharray="2 4" />
              <line x1={observerX} y1={layout.horizonY} x2={layout.moon.x} y2={layout.moon.y} stroke={SKY_INK} strokeOpacity={0.35} strokeDasharray="2 4" />
              <line x1={layout.sun.x} y1={layout.sun.y} x2={layout.moon.x} y2={layout.moon.y} stroke={SKY_MOON} strokeOpacity={0.55} strokeDasharray="3 5" />
              <text
                x={(layout.sun.x + layout.moon.x) / 2 + 10}
                y={(layout.sun.y + layout.moon.y) / 2}
                fontSize={12 * fs}
                fill={SKY_MOON}
                fillOpacity={0.85}
              >
                elongasi {fmtDeg(reading.elongationDeg, 1)}
              </text>
            </g>
          )}

          <g opacity={dim("altitude") * 0.95}>
            <SunGlyph cx={layout.sun.x} cy={layout.sun.y} r={mini ? 8 : 11} />
          </g>
          {!mini && (
            <text x={layout.sun.x - 18} y={layout.sun.y + 4} textAnchor="end" fontSize={12 * fs} fontWeight={600} fill={SKY_SUN}>
              Matahari
            </text>
          )}

          {moonUp && (
            <g opacity={dim("altitude")}>
              {reading.lagTimeMinutes === null ? (
                <circle cx={layout.moon.x} cy={layout.moon.y} r={layout.moon.radius} fill="none" stroke={SKY_INK_MUTED} strokeWidth={2} strokeDasharray="3 4">
                  <title>Posisi mendatar tidak diketahui - waktu terbenam bulan tidak ditemukan petang ini.</title>
                </circle>
              ) : (
                <MoonGlyph cx={layout.moon.x} cy={layout.moon.y} r={mini ? 11 : 16} illumination={displayK} litTowardDeg={litToward} />
              )}
              {!mini && (
                <text x={layout.moon.x + 24} y={layout.moon.y + 5} fontSize={14 * fs} fontWeight={700} fill={SKY_MOON}>
                  Bulan {fmtDeg(drawn.moonAltitudeDeg)}
                </text>
              )}
            </g>
          )}

          {/* Lag: a bracket in the ground band between the two set points. */}
          {!mini && layout.lagBracket && (
            <g opacity={dim("lag")} style={{ transition: "opacity 150ms ease" }}>
              {(() => {
                const y = Math.min(height - 26, layout.horizonY + 34);
                const { x1, x2, minutes: lag } = layout.lagBracket;
                return (
                  <>
                    <line x1={x1} y1={y} x2={x2} y2={y} stroke={SKY_INK_MUTED} strokeWidth={1.4} />
                    <line x1={x1} y1={y - 5} x2={x1} y2={y + 5} stroke={SKY_INK_MUTED} strokeWidth={1.4} />
                    <line x1={x2} y1={y - 5} x2={x2} y2={y + 5} stroke={SKY_INK_MUTED} strokeWidth={1.4} />
                    <text x={(x1 + x2) / 2} y={y + 18} textAnchor="middle" fontSize={12 * fs} fill={SKY_INK_MUTED}>
                      {lag >= 0 ? `bulan terbenam ${Math.round(lag)} mnt setelah matahari` : `bulan terbenam ${Math.round(-lag)} mnt sebelum matahari`}
                    </text>
                  </>
                );
              })()}
            </g>
          )}

          {mini && (
            <text x={8} y={16} fontSize={13} fontWeight={700} fill={SKY_MOON}>
              {fmtDeg(reading.moonAltitudeDeg, 1)}
            </text>
          )}
        </motion.svg>

        {trajectory && !mini && (
          <div className="flex items-center gap-3 border-t border-white/10 px-4 py-3 text-sky-ink">
            <button
              type="button"
              onClick={() => {
                if (minutes >= maxMinutes) setMinutes(0);
                setPlaying((p) => !p);
              }}
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sky-sun text-[#1a1330]"
              aria-label={playing ? "Jeda" : minutes >= maxMinutes ? "Ulangi" : "Putar petang"}
            >
              {playing ? <Pause className="size-4" /> : minutes >= maxMinutes ? <RotateCcw className="size-4" /> : <Play className="size-4" />}
            </button>
            <label className="min-w-0 flex-1">
              <span className="sr-only">Menit setelah matahari terbenam</span>
              <input
                type="range"
                min={0}
                max={maxMinutes}
                step={0.5}
                value={minutes}
                onChange={(e) => {
                  setPlaying(false);
                  setMinutes(Number(e.target.value));
                }}
                className="w-full accent-[#f4a259]"
              />
            </label>
            <span className="w-32 shrink-0 text-right text-xs tabular-nums text-sky-ink-muted sm:w-44">
              {minutes === 0 ? "saat matahari terbenam" : `+${Math.round(minutes)} mnt${sunsetClock ? ` · ${sunsetClock(minutes)}` : ""}`}
            </span>
          </div>
        )}
      </div>

      {trajectory && !mini && minutes > 0 && (
        <p className="mt-2 text-xs text-ink-muted">
          Menggambar {Math.round(minutes)} menit setelah terbenam: tinggi bulan {fmtDeg(drawn.moonAltitudeDeg)}, matahari{" "}
          {fmtDeg(-drawn.sunAltitudeDeg, 1)} di bawah ufuk (diinterpolasi antar sampel mesin tiap 5 menit). Kriteria tetap dinilai saat terbenam.
        </p>
      )}

      {showReadout && !mini && (
        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {(
            [
              ["altitude", "Tinggi bulan", fmtDeg(reading.moonAltitudeDeg)],
              ["elongation", "Elongasi", fmtDeg(reading.elongationDeg)],
              ["moonAge", "Umur bulan", reading.moonAgeHours === undefined ? "—" : `${Math.floor(reading.moonAgeHours)} j ${Math.round((reading.moonAgeHours % 1) * 60)} m`],
              ["lag", "Selisih terbenam", reading.lagTimeMinutes === null ? "—" : `${Math.round(reading.lagTimeMinutes)} mnt`],
              ["illumination", "Iluminasi", `${(reading.illuminationFraction * 100).toFixed(2).replace(".", ",")}%`],
            ] as Array<[RowKey, string, string]>
          ).map(([key, label, value]) => (
            <div
              key={key}
              tabIndex={0}
              onMouseEnter={() => setHighlighted(key)}
              onMouseLeave={() => setHighlighted(null)}
              onFocus={() => setHighlighted(key)}
              onBlur={() => setHighlighted(null)}
              className={cn(
                "rounded-control border border-border bg-surface-card px-3 py-2.5 transition-colors duration-fast",
                highlighted === key && "border-accent-solid bg-accent-solid/10",
              )}
            >
              <dt className="text-2xs font-semibold text-ink-muted">{label}</dt>
              <dd className="text-lg font-extrabold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
