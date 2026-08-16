"use client";

import { useId, useState } from "react";
import { motion } from "framer-motion";
import {
  computeInstrumentLayout,
  DEFAULT_VIEWPORT,
  type HorizonReading,
  type InstrumentViewport,
  type ThresholdBand,
} from "@/lib/instrumentGeometry";

/**
 * The app's signature drawing (DESIGN.md §5.1) - a schematic of the western
 * horizon at sunset, driven directly by already-validated engine output.
 * Standalone and fixture-driven for now (DESIGN.md §9.3): this file renders
 * whatever HorizonReading it's given and makes no assumption about where
 * that reading came from. It is not wired into any page yet.
 *
 * Two deliberate departures from a literal reading of §5.1, both forced by
 * CLAUDE.md's validation rule outranking DESIGN.md, and both documented in
 * MIGRATION.md's flag on this component:
 *
 * 1. "true azimuth offset from the sun" - no azimuth function exists in the
 *    frozen engine (lib/falak/), only altitude does, and adding one now
 *    would be new, unvalidated astronomical output. The moon's horizontal
 *    position instead uses lagTimeMinutes (already validated) as a time-axis
 *    proxy - see lib/instrumentGeometry.ts's module comment for the full
 *    reasoning. This is a time axis, not a compass bearing, and nothing
 *    here claims otherwise.
 * 2. "the illuminated limb facing the sun" - achieved by orienting the
 *    crescent mask away from the sun's own DRAWN position (which is itself
 *    honestly derived from validated altitude+lag-time data), not from a
 *    true 3D limb angle. Self-consistent with departure #1 rather than
 *    requiring the azimuth this component deliberately doesn't have.
 *
 * Every LABEL and readout number shown, in every case, is the true engine
 * value - only the 2D placement of the two departures above is schematic.
 */

type RowKey = "altitude" | "elongation" | "moonAge" | "lag";

/** Distinct hatch per band (DESIGN.md §5.1: "distinct hatching, not three separate cards") rather than relying on colour alone to tell stacked bands apart. */
const BAND_PATTERNS: Record<string, { angle: number; spacing: number; dashed?: boolean }> = {
  mabims_2021: { angle: 45, spacing: 7 },
  odeh: { angle: -45, spacing: 7 },
  wujudul_hilal: { angle: 0, spacing: 5, dashed: true },
};

function formatDeg(value: number, digits = 1): string {
  return `${value.toFixed(digits)}°`;
}

function formatMinutes(value: number): string {
  const sign = value >= 0 ? "+" : "−";
  return `${sign}${Math.round(Math.abs(value))} min`;
}

export interface HorizonInstrumentProps {
  reading: HorizonReading;
  bands?: ThresholdBand[];
  /** One sentence stating the verdict, for the accessible <desc> and the visible caption. Optional - a standalone/fixture render can omit it. */
  verdictSentence?: string;
  viewport?: InstrumentViewport;
  /** DESIGN.md §3.3: the one 900ms orchestrated reveal, once per session - the CALLER decides when that is (e.g. only on the first page that mounts an instrument each session), not this component. Defaults to a plain opacity-only entrance. */
  animateEntrance?: boolean;
  /**
   * The <dl> readout below the drawing. Default true for a full-size
   * instrument (DESIGN.md §5.1: "The numeric readout beside it is a real
   * <dl>, fully keyboard accessible"). Set false at miniature sizes (the
   * Setahun grid, a reduced-size hover instrument) - found by rendering an
   * actual Setahun preview: a 4-column numeric grid has no legible layout
   * at ~150px wide, and DESIGN.md's own framing for that view ("twelve
   * miniature instruments...not twelve cards of numbers") says the drawing
   * should carry it at that scale, not a stat block bolted under it.
   */
  showReadout?: boolean;
  className?: string;
}

