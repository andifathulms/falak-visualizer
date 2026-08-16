"use client";

import { HorizonInstrument } from "@/components/HorizonInstrument";
import { CriterionHistory } from "@/components/CriterionHistory";
import { CitationList } from "@/components/CitationList";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useObservation } from "@/components/ObservationProvider";
import { useHilalVisibility } from "@/components/useHilalVisibility";
import { useFirstEntranceAnimation } from "@/components/useFirstEntranceAnimation";
import { motion } from "framer-motion";
import { isVisible } from "@/lib/verdict";
import { verdictLabel } from "@/lib/verdictLabels";
import { formatMargin, MODEL_CAVEATS } from "@/lib/falak/tolerance";
import { CRITERION_CITATIONS } from "@/lib/falak/citations";
import { allThresholdBands, horizonReadingFromObservation } from "@/lib/instrumentGeometry";

/**
 * "Petang ini" - one place, one evening (DESIGN.md §4.2/§6). The absorbed
 * replacement for /hilal-visibility.
 *
 * No form, no submit button: place and date come from useObservation() (the
 * context bar, migration step 4) and every change recomputes immediately,
 * per DESIGN.md §4.3's "delete every per-page location form and submit
 * button that only existed to gate a calculation. Computation is fast and
 * local." Confirmed true for this specific call by the old page's own
 * behaviour (it already computed synchronously inside an async wrapper with
 * no progress UI) - unlike the Se-Indonesia and Setahun sweeps below it,
 * which sweep many evenings/places and keep their own explicit triggers.
 *
 * Longer explanatory prose (each criterion's "why", the model-caveats
 * descriptions) is left in English for now rather than mechanically
 * translated - see MIGRATION.md's step 5 notes on why that's a deliberate,
 * flagged scope boundary rather than an oversight. Short structural copy
 * (headings, the verdict sentence, labels) is Indonesian per DESIGN.md §7.
 */
const CRITERIA = [
  {
    key: "wujudul_hilal" as const,
    name: "Wujudul Hilal",
    rule: "Konjungsi sebelum matahari terbenam, dan bulan terbenam setelah matahari terbenam",
    why: "Asks whether the crescent EXISTS above the horizon, not whether anyone could see it. If the Moon sets before the Sun it is already gone during the only window it could be observed in, so lag time is the whole test.",
  },
  {
    key: "mabims_2021" as const,
    name: "MABIMS 2021",
    rule: "Altitude ≥ 3° AND elongation ≥ 6.4°",
    why: "Two conditions because they ask different things. Altitude asks whether the Moon is high enough to still be up in a dark enough sky. Elongation asks whether it has pulled far enough from the Sun to be lit at all — below roughly 6.4°, the Danjon limit, the crescent is too thin to be seen however high it sits. Both must hold; a comfortable altitude cannot rescue a crescent that physically is not there.",
  },
  {
    key: "odeh" as const,
    name: "Odeh",
    rule: "Nilai-v kontinu dari busur pandang dan lebar bulan sabit",
    why: "Not a threshold but a distance. Odeh fitted a curve to 737 recorded observations of the faintest crescents actually seen at each width; v is how far above that curve this evening sits. Positive and large means comfortably seen before, near zero means at the edge of what anyone has ever reported, which is why it returns four grades rather than yes or no.",
  },
];

function formatLocalTime(iso: string | null, timeZone: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone });
}

