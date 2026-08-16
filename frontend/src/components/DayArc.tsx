"use client";

import { useId } from "react";
import { motion } from "framer-motion";
import {
  computeDayArcLayout,
  DEFAULT_DAY_ARC_VIEWPORT,
  type DayArcInput,
  type DayArcViewport,
  type PrayerKey,
} from "@/lib/dayArcGeometry";

/**
 * "DayArc" (DESIGN.md §5.3) - the sun's altitude across a day, drawn as an
 * arc, with the five prayer moments marked where the curve crosses their
 * defining altitude. A compass strip beneath shares the arc's horizon
 * baseline and marks the qibla bearing - "prayer times and qibla are the
 * same geometry" (§5.3), made visible by literally sharing a horizon line,
 * not by unifying two different coordinate systems (the arc's axis is
 * time; the strip's is compass bearing) into one, which would misrepresent
 * both.
 *
 * Fajr and Isha (and any other below-horizon portion of the curve) are
 * shaded as a distinct depression zone rather than continuing the arc's
 * solid stroke - DESIGN.md is explicit that pretending they sit "on the
 * arc" the way the daylight prayers do would misstate the geometry: the
 * sun genuinely is below the horizon at those moments.
 */

const PRAYER_LABEL: Record<PrayerKey, string> = {
  fajr: "Subuh",
  sunrise: "Terbit",
  dhuhr: "Dzuhur",
  asr: "Ashar",
  maghrib: "Maghrib",
  isha: "Isya",
};

export interface DayArcProps {
  input: DayArcInput;
  viewport?: DayArcViewport;
  className?: string;
}

export function DayArc({ input, viewport = DEFAULT_DAY_ARC_VIEWPORT, className }: DayArcProps) {
  const uid = useId();
  const layout = computeDayArcLayout(input, viewport);
  const { width } = viewport;

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${width} ${layout.totalHeight}`}
        role="img"
        aria-labelledby={`${uid}-desc`}
        className="h-auto w-full max-w-full"
      >
        <desc id={`${uid}-desc`}>
          The sun&apos;s altitude across the day, with the five prayer moments marked where it crosses
          each one&apos;s defining angle, and the qibla bearing marked on a compass strip sharing the
          same horizon.
        </desc>

        <defs>
          <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--sky-gradient-top)" />
            <stop offset="100%" stopColor="var(--sky-gradient-horizon)" />
          </linearGradient>
        </defs>

        <rect x={0} y={0} width={width} height={viewport.archHeight} fill={`url(#${uid}-sky)`} />

        {/* Depression zone: shaded, distinct from the daylight sky, under
            the horizon wherever the curve is negative. */}
        {layout.depressionBands.map((band, i) => (
          <rect
            key={i}
            x={band.x1}
            y={layout.horizonY}
            width={band.x2 - band.x1}
            height={viewport.archHeight - layout.horizonY}
            fill="var(--senja-700)"
            fillOpacity={0.35}
          />
        ))}

        <line x1={0} y1={layout.horizonY} x2={width} y2={layout.horizonY} stroke="var(--text-body)" strokeOpacity={0.6} strokeWidth={1} />

        {/* The arc itself: one continuous path, styled once above the
            horizon (solid) and once below it (dashed) via two clip
            rectangles over the same `d` - one curve, two readings, same
            approach as BoundaryRibbon's merge/split connector. */}
        <clipPath id={`${uid}-above`}>
          <rect x={0} y={0} width={width} height={layout.horizonY} />
        </clipPath>
        <clipPath id={`${uid}-below`}>
          <rect x={0} y={layout.horizonY} width={width} height={viewport.archHeight - layout.horizonY} />
        </clipPath>
        <path d={layout.curvePath} fill="none" stroke="var(--verdict-lit)" strokeWidth={2.5} clipPath={`url(#${uid}-above)`} />
        <path
          d={layout.curvePath}
          fill="none"
          stroke="var(--verdict-dark)"
          strokeWidth={1.5}
          strokeDasharray="3 3"
          clipPath={`url(#${uid}-below)`}
        />

        {layout.prayers.map((p) =>
          p.point ? (
            <g key={p.key}>
              <line
                x1={p.point.x}
                y1={p.point.y}
                x2={p.point.x}
                y2={layout.horizonY}
                stroke="var(--border)"
                strokeWidth={1}
                strokeDasharray="2 2"
              />
              <circle
                cx={p.point.x}
                cy={p.point.y}
                r={4}
                fill={p.belowHorizon ? "var(--verdict-dark)" : "var(--verdict-lit)"}
              >
                <title>
                  {PRAYER_LABEL[p.key]}: altitude matahari {p.definingAltitudeDeg.toFixed(1)}°
                </title>
              </circle>
              <text
                x={p.point.x}
                y={p.point.y - 10}
                textAnchor="middle"
                fontSize={11}
                fontFamily="var(--font-plex-mono)"
                fill="var(--text-body)"
              >
                {PRAYER_LABEL[p.key]}
              </text>
            </g>
          ) : null,
        )}

        {/* Compass strip, sharing the arc's horizon baseline. Reference
            ticks at N/E/S/W (0/90/180/270deg); the qibla bearing gets its
            own marker and label. Schematic, not a true compass - see the
            module comment. */}
        <g>
          <line
            x1={0}
            y1={layout.compassStripY + 20}
            x2={width}
            y2={layout.compassStripY + 20}
            stroke="var(--border)"
            strokeWidth={1}
          />
          {[
            { deg: 0, label: "U" },
            { deg: 90, label: "T" },
            { deg: 180, label: "S" },
            { deg: 270, label: "B" },
            { deg: 360, label: "U" },
          ].map(({ deg, label }) => (
            <g key={deg}>
              <line
                x1={(deg / 360) * width}
                y1={layout.compassStripY + 14}
                x2={(deg / 360) * width}
                y2={layout.compassStripY + 26}
                stroke="var(--text-muted)"
                strokeWidth={1}
              />
              <text
                x={(deg / 360) * width}
                y={layout.compassStripY + 42}
                textAnchor="middle"
                fontSize={10}
                fill="var(--text-muted)"
              >
                {label}
              </text>
            </g>
          ))}

          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <line
              x1={layout.qiblaX}
              y1={layout.compassStripY + 4}
              x2={layout.qiblaX}
              y2={layout.compassStripY + 36}
              stroke="var(--accent-solid)"
              strokeWidth={2.5}
            />
            <polygon
              points={`${layout.qiblaX - 5},${layout.compassStripY + 4} ${layout.qiblaX + 5},${layout.compassStripY + 4} ${layout.qiblaX},${layout.compassStripY - 4}`}
              fill="var(--accent-solid)"
            />
            <text
              x={layout.qiblaX}
              y={layout.compassStripY + 54}
              textAnchor="middle"
              fontSize={10}
              fontWeight={600}
              fill="var(--accent-text)"
            >
              Kiblat
            </text>
          </motion.g>
        </g>
      </svg>
    </div>
  );
}
