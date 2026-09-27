"use client";

import { useId } from "react";
import { SKY_GROUND, SKY_INK, SKY_MOON, SKY_SUN, skyStops, starField, starOpacity } from "@/lib/skyPalette";

/**
 * Shared SVG primitives for every sky drawing (DESIGN.md v2 §5): one Sun, one
 * Moon, one sky. The Sun is always ember and the Moon always pearl, in every
 * view (§3.1) - these components are the only place either is drawn.
 */

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * The Moon at a given illuminated fraction, lit limb facing `litTowardDeg`
 * (SVG angle: 0 = +x, 90 = +y/down).
 *
 * Geometry is the real phase shape rather than two overlapping circles: the
 * lit region is bounded by a semicircle (the limb) and a semi-ellipse (the
 * terminator) whose half-width is r·|1 − 2k|. A faint full disc behind it is
 * the earthshine outline, and the glow keeps a thin hilal findable without
 * fattening the crescent itself.
 */
export function MoonGlyph({
  cx,
  cy,
  r,
  illumination,
  litTowardDeg,
  glow = true,
  earthshine = true,
}: {
  cx: number;
  cy: number;
  r: number;
  illumination: number;
  litTowardDeg: number;
  glow?: boolean;
  earthshine?: boolean;
}) {
  const uid = useId();
  const k = Math.min(1, Math.max(0, illumination));
  const rx = round(Math.abs(1 - 2 * k) * r);
  // Terminator bulges toward the lit side for k < 0.5 (crescent), away from it for k > 0.5 (gibbous).
  const sweep = k < 0.5 ? 0 : 1;
  const d = `M0 ${-r} A${r} ${r} 0 0 1 0 ${r} A${rx} ${r} 0 0 ${sweep} 0 ${-r}Z`;

  return (
    <g transform={`translate(${round(cx)} ${round(cy)}) rotate(${round(litTowardDeg)})`}>
      {glow && (
        <>
          <defs>
            <radialGradient id={`${uid}-glow`}>
              <stop offset="0%" stopColor={SKY_MOON} stopOpacity={0.35 + 0.25 * k} />
              <stop offset="100%" stopColor={SKY_MOON} stopOpacity={0} />
            </radialGradient>
          </defs>
          <circle r={r * (2.2 + 1.2 * k)} fill={`url(#${uid}-glow)`} />
        </>
      )}
      {earthshine && <circle r={r} fill={SKY_MOON} fillOpacity={0.07} stroke={SKY_MOON} strokeOpacity={0.28} strokeWidth={0.8} />}
      {k > 0.001 && <path d={d} fill={SKY_MOON} />}
      {/* The limb itself, so even a sub-pixel crescent draws a visible edge. */}
      {k < 0.5 && (
        <path d={`M0 ${-r} A${r} ${r} 0 0 1 0 ${r}`} fill="none" stroke={SKY_MOON} strokeWidth={Math.max(1.4, r * 0.14)} strokeLinecap="round" />
      )}
    </g>
  );
}

export function SunGlyph({ cx, cy, r, dimmed = false }: { cx: number; cy: number; r: number; dimmed?: boolean }) {
  const uid = useId();
  return (
    <g opacity={dimmed ? 0.75 : 1}>
      <defs>
        <radialGradient id={`${uid}-glow`}>
          <stop offset="0%" stopColor={SKY_SUN} stopOpacity={0.55} />
          <stop offset="100%" stopColor={SKY_SUN} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={round(cx)} cy={round(cy)} r={r * 4.5} fill={`url(#${uid}-glow)`} />
      <circle cx={round(cx)} cy={round(cy)} r={r} fill={SKY_SUN} />
    </g>
  );
}

/**
 * The sky behind a drawing: gradient recomputed from the Sun's real altitude,
 * stars that appear only when it is actually dark, and a ground silhouette
 * below the horizon line.
 */
export function SkyBackdrop({
  width,
  height,
  horizonY,
  sunAltitudeDeg,
  stars = 60,
  seed = 7,
}: {
  width: number;
  height: number;
  horizonY: number;
  sunAltitudeDeg: number;
  stars?: number;
  seed?: number;
}) {
  const uid = useId();
  const [top, mid, bottom] = skyStops(sunAltitudeDeg);
  const starAlpha = starOpacity(sunAltitudeDeg);
  const field = starField(stars, width, horizonY * 0.85, seed);
  const hill = `M0 ${round(horizonY)} C${round(width * 0.18)} ${round(horizonY - 5)} ${round(width * 0.32)} ${round(horizonY + 2)} ${round(width * 0.5)} ${round(horizonY - 3)} S${round(width * 0.82)} ${round(horizonY - 6)} ${width} ${round(horizonY)} V${height} H0Z`;

  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={top} style={{ transition: "stop-color 600ms ease" }} />
          <stop offset="62%" stopColor={mid} style={{ transition: "stop-color 600ms ease" }} />
          <stop offset="100%" stopColor={bottom} style={{ transition: "stop-color 600ms ease" }} />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={width} height={round(horizonY)} fill={`url(#${uid}-sky)`} />
      <g opacity={starAlpha} style={{ transition: "opacity 600ms ease" }} aria-hidden="true">
        {field.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill={SKY_INK}
            opacity={s.o}
            className={i % 4 === 0 ? "motion-safe:animate-twinkle" : undefined}
            style={i % 4 === 0 ? { animationDelay: `${(i % 9) * 0.45}s` } : undefined}
          />
        ))}
      </g>
      <path d={hill} fill={SKY_GROUND} />
      <line x1={0} y1={round(horizonY)} x2={width} y2={round(horizonY)} stroke={SKY_INK} strokeOpacity={0.28} />
    </g>
  );
}
