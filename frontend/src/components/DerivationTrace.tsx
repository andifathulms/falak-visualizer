import { MoonStar } from "lucide-react";
import type { ConversionDerivation } from "@/lib/api";

/**
 * How a Hijri month start was actually reached, shown next to the date it
 * produced.
 *
 * This is the app's stated purpose rendered literally. The converter used to
 * answer "why does this month start here?" with the method name and the
 * conversion direction - both of which the user had just chosen - so the one
 * page that asks the question showed none of the work.
 *
 * Every intermediate value the engine used is here, in the order it used them,
 * including the evenings that FAILED. The failures are the instructive part:
 * they are where a reader sees that the month rolled to a 30th day because the
 * crescent was not yet established, which is the mechanism the whole calendar
 * turns on.
 *
 * DESIGN.md §6 asks for real typographic hierarchy here, not just a token
 * restyle: numbered steps, the failing condition in --verdict-dark, the
 * passing one in --verdict-lit, values in Plex Mono (font-mono already
 * resolves there as of migration step 2). "Given its own section" happens
 * on the /kalender page that renders this, not in this component.
 */
export function DerivationTrace({ derivation }: { derivation: ConversionDerivation }) {
  return (
    <section className="mt-4 rounded-xl border border-border p-4">
      <h3 className="font-display text-md">
        Bagaimana {derivation.hijri_month_name} {derivation.hijri_year} H ditetapkan
      </h3>

      {/* Step zero, and the assumption everything else rests on. */}
      <ol className="mt-3 space-y-4">
        <li className="flex gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-2xs font-semibold text-ink-muted">
            <MoonStar className="size-3.5 text-accent" strokeWidth={2} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm">
              <span className="font-medium">Konjungsi (ijtimak)</span> —{" "}
              <span className="font-mono tabular-nums">
                {derivation.conjunction_utc.slice(0, 16).replace("T", " ")} UTC
              </span>
            </p>
            <p className="mt-0.5 text-2xs text-ink-muted">
              The moment the Moon passes the Sun in longitude. No crescent of this month can exist
              before it, so it is where the search starts — not where the month starts.
            </p>
          </div>
        </li>

        {derivation.steps.map((step, i) => {
          const passed = step.criterion_met;
          return (
            <li key={step.evening} className="flex gap-3">
              <span
                className={
                  passed
                    ? "flex size-6 shrink-0 items-center justify-center rounded-full bg-verdict-lit/15 text-2xs font-semibold tabular-nums text-verdict-lit"
                    : "flex size-6 shrink-0 items-center justify-center rounded-full bg-verdict-dark/10 text-2xs font-semibold tabular-nums text-verdict-dark"
                }
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm">
                  <span className="font-medium">Petang {i + 1}</span> — matahari terbenam{" "}
                  <span className="font-mono tabular-nums">{step.evening}</span>
                </p>

                <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-2xs text-ink-muted">
                  <div className="flex gap-1">
                    <dt>Altitude</dt>
                    <dd className="font-mono tabular-nums text-ink">{step.moon_altitude_deg.toFixed(2)}°</dd>
                  </div>
                  <div className="flex gap-1">
                    <dt>Elongasi</dt>
                    <dd className="font-mono tabular-nums text-ink">{step.elongation_deg.toFixed(2)}°</dd>
                  </div>
                  <div className="flex gap-1">
                    <dt>Lag</dt>
                    <dd className="font-mono tabular-nums text-ink">
                      {step.lag_time_minutes === null ? "—" : `${step.lag_time_minutes.toFixed(0)} min`}
                    </dd>
                  </div>
                </dl>

                <p
                  className={
                    !step.conjunction_before_sunset
                      ? "mt-1 text-2xs text-ink-muted"
                      : passed
                        ? "mt-1 text-2xs text-verdict-lit"
                        : "mt-1 text-2xs text-verdict-dark"
                  }
                >
                  {!step.conjunction_before_sunset ? (
                    <>
                      Konjungsi belum terjadi saat matahari terbenam ini, jadi tidak ada yang bisa
                      dilihat berapa pun angkanya. Pencarian lanjut ke petang berikutnya.
                    </>
                  ) : passed ? (
                    <>
                      MABIMS 2021 terpenuhi — altitude minimal 3° dan elongasi minimal 6,4°. Karena
                      hari Hijriah dimulai saat matahari terbenam, hari pertama bulan ini adalah
                      tanggal Masehi <span className="font-medium">berikutnya</span>:{" "}
                      <span className="font-mono tabular-nums">{derivation.month_start}</span>.
                    </>
                  ) : (
                    <>
                      MABIMS 2021 belum terpenuhi, sehingga bulan sebelumnya genap 30 hari dan
                      pencarian lanjut ke petang berikutnya.
                    </>
                  )}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-3 border-t border-border pt-3 text-2xs text-ink-muted">
        Evaluated at the location set above — the same evening can meet the criterion in one part of
        Indonesia and miss it in another, which is why the location matters and why the map exists.
      </p>
    </section>
  );
}