export function HorizonInstrument({
  reading,
  bands = [],
  verdictSentence,
  viewport = DEFAULT_VIEWPORT,
  animateEntrance = false,
  showReadout = true,
  className,
}: HorizonInstrumentProps) {
  const uid = useId();
  const [highlighted, setHighlighted] = useState<RowKey | null>(null);

  const layout = computeInstrumentLayout(reading, { viewport, bands });
  const { width, height } = viewport;

  const skyGradientId = `${uid}-sky`;
  const crescentMaskId = `${uid}-crescent-mask`;
  const descId = `${uid}-desc`;

  const descSentence =
    verdictSentence ??
    `Moon at ${formatDeg(reading.moonAltitudeDeg)} altitude, ${formatDeg(reading.elongationDeg)} elongation, ${
      reading.lagTimeMinutes === null ? "moonset undetermined" : formatMinutes(reading.lagTimeMinutes) + " lag"
    }.`;

  function highlight(key: RowKey | null) {
    setHighlighted(key);
  }

  const dim = (key: RowKey) => (highlighted !== null && highlighted !== key ? 0.35 : 1);

  return (
    <div className={className}>
      <motion.svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-labelledby={descId}
        className="h-auto w-full max-w-full"
        initial={animateEntrance ? { opacity: 0 } : false}
        animate={animateEntrance ? { opacity: 1 } : undefined}
        transition={{ duration: animateEntrance ? 0.9 : 0, ease: [0.22, 0.61, 0.36, 1] }}
      >
        <desc id={descId}>{descSentence}</desc>

        <defs>
          <linearGradient id={skyGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--sky-gradient-top)" />
            <stop offset="100%" stopColor="var(--sky-gradient-horizon)" />
          </linearGradient>

          <mask id={crescentMaskId}>
            <rect x={0} y={0} width={width} height={height} fill="black" />
            <circle cx={layout.moon.x} cy={layout.moon.y} r={layout.moon.radius} fill="white" />
            <circle
              cx={layout.moon.x + layout.moon.awayFromSunX * layout.moon.crescentOffset}
              cy={layout.moon.y + layout.moon.awayFromSunY * layout.moon.crescentOffset}
              r={layout.moon.radius}
              fill="black"
            />
          </mask>

          {bands.map((band) => {
            const pattern = BAND_PATTERNS[band.key] ?? { angle: 45, spacing: 7 };
            return (
              <pattern
                key={band.key}
                id={`${uid}-band-${band.key}`}
                width={pattern.spacing}
                height={pattern.spacing}
                patternTransform={`rotate(${pattern.angle})`}
                patternUnits="userSpaceOnUse"
              >
                <line
                  x1={0}
                  y1={0}
                  x2={0}
                  y2={pattern.spacing}
                  stroke="var(--accent-text)"
                  strokeWidth={pattern.dashed ? 2 : 1}
                  strokeDasharray={pattern.dashed ? "2 3" : undefined}
                />
              </pattern>
            );
          })}
        </defs>

        {/* Sky */}
        <rect x={0} y={0} width={width} height={height} fill={`url(#${skyGradientId})`} />

        {/* Threshold bands, stacked directly on the horizon, drawn before the
            horizon line/bodies so they read as ground context, not overlay. */}
        {layout.bands.map((band) =>
          band.rect ? (
            <rect
              key={band.key}
              x={band.rect.x}
              y={band.rect.y}
              width={band.rect.width}
              height={band.rect.height}
              fill={`url(#${uid}-band-${band.key})`}
              fillOpacity={0.5}
            >
              <title>{`${band.label}: needs ≥${formatDeg(band.minAltitudeDeg ?? 0)} altitude`}</title>
            </rect>
          ) : (
            // Wujudul hilal has no altitude threshold to shade - see
            // instrumentGeometry.ts's wujudulHilalMarkerBand comment. Marked
            // at the horizon instead of fabricating a band.
            <line
              key={band.key}
              x1={0}
              y1={layout.horizonY}
              x2={width}
              y2={layout.horizonY}
              stroke="var(--accent-text)"
              strokeWidth={2}
              strokeDasharray="1 5"
            >
              <title>{`${band.label}: no altitude threshold - decided by moonset timing (see the lag-time bracket)`}</title>
            </line>
          ),
        )}

        {/* Horizon */}
        <line
          x1={0}
          y1={layout.horizonY}
          x2={width}
          y2={layout.horizonY}
          stroke="var(--text-body)"
          strokeOpacity={0.6}
          strokeWidth={1}
        />

        {/* Elongation: a dashed arc between the sightlines to sun and moon,
            centred on an observer mark at the left. The 2D angle drawn here
            follows the two bodies' own (schematic) drawn positions, not a
            separately-computed true elongation angle - only the LABEL is the
            true engine value (see the module header comment). */}
        <g opacity={dim("elongation")} style={{ transition: "opacity 150ms ease" }}>
          <circle cx={24} cy={layout.horizonY} r={3} fill="var(--text-muted)" />
          <line
            x1={24}
            y1={layout.horizonY}
            x2={layout.sun.x}
            y2={layout.sun.y}
            stroke="var(--text-muted)"
            strokeWidth={1}
            strokeDasharray="2 3"
          />
          <line
            x1={24}
            y1={layout.horizonY}
            x2={layout.moon.x}
            y2={layout.moon.y}
            stroke="var(--text-muted)"
            strokeWidth={1}
            strokeDasharray="2 3"
          />
          <text
            x={24}
            y={layout.horizonY - 10}
            fontSize={11}
            fontFamily="var(--font-plex-mono)"
            fill="var(--text-muted)"
          >
            {formatDeg(reading.elongationDeg)}
          </text>
        </g>

        {/* Sun: dimmed, at its true depression angle. */}
        <g opacity={dim("altitude") * 0.7}>
          <circle cx={layout.sun.x} cy={layout.sun.y} r={layout.sun.radius} fill="var(--verdict-dark)" />
        </g>

        {/* Moon: crescent, at true altitude; horizontal position and limb
            direction are schematic (see header comment). */}
        <g opacity={dim("altitude")}>
          {reading.lagTimeMinutes === null ? (
            <circle
              cx={layout.moon.x}
              cy={layout.moon.y}
              r={layout.moon.radius}
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth={2}
              strokeDasharray="3 4"
            >
              <title>Horizontal position unknown - moonset could not be determined for this evening.</title>
            </circle>
          ) : (
            <circle
              cx={layout.moon.x}
              cy={layout.moon.y}
              r={layout.moon.radius}
              mask={`url(#${crescentMaskId})`}
              fill="var(--verdict-lit)"
            />
          )}
        </g>

        {/* Lag time: a bracket along the horizon between the sun's and the
            moon's set points. */}
        {layout.lagBracket && (
          <g opacity={dim("lag")} style={{ transition: "opacity 150ms ease" }}>
            <line
              x1={layout.lagBracket.x1}
              y1={layout.lagBracket.y}
              x2={layout.lagBracket.x2}
              y2={layout.lagBracket.y}
              stroke="var(--nila-600)"
              strokeWidth={1.5}
            />
            <line
              x1={layout.lagBracket.x1}
              y1={layout.lagBracket.y - 4}
              x2={layout.lagBracket.x1}
              y2={layout.lagBracket.y + 4}
              stroke="var(--nila-600)"
              strokeWidth={1.5}
            />
            <line
              x1={layout.lagBracket.x2}
              y1={layout.lagBracket.y - 4}
              x2={layout.lagBracket.x2}
              y2={layout.lagBracket.y + 4}
              stroke="var(--nila-600)"
              strokeWidth={1.5}
            />
            <text
              x={(layout.lagBracket.x1 + layout.lagBracket.x2) / 2}
              y={layout.lagBracket.y + 18}
              fontSize={11}
              textAnchor="middle"
              fontFamily="var(--font-plex-mono)"
              fill="var(--nila-600)"
            >
              {formatMinutes(layout.lagBracket.minutes)}
            </text>
          </g>
        )}
      </motion.svg>

      {/* Numeric readout - a real <dl>, fully keyboard accessible, hover-
          and focus-linked to the drawing above (DESIGN.md §5.1). Omitted at
          miniature sizes - see showReadout's doc comment. */}
      {showReadout && (
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
          <InstrumentReadoutRow
            rowKey="altitude"
            label="Altitude"
            value={formatDeg(reading.moonAltitudeDeg)}
            highlighted={highlighted === "altitude"}
            onEnter={() => highlight("altitude")}
            onLeave={() => highlight(null)}
          />
          <InstrumentReadoutRow
            rowKey="elongation"
            label="Elongation"
            value={formatDeg(reading.elongationDeg)}
            highlighted={highlighted === "elongation"}
            onEnter={() => highlight("elongation")}
            onLeave={() => highlight(null)}
          />
          <InstrumentReadoutRow
            rowKey="moonAge"
            label="Moon age"
            value={reading.moonAgeHours === undefined ? "—" : `${reading.moonAgeHours.toFixed(1)} h`}
            highlighted={highlighted === "moonAge"}
            onEnter={() => highlight("moonAge")}
            onLeave={() => highlight(null)}
          />
          <InstrumentReadoutRow
            rowKey="lag"
            label="Lag time"
            value={reading.lagTimeMinutes === null ? "no moonset" : formatMinutes(reading.lagTimeMinutes)}
            highlighted={highlighted === "lag"}
            onEnter={() => highlight("lag")}
            onLeave={() => highlight(null)}
          />
        </dl>
      )}
    </div>
  );
}

function InstrumentReadoutRow({
  rowKey,
  label,
  value,
  highlighted,
  onEnter,
  onLeave,
}: {
  rowKey: RowKey;
  label: string;
  value: string;
  highlighted: boolean;
  onEnter: () => void;
  onLeave: () => void;
}) {
  return (
    <div
      data-row={rowKey}
      tabIndex={0}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      className="rounded-lg px-1.5 py-1 transition-colors duration-fast"
      style={highlighted ? { backgroundColor: "color-mix(in srgb, var(--accent-solid) 15%, transparent)" } : undefined}
    >
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="font-mono tabular-nums text-ink">{value}</dd>
    </div>
  );
}
