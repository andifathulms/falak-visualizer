"use client";

import { useId } from "react";
import Link from "next/link";
import {
  computeBoundaryRibbonLayout,
  DEFAULT_RIBBON_VIEWPORT,
  LANES,
  type BoundaryPoint,
  type RibbonViewport,
} from "@/lib/boundaryRibbonGeometry";
import type { HilalMethod } from "@/lib/falak/visibility";

/**
 * "BoundaryRibbon" (DESIGN.md §5.2) - twelve Hijri months laid left to
 * right, one lane per criterion, sidang isbat as a fourth marker lane where
 * recorded. Agreement reads as a straight vertical connector; divergence
 * reads as a zigzag, offset by the number of days the criteria differ by -
 * "divergence becomes a shape you see, not a table of badges you diff by
 * eye." The month x method table (DerivationTrace's neighbour on
 * /kalender) stays as this drawing's accessible, printable equivalent -
 * DESIGN.md is explicit that it must not be deleted.
 *
 * Clicking any boundary opens that evening on /hilal, via a plain <Link>
 * with the same ?lat=&lon=&d= query params ObservationProvider already
 * reads on mount (migration step 4) - no new wiring needed on the /hilal
 * side for this to work.
 */

const LANE_LABEL: Record<HilalMethod | "isbat", string> = {
  wujudul_hilal: "Wujudul Hilal",
  mabims_2021: "MABIMS 2021",
  odeh: "Odeh",
  isbat: "Sidang isbat",
};

// Odeh is drawn in the nila (indigo) ramp DESIGN.md §3.1 reserves for
// "secondary data series only". MABIMS is the accent since it's the
// baseline every offset is measured against; wujudul hilal is neutral ink
// since it's the simplest (boolean) criterion. Isbat is a diamond, not a
// tick, since it's a recorded outcome, not a hisab method.
const LANE_COLOR: Record<HilalMethod | "isbat", string> = {
  wujudul_hilal: "var(--text-muted)",
  mabims_2021: "var(--accent-solid)",
  odeh: "var(--nila-600)",
  isbat: "var(--verdict-lit)",
};

export interface BoundaryRibbonProps {
  points: BoundaryPoint[];
  viewport?: RibbonViewport;
  /** lat/lon/tz forwarded to each boundary's /hilal link, so clicking one opens the same place this archive was computed for. */
  lat: number;
  lon: number;
  /** DESIGN.md §6: "typing a date scrolls the ribbon and marks it" - the Hijri month (1-12) the context bar's current date falls in, if any. */
  highlightMonth?: number;
  className?: string;
}

function eveningBefore(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function BoundaryRibbon({
  points,
  viewport = DEFAULT_RIBBON_VIEWPORT,
  lat,
  lon,
  highlightMonth,
  className,
}: BoundaryRibbonProps) {
  const uid = useId();
  const layout = computeBoundaryRibbonLayout(points, { viewport });
  const { width, height } = viewport;

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-labelledby={`${uid}-desc`}
        className="h-auto w-full max-w-full"
      >
        <desc id={`${uid}-desc`}>
          Twelve Hijri month boundaries, one lane per criterion. A straight vertical line means every
          criterion agrees on the boundary; a zigzag means they differ, offset by the number of days.
        </desc>

        {/* DESIGN.md §6: "typing a date scrolls the ribbon and marks it" -
            the segment containing the context bar's current date, drawn
            first so everything else paints on top of it. */}
        {highlightMonth !== undefined &&
          (() => {
            const marked = layout.boundaries.find((b) => b.hijriMonth === highlightMonth);
            return marked ? (
              <rect
                x={marked.segmentX}
                y={0}
                width={layout.segmentWidth}
                height={height}
                fill="var(--accent-solid)"
                fillOpacity={0.08}
              />
            ) : null;
          })()}

        {/* Lane labels + guide lines. */}
        {[...LANES, "isbat" as const].map((lane) => (
          <g key={lane}>
            <line x1={0} y1={layout.laneY[lane]} x2={width} y2={layout.laneY[lane]} stroke="var(--border)" strokeWidth={1} />
            <text x={0} y={layout.laneY[lane] - 6} fontSize={10} fill="var(--text-muted)">
              {LANE_LABEL[lane]}
            </text>
          </g>
        ))}

        {layout.boundaries.map((boundary) => {
          const resolvedTicks = boundary.ticks.filter((t) => t.resolved);
          const sorted = [...boundary.ticks].sort((a, b) => a.y - b.y);
          return (
            <g key={boundary.hijriMonth}>
              {/* Connector: solid + thick when merged (reads as one band), dashed + thin when split (reads as divergence). */}
              {resolvedTicks.length > 1 && (
                <polyline
                  points={sorted.map((t) => `${t.x},${t.y}`).join(" ")}
                  fill="none"
                  stroke={boundary.merged ? "var(--accent-text)" : "var(--verdict-margin)"}
                  strokeWidth={boundary.merged ? 3 : 1.25}
                  strokeDasharray={boundary.merged ? undefined : "3 3"}
                  strokeLinejoin="round"
                />
              )}

              {boundary.ticks.map((tick) => (
                <circle
                  key={tick.lane}
                  cx={tick.x}
                  cy={tick.y}
                  r={tick.lane === "isbat" ? 3.5 : 3}
                  fill={tick.resolved ? LANE_COLOR[tick.lane] : "none"}
                  stroke={tick.resolved ? "none" : "var(--text-muted)"}
                  strokeWidth={tick.resolved ? 0 : 1}
                  strokeDasharray={tick.resolved ? undefined : "1.5 1.5"}
                  transform={tick.lane === "isbat" ? `rotate(45 ${tick.x} ${tick.y})` : undefined}
                  pointerEvents="none"
                >
                  <title>
                    {LANE_LABEL[tick.lane]}:{" "}
                    {tick.resolved
                      ? tick.offsetDays === 0
                        ? "sama dengan MABIMS 2021"
                        : `${tick.offsetDays! > 0 ? "+" : ""}${tick.offsetDays} hari dari MABIMS 2021`
                      : "belum terselesaikan / tidak ada catatan"}
                  </title>
                </circle>
              ))}

              <text
                x={boundary.segmentX + layout.segmentWidth / 2}
                y={height - 4}
                fontSize={10}
                textAnchor="middle"
                fill="var(--text-muted)"
                pointerEvents="none"
              >
                {boundary.hijriMonthName}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Click targets as real HTML links below the SVG, not inside it:
          foreignObject support for interactive content is inconsistent, and
          an SVG-native <a> around each cluster would need its own
          hit-testing story (see MIGRATION.md's step 5 notes on
          fill="transparent" not reliably receiving pointer events - the
          same class of risk). Twelve plain, keyboard-reachable links
          positioned to match their boundary is simpler and safer. */}
      <div className="relative mt-1 grid grid-cols-12 gap-0 text-2xs">
        {layout.boundaries.map((boundary) =>
          boundary.mabimsStartDate ? (
            <Link
              key={boundary.hijriMonth}
              href={`/hilal?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}&d=${eveningBefore(boundary.mabimsStartDate)}`}
              className="rounded px-1 py-0.5 text-center text-ink-muted underline decoration-dotted underline-offset-2 transition-colors duration-fast hover:text-accent"
            >
              {boundary.hijriMonthName.slice(0, 3)}
            </Link>
          ) : (
            <span key={boundary.hijriMonth} className="px-1 py-0.5 text-center text-ink-muted/40">
              {boundary.hijriMonthName.slice(0, 3)}
            </span>
          ),
        )}
      </div>
    </div>
  );
}
