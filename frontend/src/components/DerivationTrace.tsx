import { CircleCheck, CircleX, MoonStar } from "lucide-react";
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
 */
export function DerivationTrace({ derivation }: { derivation: ConversionDerivation }) {
  return (
    <section className="mt-4 rounded-xl border border-neutral-200 p-4 dark:border-night-700/60">
      <h3 className="text-sm font-semibold">
        How {derivation.hijri_month_name} {derivation.hijri_year} H was placed
      </h3>

      {/* Step zero, and the assumption everything else rests on. Stated here
          rather than in an about page because this is the first place a reader
          meets it. */}
      <ol className="mt-3 space-y-3">
        <li className="flex gap-3">
          <MoonStar className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={2} />
          <div>
            <p className="text-sm">
              <span className="font-medium">Conjunction (ijtimak)</span> —{" "}
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
              {passed ? (
                <CircleCheck
                  className="mt-0.5 size-4 shrink-0 text-verdict-positive"
                  strokeWidth={2}
                />
              ) : (
                <CircleX className="mt-0.5 size-4 shrink-0 text-ink-muted" strokeWidth={2} />
              )}
              <div className="min-w-0">
                <p className="text-sm">
                  <span className="font-medium">Evening {i + 1}</span> — sunset on{" "}
                  <span className="font-mono tabular-nums">{step.evening}</span>
                </p>

                <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-2xs text-ink-muted">
                  <div className="flex gap-1">
                    <dt>Altitude</dt>
                    <dd className="font-mono tabular-nums text-foreground">
                      {step.moon_altitude_deg.toFixed(2)}°
                    </dd>
                  </div>
                  <div className="flex gap-1">
                    <dt>Elongation</dt>
                    <dd className="font-mono tabular-nums text-foreground">
                      {step.elongation_deg.toFixed(2)}°
                    </dd>
                  </div>
                  <div className="flex gap-1">
                    <dt>Lag</dt>
                    <dd className="font-mono tabular-nums text-foreground">
                      {step.lag_time_minutes === null
                        ? "—"
                        : `${step.lag_time_minutes.toFixed(0)} min`}
                    </dd>
                  </div>
                </dl>

                <p className="mt-1 text-2xs text-ink-muted">
                  {!step.conjunction_before_sunset ? (
                    <>
                      Conjunction had not yet happened by this sunset, so there was nothing to see
                      regardless of the numbers. The month runs on to the next evening.
                    </>
                  ) : passed ? (
                    <>
                      MABIMS 2021 met — altitude at least 3° and elongation at least 6.4°. Because a
                      Hijri day begins at sunset, the first day of the month is the{" "}
                      <span className="font-medium text-foreground">next</span> Gregorian date:{" "}
                      <span className="font-mono tabular-nums text-foreground">
                        {derivation.month_start}
                      </span>
                      .
                    </>
                  ) : (
                    <>
                      MABIMS 2021 not met, so the previous month takes a 30th day and the search
                      moves to the next evening.
                    </>
                  )}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-3 border-t border-neutral-200 pt-3 text-2xs text-ink-muted dark:border-night-700/60">
        Evaluated at the location set above — the same evening can meet the criterion in one part of
        Indonesia and miss it in another, which is why the location matters and why the map exists.
      </p>
    </section>
  );
}
