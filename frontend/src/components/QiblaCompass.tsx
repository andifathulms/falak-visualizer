"use client";

import { SunGlyph } from "@/components/sky/Celestial";

const SIZE = 340;
const C = SIZE / 2;
const R = 132;

function polar(azimuthDeg: number, radius: number): [number, number] {
  const a = ((azimuthDeg - 90) * Math.PI) / 180;
  return [Math.round((C + Math.cos(a) * radius) * 100) / 100, Math.round((C + Math.sin(a) * radius) * 100) / 100];
}

function arcPath(fromDeg: number, toDeg: number, radius: number): string {
  const [x1, y1] = polar(fromDeg, radius);
  const [x2, y2] = polar(toDeg, radius);
  const delta = ((((toDeg - fromDeg) % 360) + 540) % 360) - 180;
  return `M${x1} ${y1} A${radius} ${radius} 0 0 ${delta >= 0 ? 1 : 0} ${x2} ${y2}`;
}

/**
 * QiblaCompass (DESIGN.md v2 §5.4): a compass rose with north up, the qibla
 * needle at its true bearing, and - when the Sun is up - the Sun at its real
 * azimuth with the turn from the chosen reference (the Sun, or the shadow
 * opposite it) drawn as an arc. Drawn with theme tokens; the Sun is the shared
 * SunGlyph so it looks the same here as in every sky.
 */
export function QiblaCompass({
  bearingDeg,
  sunAzimuthDeg,
  reference,
}: {
  bearingDeg: number;
  sunAzimuthDeg: number | null;
  /** Which body the reader faces first: the Sun itself, or their shadow (Sun + 180). */
  reference: "sun" | "shadow" | null;
}) {
  const refAz = sunAzimuthDeg === null || reference === null ? null : reference === "sun" ? sunAzimuthDeg : (sunAzimuthDeg + 180) % 360;
  const [qx, qy] = polar(bearingDeg, R - 14);
  const [kx, ky] = polar(bearingDeg, R + 20);

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto block h-auto w-full max-w-[22rem]" role="img" aria-label={`Kompas: kiblat ${bearingDeg.toFixed(1)} derajat dari utara`}>
      <circle cx={C} cy={C} r={R + 4} fill="var(--surface-raised)" />
      <circle cx={C} cy={C} r={R} fill="var(--surface-card)" stroke="var(--border)" />
      {Array.from({ length: 72 }, (_, i) => i * 5).map((a) => {
        const major = a % 30 === 0;
        const [x1, y1] = polar(a, R - (major ? 12 : 6));
        const [x2, y2] = polar(a, R - 1);
        return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--text-muted)" strokeOpacity={major ? 0.8 : 0.35} strokeWidth={major ? 1.6 : 1} />;
      })}
      {(
        [
          [0, "U"],
          [90, "T"],
          [180, "S"],
          [270, "B"],
        ] as Array<[number, string]>
      ).map(([a, label]) => {
        const [x, y] = polar(a, R - 28);
        return (
          <text key={label} x={x} y={y + 5} textAnchor="middle" fontSize={15} fontWeight={800} fill={label === "U" ? "var(--accent-text)" : "var(--text-muted)"}>
            {label}
          </text>
        );
      })}

      {refAz !== null && sunAzimuthDeg !== null && (
        <g>
          {reference === "shadow" && (
            <line x1={C} y1={C} x2={polar(refAz, R - 8)[0]} y2={polar(refAz, R - 8)[1]} stroke="var(--text-muted)" strokeWidth={5} strokeLinecap="round" strokeOpacity={0.35} />
          )}
          <line x1={C} y1={C} x2={polar(sunAzimuthDeg, R - 8)[0]} y2={polar(sunAzimuthDeg, R - 8)[1]} stroke="var(--sun)" strokeWidth={1.4} strokeDasharray="4 4" />
          <path d={arcPath(refAz, bearingDeg, 58)} fill="none" stroke="var(--sun)" strokeWidth={3} strokeLinecap="round" />
          <SunGlyph cx={polar(sunAzimuthDeg, R + 14)[0]} cy={polar(sunAzimuthDeg, R + 14)[1]} r={6} />
        </g>
      )}

      {/* Qibla needle and Kaaba mark. */}
      <line x1={C} y1={C} x2={qx} y2={qy} stroke="var(--verdict-lit)" strokeWidth={4.5} strokeLinecap="round" />
      <circle cx={C} cy={C} r={7} fill="var(--verdict-lit)" />
      <circle cx={C} cy={C} r={2.6} fill="var(--surface-card)" />
      <g transform={`translate(${kx - 9} ${ky - 9})`}>
        <rect width={18} height={18} rx={2.5} fill="var(--text-body)" />
        <rect y={5} width={18} height={2.4} fill="var(--verdict-lit)" />
      </g>
    </svg>
  );
}
