"use client";

import { MoonGlyph, SkyBackdrop, SunGlyph } from "@/components/sky/Celestial";
import { SKY_INK, SKY_INK_MUTED, SKY_MOON, SKY_SUN } from "@/lib/skyPalette";
import { compassName, moonPhaseName, type SkyNow as SkyNowData } from "@/lib/skyNow";

const H = 300;
const HORIZON = 222;
const TOP_PAD = 18;

const COMPASS: Array<[number, string]> = [
  [0, "U"],
  [45, "TL"],
  [90, "T"],
  [135, "TG"],
  [180, "S"],
  [225, "BD"],
  [270, "B"],
  [315, "BL"],
  [360, "U"],
];


function yOf(altitudeDeg: number): number {
  return HORIZON - (Math.max(0, altitudeDeg) / 90) * (HORIZON - TOP_PAD);
}

function fmt(value: number): string {
  return value.toFixed(1).replace(".", ",");
}

/**
 * The whole sky right now as a panorama (DESIGN.md v2 §5.2): azimuth across,
 * altitude up, north at both edges. Sun and Moon at their real positions
 * (azimuth cross-checked against JPL DE440), the Moon at its real phase with
 * its lit limb turned toward where the Sun actually is, stars only when the
 * Sun is far enough down for them to be out.
 */
export function SkyNow({ sky, placeName, width = 720 }: { sky: SkyNowData; placeName: string; width?: number }) {
  const W = width;
  const xOf = (azimuthDeg: number): number => ((((azimuthDeg % 360) + 360) % 360) / 360) * W;
  const { sun, moon } = sky;
  const sunUp = sun.altitudeDeg > -0.83;
  const moonUp = moon.altitudeDeg > -0.3;

  const mx = xOf(moon.azimuthDeg);
  const my = yOf(moon.altitudeDeg);
  // Screen direction from the Moon toward the Sun, for the lit limb. The
  // azimuth difference is wrapped so "toward the Sun" takes the short way.
  const dAz = ((((sun.azimuthDeg - moon.azimuthDeg) % 360) + 540) % 360) - 180;
  const pxPerAz = W / 360;
  const pxPerAlt = (HORIZON - TOP_PAD) / 90;
  const litToward = (Math.atan2(-(sun.altitudeDeg - moon.altitudeDeg) * pxPerAlt, dAz * pxPerAz) * 180) / Math.PI;

  const phase = moonPhaseName(moon.elongationLongitudeDeg);
  const desc =
    `Langit sekarang di ${placeName}. Matahari ${sunUp ? `${fmt(sun.altitudeDeg)}° di atas ufuk` : `${fmt(-sun.altitudeDeg)}° di bawah ufuk`}, ` +
    `arah ${compassName(sun.azimuthDeg)}. Bulan ${moonUp ? `${fmt(moon.altitudeDeg)}° di atas ufuk` : "di bawah ufuk"}, arah ${compassName(moon.azimuthDeg)}, ` +
    `${phase.toLowerCase()}, ${Math.round(moon.illumination * 100)}% bercahaya.`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={desc} className="block h-auto w-full">
      <SkyBackdrop width={W} height={H} horizonY={HORIZON} sunAltitudeDeg={sun.altitudeDeg} stars={90} />

      {/* Altitude guides: faint, labelled at 30 and 60 degrees. */}
      {[30, 60].map((alt) => (
        <g key={alt} opacity={0.35}>
          <line x1={0} x2={W} y1={yOf(alt)} y2={yOf(alt)} stroke={SKY_INK} strokeOpacity={0.25} strokeDasharray="2 6" />
          <text x={6} y={yOf(alt) - 4} fontSize={10} fill={SKY_INK_MUTED}>
            {alt}°
          </text>
        </g>
      ))}

      {sunUp && (
        <g>
          <SunGlyph cx={xOf(sun.azimuthDeg)} cy={yOf(sun.altitudeDeg)} r={9} />
          <text x={Math.min(W - 60, Math.max(60, xOf(sun.azimuthDeg)))} y={yOf(sun.altitudeDeg) - 18} textAnchor="middle" fontSize={12} fontWeight={700} fill={SKY_SUN}>
            Matahari {fmt(sun.altitudeDeg)}°
          </text>
        </g>
      )}

      {moonUp && (
        <g>
          <MoonGlyph cx={mx} cy={my} r={10} illumination={moon.illumination} litTowardDeg={litToward} />
          <text x={Math.min(W - 48, Math.max(48, mx))} y={my - 20} textAnchor="middle" fontSize={12} fontWeight={700} fill={SKY_MOON}>
            Bulan {Math.round(moon.illumination * 100)}%
          </text>
        </g>
      )}

      {/* Compass along the ground. */}
      {COMPASS.map(([az, label], i) => (
        <g key={i}>
          <line x1={xOf(az) || (i === 0 ? 0.5 : W - 0.5)} x2={xOf(az) || (i === 0 ? 0.5 : W - 0.5)} y1={HORIZON} y2={HORIZON + 6} stroke={SKY_INK} strokeOpacity={0.5} />
          <text
            x={i === 0 ? 4 : i === COMPASS.length - 1 ? W - 4 : xOf(az)}
            y={HORIZON + 22}
            textAnchor={i === 0 ? "start" : i === COMPASS.length - 1 ? "end" : "middle"}
            fontSize={11}
            fontWeight={700}
            fill={label.length === 1 ? SKY_INK : SKY_INK_MUTED}
            opacity={label.length === 1 ? 0.9 : 0.6}
          >
            {label}
          </text>
        </g>
      ))}

      {/* Bodies below the horizon get a quiet note at the ground, not a fake position. */}
      <text x={W / 2} y={H - 18} textAnchor="middle" fontSize={11.5} fill={SKY_INK_MUTED}>
        {!sunUp && `Matahari ${fmt(-sun.altitudeDeg)}° di bawah ufuk`}
        {!sunUp && !moonUp && " · "}
        {!moonUp && `Bulan di bawah ufuk (${phase.toLowerCase()})`}
      </text>
    </svg>
  );
}
