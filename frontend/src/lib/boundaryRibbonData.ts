/**
 * Composes lib/api.ts's HijriYearArchive (per-method month starts) and
 * IsbatAccuracyResult (recorded sidang isbat dates) into BoundaryRibbon's
 * input shape. App-level composition, not engine code - reads two already-
 * validated api.ts outputs and does day-difference arithmetic on their
 * dates, the same class of operation fetchHijriYearArchive itself already
 * does for its own `offsets` field.
 */
import type { HijriYearArchive, IsbatAccuracyResult } from "./api";
import { daysBetween, parsePlainDate } from "./falak/time";
import type { BoundaryPoint } from "./boundaryRibbonGeometry";

export function boundaryPointsFromArchive(
  archive: HijriYearArchive,
  isbat: IsbatAccuracyResult | null,
): BoundaryPoint[] {
  return archive.months.map((month) => {
    const mabimsStartDate = month.starts.mabims_2021 ?? null;
    const isbatRecord = isbat?.records.find(
      (r) => r.hijri_year === archive.hijri_year && r.hijri_month === month.month,
    );
    const isbatOffsetDays =
      isbatRecord && mabimsStartDate
        ? daysBetween(parsePlainDate(mabimsStartDate), parsePlainDate(isbatRecord.actual_start_date))
        : null;

    return {
      hijriMonth: month.month,
      hijriMonthName: month.month_name,
      methodOffsetDays: month.offsets,
      isbatOffsetDays,
      mabimsStartDate,
    };
  });
}
