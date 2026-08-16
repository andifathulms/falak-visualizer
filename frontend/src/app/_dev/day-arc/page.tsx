"use client";

/**
 * Standalone preview harness for DayArc (DESIGN.md §9.7, same discipline as
 * every other signature component in this migration). Private/unroutable -
 * see _dev/horizon-instrument/page.tsx.
 *
 * Computed in useEffect, not synchronously at render time - found the hard
 * way: a first version called buildDayArcInput/qiblaDirection directly in
 * the render body, which ran during static-export prerendering (Node.js)
 * AND again during client hydration (the browser's own engine), and
 * Math.sin/cos/atan2 are not guaranteed bit-identical across JS engines
 * (ECMA-262 leaves their precision implementation-defined). The drift was
 * large enough to shift which bisection-search endpoint dailyPrayerTimes
 * landed on, not just last-bit pixel noise, and threw real React hydration
 * errors, confirmed via the dev server's unminified error messages. Every
 * other data flow in this app (PetangIni, SeIndonesia, Setahun, /kalender)
 * already defers this class of computation to a post-mount effect for
 * exactly this reason - this harness now matches that pattern instead of
 * fighting it.
 *
 * Two of the four preview cities (Banda Aceh, Kupang) throw for this exact
 * date - a real, pre-existing defect in the frozen engine's
 * findHorizonCrossing, found while building this component. See
 * dayArcData.ts's assertSameCivilDay doc comment for the full explanation
 * and dayArcData.test.ts for the regression test. Rendered here as an
 * inline note per city rather than letting one bad city blank the whole
 * preview, so the two working cities (Jakarta, Jayapura) still confirm the
 * component itself is correct.
 */
import { useEffect, useState } from "react";
import { DayArc } from "@/components/DayArc";
import { buildDayArcInput } from "@/lib/dayArcData";
import { qiblaDirection } from "@/lib/falak/qibla";
import { KEMENAG_RI } from "@/lib/falak/prayerTimes";
import { parsePlainDate } from "@/lib/falak/time";
import { INDONESIAN_CITIES } from "@/lib/locations";
import type { DayArcInput } from "@/lib/dayArcGeometry";

const DATE = "2026-06-15";
const CITIES = ["Jakarta", "Banda Aceh", "Jayapura", "Kupang"];

type Result = { name: string; bearing: number; input: DayArcInput } | { name: string; error: string };

export default function DayArcPreview() {
  const [results, setResults] = useState<Result[] | null>(null);

  useEffect(() => {
    const computed = CITIES.map((name): Result => {
      const city = INDONESIAN_CITIES.find((c) => c.name === name)!;
      const bearing = qiblaDirection(city.lat, city.lon).bearingDeg;
      try {
        const input = buildDayArcInput(parsePlainDate(DATE), city.lat, city.lon, KEMENAG_RI, bearing);
        return { name, bearing, input };
      } catch (error) {
        return { name, error: error instanceof Error ? error.message : String(error) };
      }
    });
    setResults(computed);
  }, []);

  return (
    <div className="min-h-screen space-y-12 bg-surface-page p-8 text-ink">
      <h1 className="font-display text-2xl">DayArc — standalone preview</h1>
      {results === null && <p className="text-sm text-ink-muted">Computing…</p>}
      {results?.map((r) => (
        <section key={r.name} className="space-y-2 border-b border-border pb-8">
          <h2 className="font-mono text-xs text-ink-muted">
            {r.name} — {DATE}
            {"bearing" in r ? ` — kiblat ${r.bearing.toFixed(1)}°` : ""}
          </h2>
          {"error" in r ? (
            <div className="max-w-3xl rounded-2xl border border-verdict-dark/30 bg-verdict-dark/[0.07] p-4 text-sm text-verdict-dark">
              {r.error}
            </div>
          ) : (
            <div className="max-w-3xl rounded-2xl border border-border bg-surface-card p-4">
              <DayArc input={r.input} />
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
