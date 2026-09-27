/**
 * The sky palette as numbers (DESIGN.md v2 §3.1): the one documented place
 * colour lives outside globals.css, because a sky gradient has to be
 * INTERPOLATED from the Sun's real altitude and CSS custom properties cannot be
 * mixed numerically at runtime. The fixed sky tokens in globals.css
 * (--sky-*) mirror the "sunset" and "night" keyframes below.
 *
 * Identical in both themes: the sky at maghrib is dusk-coloured whatever the
 * page theme is.
 */
export const SKY_INK = "#eeecf6";
export const SKY_INK_MUTED = "#b4b6d6";
export const SKY_SUN = "#f4a259";
export const SKY_MOON = "#f3e9cf";
export const SKY_LIT = "#f6d78b";
export const SKY_MARGIN = "#c7bcff";
export const SKY_GROUND = "#07081a";

type Stops = [string, string, string]; // zenith, mid, horizon

/** Keyframes by solar altitude (deg), ascending. Civil/nautical/astronomical twilight boundaries at -6/-12/-18. */
const KEYFRAMES: Array<[number, Stops]> = [
  [-18, ["#05060f", "#0a0c1e", "#11142c"]],
  [-12, ["#0b0d1f", "#161a3a", "#2e2548"]],
  [-6, ["#15163a", "#3a2a5a", "#a2585a"]],
  [-0.83, ["#2a2350", "#7a4a6b", "#e0875a"]],
  [4, ["#34457a", "#8a6f95", "#f3b27a"]],
  [12, ["#2f5e9e", "#5f93cf", "#bcd8ef"]],
];

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, "0");
  return `#${c(ar, br)}${c(ag, bg)}${c(ab, bb)}`;
}

/** Zenith, mid and horizon colours for a given solar altitude. */
export function skyStops(sunAltitudeDeg: number): Stops {
  if (sunAltitudeDeg <= KEYFRAMES[0][0]) return KEYFRAMES[0][1];
  const last = KEYFRAMES[KEYFRAMES.length - 1];
  if (sunAltitudeDeg >= last[0]) return last[1];
  for (let i = 0; i + 1 < KEYFRAMES.length; i += 1) {
    const [a0, s0] = KEYFRAMES[i];
    const [a1, s1] = KEYFRAMES[i + 1];
    if (sunAltitudeDeg >= a0 && sunAltitudeDeg <= a1) {
      const t = (sunAltitudeDeg - a0) / (a1 - a0);
      return [mix(s0[0], s1[0], t), mix(s0[1], s1[1], t), mix(s0[2], s1[2], t)];
    }
  }
  return last[1];
}

/** Stars fade in from civil twilight's end: invisible above -4 deg, full by -10 deg. */
export function starOpacity(sunAltitudeDeg: number): number {
  return Math.min(1, Math.max(0, (-sunAltitudeDeg - 4) / 6));
}

/** A deterministic star field (same stars on server and client - no Math.random at render). */
export function starField(count: number, width: number, height: number, seed = 7): Array<{ x: number; y: number; r: number; o: number }> {
  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  return Array.from({ length: count }, () => ({
    x: Math.round(rand() * width * 10) / 10,
    y: Math.round(rand() * height * 10) / 10,
    r: Math.round((0.35 + rand() * 0.9) * 100) / 100,
    o: Math.round((0.35 + rand() * 0.65) * 100) / 100,
  }));
}
