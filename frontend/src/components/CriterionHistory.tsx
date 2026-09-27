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
    label: "MABIMS 2021 (berlaku)",
    summary: "Tinggi ≥ 3° dan elongasi ≥ 6,4°",
    citation: CITATIONS.mabims_2021,
  },
  pre2021: {
    key: "pre2021" as const,
    label: "MABIMS 1992–2021 (lama)",
    summary: "Tinggi ≥ 2°, elongasi ≥ 3°, dan umur bulan ≥ 8 jam",
    citation: CITATIONS.mabims_pre2021,
  },
};

/** Each condition of a rule, evaluated against this evening's numbers. */
function conditionsFor(rule: "current" | "pre2021", obs: HilalObservation) {
  if (rule === "current") {
    return [
      { label: "Tinggi", need: "≥ 3°", got: `${obs.moon_altitude_deg.toFixed(2)}°`, met: obs.moon_altitude_deg >= 3 },
      { label: "Elongasi", need: "≥ 6,4°", got: `${obs.elongation_deg.toFixed(2)}°`, met: obs.elongation_deg >= 6.4 },
    ];
  }
  return [
    { label: "Tinggi", need: "≥ 2°", got: `${obs.moon_altitude_deg.toFixed(2)}°`, met: obs.moon_altitude_deg >= 2 },
    { label: "Elongasi", need: "≥ 3°", got: `${obs.elongation_deg.toFixed(2)}°`, met: obs.elongation_deg >= 3 },
    { label: "Umur bulan", need: "≥ 8 jam", got: `${obs.moon_age_hours.toFixed(1)} jam`, met: obs.moon_age_hours >= 8 },
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
    <section aria-labelledby="criterion-history" className="card p-5">
      <h2 id="criterion-history" className="text-md font-bold">
        Petang yang sama, aturan yang berbeda
      </h2>
      <p className="mt-1 text-sm text-ink-muted">
        MABIMS mengganti kriterianya pada 2021. Langitnya tidak berubah - hanya aturan yang diterapkan. Ganti aturannya dan lihat apa
        yang terjadi pada hasilnya.
      </p>

      <div role="group" aria-label="Aturan yang diterapkan" className="mt-3 inline-flex flex-wrap gap-1 rounded-full bg-surface-raised p-1">
        {(["current", "pre2021"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setRule(k)}
            aria-pressed={rule === k}
            className={
              rule === k
                ? "rounded-full bg-surface-card px-3.5 py-1.5 text-sm font-bold text-ink shadow-sm"
                : "rounded-full px-3.5 py-1.5 text-sm font-semibold text-ink-muted hover:text-ink"
            }
          >
            {RULES[k].label}
          </button>
        ))}
      </div>

      <p className="mt-3 text-sm font-semibold">{active.summary}</p>

      <ul className="mt-2 space-y-1.5">
        {conditions.map((c) => (
          <li key={c.label} className="flex flex-wrap items-center gap-x-2 text-sm">
            <span className="w-24 text-ink-muted">{c.label}</span>
            <span className="font-bold tabular-nums">{c.got.replace(".", ",")}</span>
            <span className="text-2xs text-ink-muted">perlu {c.need}</span>
            <Badge tone={c.met ? "positive" : "neutral"}>{c.met ? "Terpenuhi" : "Belum"}</Badge>
          </li>
        ))}
      </ul>

      <p className="mt-3 border-t border-border pt-3 text-sm">
        Dengan aturan ini hilal <span className="font-bold">{met ? "dianggap sudah ada" : "belum dianggap ada"}</span> petang ini.{" "}
        {met === otherMet ? (
          <span className="text-ink-muted">
            Aturan satunya sepakat - kebanyakan petang tidak cukup dekat dengan batas untuk membuat pilihan aturan berpengaruh. Petang yang
            dekat itulah yang menentukan kapan Ramadan dimulai.
          </span>
        ) : (
          <span className="text-ink-muted">Aturan satunya tidak sepakat. Pada petang seperti ini, aturan yang berlaku menentukan tanggal awal bulan.</span>
        )}
      </p>

      <p className="mt-2 text-2xs text-ink-muted">
        Perbandingan ini hanya untuk pemahaman - semua tanggal di Falak memakai MABIMS 2021 yang berlaku.
      </p>
    </section>
  );
}
