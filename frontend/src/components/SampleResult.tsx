"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/Badge";
import { HilalMoon } from "@/components/HilalMoon";

/**
 * A static, illustrative example of a hilal visibility result, shown in the
 * landing hero.
 *
 * Why this exists: the product's whole differentiator is that a verdict comes
 * with the numbers that produced it, and until you clicked into a tool the
 * landing page asserted that in prose without ever showing it. One filled-in
 * answer communicates the category, the output shape and the "inspectable, not
 * a black box" promise at a glance, which no sentence does as quickly.
 *
 * The figures below are FIXED and ILLUSTRATIVE. Nothing here calls the engine -
 * this component computes nothing, fetches nothing and takes no input. That is
 * deliberate on two counts. It keeps the landing page free of a calculation in
 * its render path, and it keeps the app's rule against unflagged placeholder
 * values intact: these numbers are never presented as a live result. The panel
 * is labelled "Example" in the header, captioned as illustrative underneath,
 * and marked aria-hidden so a screen reader is not handed a set of plausible
 * figures with no way to tell they are fictional. The adjacent call to action
 * is what leads to a real, computed answer.
 *
 * A marginal night was chosen on purpose: it is the case where the three
 * criteria disagree, which is the single most informative thing about the
 * subject and the reason the app shows all three side by side.
 */
const EXAMPLE = {
  place: "Jakarta",
  when: "Evening of 19 Feb 2026",
  illumination: 0.011,
  metrics: [
    { label: "Moon altitude", value: "3.2°", note: "above the horizon at sunset" },
    { label: "Elongation", value: "6.9°", note: "angular distance from the sun" },
    { label: "Moon age", value: "8h 41m", note: "since conjunction (ijtimak)" },
    { label: "Lag time", value: "16 min", note: "moonset after sunset" },
  ],
  criteria: [
    { name: "Wujudul Hilal", verdict: "Met", tone: "positive" as const },
    { name: "MABIMS 2021", verdict: "Met", tone: "positive" as const },
    { name: "Odeh", verdict: "Needs optical aid", tone: "neutral" as const },
  ],
};

export function SampleResult() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25, ease: "easeOut" }}
      aria-hidden
      className="glass-card w-full rounded-2xl p-5 shadow-sm shadow-black/5 dark:shadow-black/30"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-2xs font-medium uppercase tracking-wide text-ink-muted">Example</p>
          <p className="mt-0.5 text-sm font-semibold">{EXAMPLE.place}</p>
        </div>
        <p className="text-xs text-ink-muted">{EXAMPLE.when}</p>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="shrink-0 scale-[0.62] -my-4 -ml-4">
          <HilalMoon illuminationFraction={EXAMPLE.illumination} visible />
        </div>
        <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3">
          {EXAMPLE.metrics.map((m) => (
            <div key={m.label}>
              <dt className="text-2xs text-ink-muted">{m.label}</dt>
              <dd className="font-mono text-md font-semibold tabular-nums">{m.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-4 space-y-2 border-t border-[var(--card-border)] pt-4">
        {EXAMPLE.criteria.map((c) => (
          <div key={c.name} className="flex items-center justify-between gap-3">
            <span className="text-xs text-ink-muted">{c.name}</span>
            <Badge tone={c.tone}>{c.verdict}</Badge>
          </div>
        ))}
      </div>

      <p className="mt-4 text-2xs text-ink-muted">
        Illustrative figures, not a live calculation. A marginal night — the criteria disagree.
      </p>
    </motion.div>
  );
}
