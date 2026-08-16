/**
 * Standalone preview harness for HorizonInstrument (DESIGN.md §9.3):
 * "Build standalone with fixture data...before wiring it to anything."
 *
 * This folder is prefixed with an underscore, which Next.js's App Router
 * excludes from routing entirely (a "private folder") - it produces no
 * route in dev, no page in the static export, and needs no metadata/layout
 * of its own. It exists purely so the component can be looked at against
 * realistic data while it's being built, and can stay in the repo for the
 * same purpose when BoundaryRibbon and DayArc get their own standalone
 * passes (DESIGN.md §9.6/§9.7) without ever being reachable from the live
 * app.
 */
import goldenVectors from "@/lib/falak/__fixtures__/golden-vectors.json";
import { HorizonInstrument } from "@/components/HorizonInstrument";
import {
  mabimsThresholdBand,
  odehThresholdBand,
  wujudulHilalMarkerBand,
  type HorizonReading,
} from "@/lib/instrumentGeometry";

const OBSERVATIONS = goldenVectors.visibility.observations;

function reading(o: (typeof OBSERVATIONS)[number]): HorizonReading {
  return {
    moonAltitudeDeg: o.moon_altitude_deg,
    sunAltitudeDeg: o.sun_altitude_deg,
    elongationDeg: o.elongation_deg,
    illuminationFraction: o.illumination_fraction,
    moonAgeHours: o.moon_age_hours,
    lagTimeMinutes: o.lag_time_minutes,
    crescentWidthArcmin: o.crescent_width_arcmin,
  };
}

const CASES: Array<{ title: string; o: (typeof OBSERVATIONS)[number]; withBands?: boolean }> = [
  {
    title: "Thin crescent, 0.21% illumination - not visible under any criterion (Jakarta, 2021-04-12)",
    o: OBSERVATIONS.find((x) => x.location === "Jakarta" && x.date === "2021-04-12")!,
    withBands: true,
  },
  {
    title: "Marginal under Odeh, met under MABIMS (Cape Town, 2021-04-12)",
    o: OBSERVATIONS.find((x) => x.location === "Cape Town" && x.criteria.odeh === "marginal")!,
    withBands: true,
  },
  {
    title: "Clearly visible under every criterion (Cape Town, 2024-03-11)",
    o: OBSERVATIONS.find((x) => x.location === "Cape Town" && x.date === "2024-03-11")!,
    withBands: true,
  },
  {
    title: "Below the horizon at sunset - wujudul hilal fails too (Jayapura, 2024-04-08)",
    o: OBSERVATIONS.reduce((min, x) => (x.moon_altitude_deg < min.moon_altitude_deg ? x : min)),
  },
  {
    title: "Stress case: far outside hilal range (37° altitude, 9h+ lag) - clamps rather than breaking",
    o: OBSERVATIONS.reduce((max, x) => (x.moon_altitude_deg > max.moon_altitude_deg ? x : max)),
  },
  {
    title: "Synthetic: moonset undetermined (lagTimeMinutes null) - CLAUDE.md no-silent-fallback path",
    o: { ...OBSERVATIONS[0], lag_time_minutes: null as unknown as number },
  },
];

export default function HorizonInstrumentPreview() {
  return (
    <div className="min-h-screen space-y-12 bg-surface-page p-8 text-ink">
      <h1 className="font-display text-2xl">HorizonInstrument — standalone preview</h1>
      {CASES.map(({ title, o, withBands }) => (
        <section key={title} className="space-y-2 border-b border-border pb-8">
          <h2 className="font-mono text-xs text-ink-muted">{title}</h2>
          <div className="max-w-3xl rounded-2xl border border-border bg-surface-card p-4">
            <HorizonInstrument
              reading={reading(o)}
              bands={withBands ? [wujudulHilalMarkerBand(), mabimsThresholdBand(), odehThresholdBand(o.crescent_width_arcmin)] : []}
              verdictSentence={`${o.location}, ${o.date}: odeh=${o.criteria.odeh}, mabims_2021=${o.criteria.mabims_2021}, wujudul_hilal=${o.criteria.wujudul_hilal}.`}
            />
          </div>
        </section>
      ))}
    </div>
  );
}
