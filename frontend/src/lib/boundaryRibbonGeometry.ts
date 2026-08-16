/**
 * Pure geometry for BoundaryRibbon (DESIGN.md §5.2) - twelve Hijri months
 * laid left to right, each criterion a lane, agreement reading as a
 * straight vertical line and divergence as a zigzag offset by the number
 * of days the criteria differ by.
 *
 * Deliberately outside lib/falak/ for the same reason instrumentGeometry.ts
 * is: this is layout math (px-per-day scales, lane rows), not astronomy. It
 * consumes day-offsets the engine already computed (HijriYearArchive's
 * `offsets`, already measured against MABIMS 2021 - see lib/api.ts's
 * fetchHijriYearArchive) rather than computing anything new.
 *
 * Ribbon x-position is NOT literally calendar-proportional: the twelve
 * month boundaries are spaced evenly across the width, and only the small
 * within-boundary jitter (a lane's own day-offset from the MABIMS
 * baseline) is to scale. DESIGN.md asks for "twelve Hijri months laid left
 * to right", not a true day-of-year timeline, and evenly-spaced segments
 * keep every month equally legible regardless of how unevenly divergences
 * happen to fall across a real year.
 */
import type { HilalMethod } from "./falak/visibility";

export const LANES: readonly HilalMethod[] = ["wujudul_hilal", "mabims_2021", "odeh"];

export interface BoundaryPoint {
  hijriMonth: number;
  hijriMonthName: string;
  /** Days from the MABIMS 2021 baseline for this month; MABIMS's own offset is always 0. Absent = that method did not resolve this boundary. */
  methodOffsetDays: Partial<Record<HilalMethod, number>>;
  /** Days the recorded sidang isbat date sits from the MABIMS baseline; null = no isbat record for this month. */
  isbatOffsetDays: number | null;
  /** MABIMS 2021's actual Gregorian start date (ISO), carried through for the "open this evening on /hilal" link only - not used for any geometry, since layout works entirely in relative offsets. Null when MABIMS itself did not resolve this boundary. */
  mabimsStartDate: string | null;
}

export interface RibbonViewport {
  width: number;
  height: number;
}

export const DEFAULT_RIBBON_VIEWPORT: RibbonViewport = { width: 960, height: 160 };

const OFFSET_PX_PER_DAY = 8;
const MAX_OFFSET_PX = 28;
const LANE_Y_FRACTIONS: Record<HilalMethod | "isbat", number> = {
  wujudul_hilal: 0.2,
  mabims_2021: 0.45,
  odeh: 0.7,
  isbat: 0.92,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface LaneTick {
  lane: HilalMethod | "isbat";
  x: number;
  y: number;
  resolved: boolean;
  offsetDays: number | null;
}

export interface BoundaryLayout {
  hijriMonth: number;
  hijriMonthName: string;
  segmentX: number;
  ticks: LaneTick[];
  /** True when every resolved tick sits at the same x (agreement) - drives whether the connector reads as a solid merged band or a zigzag split. */
  merged: boolean;
  mabimsStartDate: string | null;
}

export interface RibbonLayout {
  viewport: RibbonViewport;
  segmentWidth: number;
  boundaries: BoundaryLayout[];
  laneY: Record<HilalMethod | "isbat", number>;
}

export function computeBoundaryRibbonLayout(
  points: BoundaryPoint[],
  options?: { viewport?: RibbonViewport },
): RibbonLayout {
  const viewport = options?.viewport ?? DEFAULT_RIBBON_VIEWPORT;
  const segmentWidth = viewport.width / points.length;
  const laneY = Object.fromEntries(
    (Object.keys(LANE_Y_FRACTIONS) as Array<HilalMethod | "isbat">).map((lane) => [
      lane,
      viewport.height * LANE_Y_FRACTIONS[lane],
    ]),
  ) as Record<HilalMethod | "isbat", number>;

  const boundaries: BoundaryLayout[] = points.map((point, i) => {
    const segmentX = i * segmentWidth;

    const ticks: LaneTick[] = [];
    for (const lane of LANES) {
      const offset = point.methodOffsetDays[lane];
      const resolved = offset !== undefined;
      const x = segmentX + clamp((offset ?? 0) * OFFSET_PX_PER_DAY, -MAX_OFFSET_PX, MAX_OFFSET_PX);
      ticks.push({ lane, x, y: laneY[lane], resolved, offsetDays: resolved ? (offset as number) : null });
    }
    const isbatResolved = point.isbatOffsetDays !== null;
    ticks.push({
      lane: "isbat",
      x: segmentX + clamp((point.isbatOffsetDays ?? 0) * OFFSET_PX_PER_DAY, -MAX_OFFSET_PX, MAX_OFFSET_PX),
      y: laneY.isbat,
      resolved: isbatResolved,
      offsetDays: point.isbatOffsetDays,
    });

    const resolvedTicks = ticks.filter((t) => t.resolved);
    const merged = resolvedTicks.length > 0 && resolvedTicks.every((t) => Math.abs(t.x - resolvedTicks[0].x) < 0.01);

    return {
      hijriMonth: point.hijriMonth,
      hijriMonthName: point.hijriMonthName,
      segmentX,
      ticks,
      merged,
      mabimsStartDate: point.mabimsStartDate,
    };
  });

  return { viewport, segmentWidth, boundaries, laneY };
}
