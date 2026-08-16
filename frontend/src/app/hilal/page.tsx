"use client";

import { useEffect, useState } from "react";
import { PetangIni } from "@/components/hilal/PetangIni";
import { Setahun } from "@/components/hilal/Setahun";
import { SeIndonesia } from "@/components/hilal/SeIndonesia";
import { HisabDisclaimer } from "@/components/HisabDisclaimer";
import { readQueryParams } from "@/lib/permalink";
import type { HilalMethod } from "@/lib/api";

/**
 * /hilal - the sweep selector (DESIGN.md §4.2/§6), absorbing
 * /hilal-visibility, /visibility-map, and /visibility-calendar into one
 * page, one code path, one drawing that changes form. See MIGRATION.md's
 * step 5 notes.
 *
 * No PageHeader: DESIGN.md's own mockup for this page opens directly on
 * the sweep selector, and the house rule (§2.1) is "the core object is the
 * largest element on screen and the first thing rendered" - an icon+title
 * header above the instrument would contradict that. A visually-hidden h1
 * still gives screen reader users a landmark.
 *
 * `sweep`/`method` read `?sweep=&method=` once on mount (migration step
 * 9): the redirect stubs replacing /visibility-map and
 * /visibility-calendar need a way to land here on the right tab rather
 * than always defaulting to "Petang ini" - without this, "existing
 * permalinks must not break" (DESIGN.md §4.1) would hold only loosely,
 * landing visitors on a different view than the one they linked to.
 */
const SWEEPS = [
  { key: "petang" as const, label: "Petang ini" },
  { key: "indonesia" as const, label: "Se-Indonesia" },
  { key: "setahun" as const, label: "Setahun" },
];

function isSweepKey(value: string | null): value is "petang" | "indonesia" | "setahun" {
  return value === "petang" || value === "indonesia" || value === "setahun";
}

function isHilalMethod(value: string | null): value is HilalMethod {
  return value === "wujudul_hilal" || value === "mabims_2021" || value === "odeh";
}

export default function HilalPage() {
  const [sweep, setSweep] = useState<"petang" | "indonesia" | "setahun">("petang");
  const [method, setMethod] = useState<HilalMethod>("mabims_2021");

  useEffect(() => {
    const params = readQueryParams();
    const qSweep = params.get("sweep");
    const qMethod = params.get("method");
    if (isSweepKey(qSweep)) setSweep(qSweep);
    if (isHilalMethod(qMethod)) setMethod(qMethod);
  }, []);

  return (
    <div lang="id" className="space-y-6">
      <h1 className="sr-only">Hilal</h1>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Jenis tampilan" className="inline-flex rounded-xl border border-border p-1 text-sm">
          {SWEEPS.map((s) => (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={sweep === s.key}
              onClick={() => setSweep(s.key)}
              className={
                sweep === s.key
                  ? "rounded-lg bg-accent-solid/15 px-3 py-1.5 font-medium text-accent"
                  : "rounded-lg px-3 py-1.5 text-ink-muted transition-colors duration-fast hover:text-ink"
              }
            >
              {s.label}
            </button>
          ))}
        </div>

        {sweep === "setahun" && (
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as HilalMethod)}
            className="h-9 rounded-lg border border-border bg-surface-card px-2 text-sm text-ink"
            aria-label="Metode"
          >
            <option value="mabims_2021">MABIMS 2021</option>
            <option value="wujudul_hilal">Wujudul Hilal</option>
            <option value="odeh">Odeh</option>
          </select>
        )}
      </div>

      {sweep === "petang" && <PetangIni />}
      {sweep === "indonesia" && <SeIndonesia method={method} onMethodChange={setMethod} />}
      {sweep === "setahun" && <Setahun method={method} />}

      <HisabDisclaimer />
    </div>
  );
}
