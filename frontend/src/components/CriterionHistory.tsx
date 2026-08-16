"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { CITATIONS } from "@/lib/falak/citations";
import type { HilalObservation } from "@/lib/api";

/**
 * The same evening judged by the rule Indonesia uses now and the rule it used
 * before 2021.
 *
 * This is the concept the app exists for, made manipulable instead of asserted:
 * one sky, two rules, and often two different answers. A reader who switches
 * between them and watches the verdict move understands "the criterion is the
 * variable" faster than any sentence achieves.
 *
 * WHY ONLY TWO, AND WHY THESE TWO. It would be more fun to give the user
 * sliders for the thresholds, and it would be wrong. This app's credibility
 * rests on never showing a number it cannot trace to a documented rule, and an
 * arbitrary 2.4° threshold traces to nothing. Both rules here are real, dated,
 * cited, and were each in official use - so switching between them is a
 * historical comparison, not a simulation.
 *
 * It is also deliberately NOT wired into month-start calculation anywhere. This
 * evaluates one evening for comparison; it never produces a calendar date, is
 * never the app's verdict, and cannot leak into the converter or the archive.
 * Both engines are untouched by it: every input below is a value the oracle
 * already computes and the golden vectors already pin.
 */
const RULES = {
  current: {
    key: "current" as const,
    label: "MABIMS 2021 (current)",
    summary: "Altitude ≥ 3° and elongation ≥ 6.4°",
    citation: CITATIONS.mabims_2021,
  },
  pre2021: {
    key: "pre2021" as const,
    label: "MABIMS 1992–2021 (former)",
    summary: "Altitude ≥ 2°, elongation ≥ 3°, and moon age ≥ 8 hours",
    citation: CITATIONS.mabims_pre2021,
  },
};

/** Each condition of a rule, evaluated against this evening's numbers. */
function conditionsFor(rule: "current" | "pre2021", obs: HilalObservation) {
  if (rule === "current") {
    return [
      { label: "Altitude", need: "≥ 3°", got: `${obs.moon_altitude_deg.toFixed(2)}°`, met: obs.moon_altitude_deg >= 3 },
      { label: "Elongation", need: "≥ 6.4°", got: `${obs.elongation_deg.toFixed(2)}°`, met: obs.elongation_deg >= 6.4 },
    ];
  }
  return [
    { label: "Altitude", need: "≥ 2°", got: `${obs.moon_altitude_deg.toFixed(2)}°`, met: obs.moon_altitude_deg >= 2 },
    { label: "Elongation", need: "≥ 3°", got: `${obs.elongation_deg.toFixed(2)}°`, met: obs.elongation_deg >= 3 },
    { label: "Moon age", need: "≥ 8 h", got: `${obs.moon_age_hours.toFixed(1)} h`, met: obs.moon_age_hours >= 8 },
  ];
}

export function CriterionHistory({ obs }: { obs: HilalObservation }) {
  const [rule, setRule] = useState<"current" | "pre2021">("current");
  const active = RULES[rule];
  const conditions = conditionsFor(rule, obs);
  const met = conditions.every((c) => c.met);
  const other = rule === "current" ? "pre2021" : "current";
  const otherMet = conditionsFor(other, obs).every((c) => c.met);

  return (
    <section aria-labelledby="criterion-history" className="rounded-xl border border-border p-4">
      <h2 id="criterion-history" className="text-md font-semibold">
        The same evening, under a different rule
      </h2>
      <p className="mt-1 text-sm text-ink-muted">
        MABIMS changed its criterion in 2021. Nothing about the sky changed — only the rule applied
        to it. Switch between them and watch what happens to the verdict.
      </p>

      <div
        role="group"
        aria-label="Criterion to apply"
        className="mt-3 inline-flex flex-wrap rounded-xl border border-border p-1"
      >
        {(["current", "pre2021"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setRule(k)}
            aria-pressed={rule === k}
            className={
              rule === k
                ? "rounded-lg bg-accent-solid/15 px-3 py-1.5 text-sm font-medium text-accent"
                : "rounded-lg px-3 py-1.5 text-sm font-medium text-ink-muted hover:text-ink"
            }
          >
            {RULES[k].label}
          </button>
        ))}
      </div>

      <p className="mt-3 font-mono text-2xs text-ink">{active.summary}</p>

      <ul className="mt-2 space-y-1">
        {conditions.map((c) => (
          <li key={c.label} className="flex flex-wrap items-center gap-x-2 text-sm">
            <span className="text-ink-muted">{c.label}</span>
            <span className="font-mono tabular-nums">{c.got}</span>
            <span className="text-2xs text-ink-muted">needs {c.need}</span>
            <Badge tone={c.met ? "positive" : "neutral"}>{c.met ? "Met" : "Not met"}</Badge>
          </li>
        ))}
      </ul>

      <p className="mt-3 border-t border-border pt-3 text-sm">
        Under this rule the crescent is{" "}
        <span className="font-semibold">{met ? "established" : "not established"}</span> on this
        evening.{" "}
        {met === otherMet ? (
          <span className="text-ink-muted">
            The other rule agrees here — most evenings are not close enough for the choice to
            matter. The ones that are decide when Ramadan starts.
          </span>
        ) : (
          <span className="text-ink-muted">
            The other rule disagrees. On an evening like this one, which rule is in force decides
            what date the month begins.
          </span>
        )}
      </p>

      <p className="mt-2 text-2xs text-ink-muted">
        {active.citation.reference}{" "}
        {"note" in active.citation && active.citation.note ? (
          <em>{active.citation.note}</em>
        ) : null}{" "}
        This comparison is for understanding only — every date this app produces uses the current
        MABIMS 2021 criterion.
      </p>
    </section>
  );
}
