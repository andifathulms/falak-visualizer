"use client";

/**
 * Standalone preview harness for BoundaryRibbon (DESIGN.md §9.6, same
 * "build standalone before wiring it to anything" discipline as step 3's
 * HorizonInstrument harness). Private/unroutable folder - see
 * _dev/horizon-instrument/page.tsx for why.
 *
 * Uses real engine output (fetchHijriYearArchive + fetchIsbatAccuracy),
 * not fabricated numbers - the same reasoning as every other preview
 * harness in this migration.
 */
import { useEffect, useState } from "react";
import { BoundaryRibbon } from "@/components/BoundaryRibbon";
import { fetchHijriYearArchive, fetchIsbatAccuracy, type HijriYearArchive, type IsbatAccuracyResult } from "@/lib/api";
import { boundaryPointsFromArchive } from "@/lib/boundaryRibbonData";
import { JAKARTA_LATITUDE_DEG, JAKARTA_LONGITUDE_DEG } from "@/lib/falak/converter";

const YEARS_WITH_ISBAT_RECORDS = [1445, 1446, 1447];

export default function BoundaryRibbonPreview() {
  const [results, setResults] = useState<Array<{ year: number; archive: HijriYearArchive; isbat: IsbatAccuracyResult }>>([]);

  useEffect(() => {
    Promise.all(
      YEARS_WITH_ISBAT_RECORDS.map(async (year) => {
        const [archive, isbat] = await Promise.all([
          fetchHijriYearArchive({ hijriYear: year, lat: JAKARTA_LATITUDE_DEG, lon: JAKARTA_LONGITUDE_DEG }),
          fetchIsbatAccuracy({ hijri_year: year }),
        ]);
        return { year, archive, isbat };
      }),
    ).then(setResults);
  }, []);

  return (
    <div className="min-h-screen space-y-12 bg-surface-page p-8 text-ink">
      <h1 className="font-display text-2xl">BoundaryRibbon — standalone preview</h1>
      {results.length === 0 && <p className="text-sm text-ink-muted">Computing three years of month starts…</p>}
      {results.map(({ year, archive, isbat }) => (
        <section key={year} className="space-y-2 border-b border-border pb-8">
          <h2 className="font-mono text-xs text-ink-muted">
            {year}H — {archive.unanimous_months}/12 unanimous, {isbat.count} isbat records
          </h2>
          <div className="max-w-4xl rounded-2xl border border-border bg-surface-card p-4">
            <BoundaryRibbon
              points={boundaryPointsFromArchive(archive, isbat)}
              lat={JAKARTA_LATITUDE_DEG}
              lon={JAKARTA_LONGITUDE_DEG}
            />
          </div>
        </section>
      ))}
    </div>
  );
}