export function PetangIni() {
  const { lat, lon, dateIso, timeZone } = useObservation();
  const { obs, error, loading } = useHilalVisibility(dateIso, lat, lon);
  const animateEntrance = useFirstEntranceAnimation();

  const displayTimeZone = timeZone ?? "UTC";
  const headlineUndecided = obs?.margins?.mabims_2021?.verdict === "indeterminate";
  const headlineVisible = obs ? !headlineUndecided && isVisible(obs.criteria.mabims_2021) : false;

  return (
    <div className="space-y-6">
      {error && <ErrorBanner message={error} />}

      {obs && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="print-area space-y-6"
        >
          {/* The core object, first thing rendered (DESIGN.md §2.1) - no
              card, no padding box around it. -mx-4 sm:mx-0 breaks the SVG
              out of <main>'s own px-4 edge padding below the sm breakpoint,
              so it reaches the true viewport edge on mobile (§5.1: "it
              should not sit inside a card with 16px of padding around it")
              while staying within the normal content column on desktop
              (§5.1: "the instrument occupies the full content column").
              Found missing by actually rendering this at 375px, not
              assumed from the class list. */}
          <div className="-mx-4 sm:mx-0">
            <HorizonInstrument
              reading={horizonReadingFromObservation(obs)}
              bands={allThresholdBands(obs.crescent_width_arcmin)}
              verdictSentence={`${
                headlineUndecided
                  ? "Terlalu tipis untuk dipastikan"
                  : headlineVisible
                    ? "Hilal kemungkinan terlihat"
                    : "Hilal belum terpenuhi"
              }, menurut MABIMS 2021. Altitude ${obs.moon_altitude_deg.toFixed(1)} derajat, elongasi ${obs.elongation_deg.toFixed(1)} derajat.`}
              animateEntrance={animateEntrance}
            />
            <p className="mt-4 font-display text-xl">
              {headlineUndecided ? (
                "Terlalu tipis untuk dipastikan"
              ) : headlineVisible ? (
                <span className="text-verdict-lit">Hilal kemungkinan terlihat</span>
              ) : (
                <span className="text-verdict-dark">Hilal belum terpenuhi</span>
              )}
              <span className="ml-2 text-sm font-normal text-ink-muted">menurut MABIMS 2021</span>
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              Matahari terbenam {formatLocalTime(obs.sunset_time_utc, displayTimeZone)} · Bulan
              terbenam {formatLocalTime(obs.moonset_time_utc, displayTimeZone)} · Iluminasi{" "}
              {(obs.illumination_fraction * 100).toFixed(2)}%
            </p>
          </div>

          <Card className="p-5">
            <CriterionHistory obs={obs} />
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-md font-semibold">Perbandingan kriteria</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {CRITERIA.map((c, i) => {
                const verdict = obs.criteria[c.key];
                const m = obs.margins?.[c.key];
                const undecided = m?.verdict === "indeterminate";
                return (
                  <motion.div
                    key={c.key}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.06 }}
                    className="rounded-xl border border-border p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{c.name}</span>
                      <Badge tone={undecided ? "indeterminate" : isVisible(verdict) ? "positive" : "neutral"}>
                        {undecided ? "Belum pasti" : verdictLabel(verdict)}
                      </Badge>
                    </div>
                    <p className="mt-1.5 font-mono text-2xs text-ink">{c.rule}</p>
                    <p className="mt-1.5 text-sm text-ink-muted">{c.why}</p>
                    <CitationList keys={CRITERION_CITATIONS[c.key] ?? []} />
                    {m && (
                      <p className="mt-2 border-t border-border pt-2 text-2xs text-ink-muted">
                        {formatMargin(m) ? (
                          <>
                            <span className="font-mono font-semibold tabular-nums text-ink">
                              {formatMargin(m)}
                            </span>{" "}
                            margin on {m.binding}
                          </>
                        ) : (
                          <>Decided by: {m.binding}</>
                        )}
                        {undecided && (
                          <>
                            {" "}
                            — inside this engine&apos;s ±{m.tolerance}
                            {m.unit === "deg" ? "°" : " min"} tolerance, so it is not resolved.
                          </>
                        )}
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </div>
            <p className="mt-4 text-sm text-ink-muted">
              Ketiga kriteria ini bisa berbeda hasil — itu memang wajar, bukan kesalahan. Falak
              tidak memihak satu metode.
            </p>

            <details className="mt-3 rounded-xl border border-border px-3.5 py-2.5 text-sm">
              <summary className="cursor-pointer list-none font-medium [&::-webkit-details-marker]:hidden">
                Batasan model{" "}
                <span className="font-normal text-ink-muted underline decoration-dotted underline-offset-2">
                  ({MODEL_CAVEATS.length})
                </span>
              </summary>
              <dl className="mt-2.5 space-y-2.5">
                {MODEL_CAVEATS.map((cav) => (
                  <div key={cav.title}>
                    <dt className="text-2xs font-semibold uppercase tracking-wide">{cav.title}</dt>
                    <dd className="mt-0.5 text-sm text-ink-muted">{cav.detail}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </Card>

          <details className="rounded-xl border border-border px-3.5 py-2.5 text-sm">
            <summary className="cursor-pointer list-none font-medium [&::-webkit-details-marker]:hidden">
              Lintasan di sekitar matahari terbenam{" "}
              <span className="font-normal text-ink-muted underline decoration-dotted underline-offset-2">
                ({obs.trajectory.length} sampel)
              </span>
            </summary>
            <div className="mt-2.5 overflow-x-auto">
              <table className="w-full min-w-max text-left text-xs">
                <caption className="sr-only">
                  Altitude bulan dan elongasi, diambil tiap lima menit di sekitar matahari terbenam.
                </caption>
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="px-3 py-2 font-medium text-ink-muted">
                      Dari matahari terbenam
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium text-ink-muted">
                      Altitude bulan
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium text-ink-muted">
                      Elongasi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {obs.trajectory.map((point) => (
                    <tr key={point.minutes_from_sunset} className="border-b border-border/60 last:border-0">
                      <th scope="row" className="whitespace-nowrap px-3 py-1.5 font-normal">
                        {point.minutes_from_sunset > 0 ? "+" : ""}
                        {point.minutes_from_sunset} min
                      </th>
                      <td className="whitespace-nowrap px-3 py-1.5 font-mono tabular-nums">
                        {point.moon_altitude_deg.toFixed(2)}°
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5 font-mono tabular-nums">
                        {point.elongation_deg.toFixed(2)}°
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </motion.div>
      )}

      {loading && !obs && <p className="text-sm text-ink-muted">Menghitung…</p>}
    </div>
  );
}
