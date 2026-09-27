"use client";

import { useId } from "react";
import { SunGlyph } from "@/components/sky/Celestial";
import { computeDayArcLayout, type DayArcInput, type DayArcViewport } from "@/lib/dayArcGeometry";
import { PRAYER_LABEL } from "@/lib/prayerSchedule";
import { formatClock } from "@/lib/localDate";
import { HOUR_US, type Instant } from "@/lib/falak/time";

/**
 * DayArc (DESIGN.md v2 §5.3): the Sun's altitude across one day - real engine
 * samples, not a drawn curve - with each prayer marked where the Sun crosses
 * the altitude that defines it, and a "now" Sun when the day is today.
 *
 * The horizontal axis is time, labelled in the place's own clock; the vertical
 * axis is solar altitude. Subuh and Isya sit below the horizon, in a shaded
 * depression zone, because that is where the Sun genuinely is at those moments.
 */
export interface DayArcProps {
  input: DayArcInput;
  timeZone: string | null;
  now?: Instant | null;
  viewport?: DayArcViewport;
  className?: string;
}

export function DayArc({ input, timeZone, now = null, viewport = { width: 960, archHeight: 300 }, className }: DayArcProps) {
  const uid = useId();
  const layout = computeDayArcLayout(input, viewport);
  const { width, archHeight } = viewport;
  const samples = input.samples;
  const t0 = samples[0]?.instant ?? 0;
  const t1 = samples[samples.length - 1]?.instant ?? 1;
  const xOfTime = (t: Instant) => ((t - t0) / (t1 - t0 || 1)) * width;

  // "Now" sits on the curve: interpolate the sampled altitude at the current instant.
  let nowPoint: { x: number; y: number } | null = null;
  if (now !== null && now >= t0 && now <= t1) {
    const i = samples.findIndex((s) => s.instant >= now);
    const a = samples[Math.max(0, i - 1)];
    const b = samples[Math.max(0, i)];
    const f = b.instant === a.instant ? 0 : (now - a.instant) / (b.instant - a.instant);
    const alt = a.altitudeDeg + (b.altitudeDeg - a.altitudeDeg) * f;
    nowPoint = { x: xOfTime(now), y: layout.yForAltitude(alt) };
  }

  // Hour ticks every 2 hours on the hour, in the place's clock.
  const ticks: Instant[] = [];
  const firstHour = Math.ceil(t0 / HOUR_US) * HOUR_US;
  for (let t = firstHour; t <= t1; t += HOUR_US) {
    const hour = Number(formatClock(t, timeZone).slice(0, 2));
    if (hour % 2 === 0) ticks.push(t);
  }

  const desc =
    "Lintasan ketinggian matahari sepanjang hari. " +
    input.prayers
      .filter((p) => p.instant !== null)
      .map((p) => `${PRAYER_LABEL[p.key]} ${formatClock(p.instant, timeZone)}, matahari ${p.definingAltitudeDeg.toFixed(1).replace(".", ",")}°`)
      .join("; ") +
    ".";

  return (
    <div className={className}>
      <svg viewBox={`0 0 ${width} ${archHeight + 34}`} role="img" aria-labelledby={`${uid}-desc`} className="block h-auto w-full">
        <desc id={`${uid}-desc`}>{desc}</desc>
        <defs>
          <linearGradient id={`${uid}-day`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--sun)" stopOpacity={0.14} />
            <stop offset="100%" stopColor="var(--sun)" stopOpacity={0.02} />
          </linearGradient>
          <clipPath id={`${uid}-above`}>
            <rect x={0} y={0} width={width} height={layout.horizonY} />
          </clipPath>
          <clipPath id={`${uid}-below`}>
            <rect x={0} y={layout.horizonY} width={width} height={archHeight - layout.horizonY} />
          </clipPath>
        </defs>

        {/* Night below the horizon, faintly. */}
        <rect x={0} y={layout.horizonY} width={width} height={archHeight - layout.horizonY} fill="var(--verdict-margin)" fillOpacity={0.07} />
        {layout.depressionBands.map((band, i) => (
          <rect key={i} x={band.x1} y={layout.horizonY} width={band.x2 - band.x1} height={archHeight - layout.horizonY} fill="var(--verdict-margin)" fillOpacity={0.08} />
        ))}

        {/* Daylight: the area under the arc. */}
        <path d={`${layout.curvePath} L ${width},${layout.horizonY} L 0,${layout.horizonY} Z`} fill={`url(#${uid}-day)`} clipPath={`url(#${uid}-above)`} />

        <line x1={0} y1={layout.horizonY} x2={width} y2={layout.horizonY} stroke="var(--text-body)" strokeOpacity={0.35} />
        <text x={8} y={layout.horizonY - 6} fontSize={11} fill="var(--text-muted)">
          ufuk
        </text>

        <path d={layout.curvePath} fill="none" stroke="var(--sun)" strokeWidth={3} strokeLinecap="round" clipPath={`url(#${uid}-above)`} />
        <path d={layout.curvePath} fill="none" stroke="var(--verdict-margin)" strokeWidth={1.6} strokeDasharray="4 4" clipPath={`url(#${uid}-below)`} />

        {layout.prayers.map((p) => {
          if (!p.point) return null;
          const below = p.belowHorizon;
          // The noon label sits beside the peak (above it is off-canvas and
          // where the "now" pill lives); the rest sit above or below their point.
          const beside = p.key === "dhuhr";
          const labelY = beside ? p.point.y + 4 : below ? p.point.y + 20 : p.point.y - 26;
          const labelX = beside ? p.point.x + 12 : Math.min(width - 26, Math.max(26, p.point.x));
          const anchor = beside ? "start" : "middle";
          return (
            <g key={p.key}>
              <line x1={p.point.x} y1={p.point.y} x2={p.point.x} y2={layout.horizonY} stroke="var(--border-strong)" strokeDasharray="2 3" />
              <circle cx={p.point.x} cy={p.point.y} r={5} fill="var(--surface-card)" stroke={below ? "var(--verdict-margin)" : "var(--sun)"} strokeWidth={2.2} />
              <text x={labelX} y={labelY} textAnchor={anchor} fontSize={13} fontWeight={700} fill="var(--text-body)">
                {PRAYER_LABEL[p.key]}
              </text>
              <text x={labelX} y={labelY + 15} textAnchor={anchor} fontSize={12} fill="var(--text-muted)" style={{ fontVariantNumeric: "tabular-nums" }}>
                {formatClock(p.instant, timeZone)}
              </text>
            </g>
          );
        })}

        {nowPoint && (
          <g>
            <line x1={nowPoint.x} y1={0} x2={nowPoint.x} y2={archHeight} stroke="var(--accent-solid)" strokeOpacity={0.5} strokeDasharray="3 4" />
            <SunGlyph cx={nowPoint.x} cy={nowPoint.y} r={7} />
            <rect x={Math.min(width - 70, Math.max(2, nowPoint.x - 34))} y={4} width={68} height={20} rx={10} fill="var(--accent-solid)" />
            <text x={Math.min(width - 36, Math.max(36, nowPoint.x))} y={18} textAnchor="middle" fontSize={11.5} fontWeight={700} fill="var(--accent-on-solid)">
              {formatClock(now, timeZone)}
            </text>
          </g>
        )}

        {/* Time axis. */}
        <line x1={0} y1={archHeight} x2={width} y2={archHeight} stroke="var(--border)" />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={xOfTime(t)} y1={archHeight} x2={xOfTime(t)} y2={archHeight + 5} stroke="var(--text-muted)" strokeOpacity={0.6} />
            <text x={Math.min(width - 18, Math.max(18, xOfTime(t)))} y={archHeight + 22} textAnchor="middle" fontSize={11.5} fill="var(--text-muted)">
              {formatClock(t, timeZone)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
