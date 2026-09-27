"use client";

import { useEffect, useState } from "react";
import { ErrorBanner } from "@/components/ErrorBanner";
import { HorizonInstrument } from "@/components/HorizonInstrument";
import { VerdictIcon } from "@/components/VerdictPill";
import { ApiError, fetchVisibilityCalendar, type HilalMethod, type VisibilityCalendarMonth, type VisibilityCalendarResult } from "@/lib/api";
import { CRITERIA, verdictText, verdictTone } from "@/lib/criteria";
import { hijriMonthName } from "@/lib/hijriNames";
import { formatLongDate } from "@/lib/localDate";
import { horizonReadingFromObservation, type InstrumentViewport } from "@/lib/instrumentGeometry";
import { cn } from "@/lib/cn";

const MINI: InstrumentViewport = { width: 240, height: 130 };

type Resolved = VisibilityCalendarMonth &
  Required<Pick<VisibilityCalendarMonth, "moon_altitude_deg" | "sun_altitude_deg" | "elongation_deg" | "illumination_fraction">>;

function resolved(m: VisibilityCalendarMonth): m is Resolved {
  return m.error === undefined && m.moon_altitude_deg !== undefined && m.sun_altitude_deg !== undefined && m.elongation_deg !== undefined && m.illumination_fraction !== undefined;
}

/**
 * Setahun (DESIGN.md v2 §6): one place, twelve deciding evenings - each month's
 * first sunset after its ijtimak - as twelve small skies. Months whose evening
 * does not meet the criterion (so the month needs one more evening) stand out
 * at a glance. Selecting one opens it as the page's month.
 */
export function Setahun({
  hijriYear,
  method,
  lat,
  lon,
  selectedMonth,
  onSelect,
}: {
  hijriYear: number;
  method: HilalMethod;
  lat: number;
  lon: number;
  selectedMonth: number | null;
  onSelect: (month: number) => void;
}) {
  const [result, setResult] = useState<VisibilityCalendarResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetchVisibilityCalendar({ hijri_year: hijriYear, method, lat, lon })
      .then((r) => !cancelled && setResult(r))
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : String(err)));
    return () => {
      cancelled = true;
    };
  }, [hijriYear, method, lat, lon]);

  if (error) return <ErrorBanner message={`Tahun ${hijriYear} H tidak bisa dihitung.`} detail={error} />;
  if (!result) return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 12 }, (_, i) => <div key={i} className="h-44 animate-pulse rounded-card bg-surface-raised" />)}</div>;

  const metCount = result.months.filter((m) => resolved(m) && m.verdict !== undefined && verdictTone(method, m.verdict) === "lit").length;

  return (
    <div className="space-y-4">
      <p className="font-display text-xl leading-snug">
        Tahun {hijriYear} H: {CRITERIA[method].name} terpenuhi pada {metCount} dari 12 petang penentu. Sisanya perlu satu petang lagi.
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {result.months.map((m) => {
          const ok = resolved(m);
          const tone = ok && m.verdict !== undefined ? verdictTone(method, m.verdict) : "dark";
          const selected = selectedMonth === m.hijri_month;
          return (
            <li key={m.hijri_month}>
              <button
                type="button"
                onClick={() => onSelect(m.hijri_month)}
                aria-pressed={selected}
                className={cn(
                  "block w-full overflow-hidden rounded-card border bg-surface-card text-left transition-all duration-fast hover:-translate-y-0.5 hover:border-border-strong",
                  selected ? "border-accent-solid ring-2 ring-accent-solid/30" : "border-border",
                )}
              >
                {ok ? (
                  <HorizonInstrument reading={horizonReadingFromObservation({ ...m, lag_time_minutes: m.lag_time_minutes ?? null, crescent_width_arcmin: m.crescent_width_arcmin ?? null })} viewport={MINI} mini showReadout={false} />
                ) : (
                  <div className="flex aspect-[240/130] items-center justify-center bg-surface-raised px-3 text-center text-xs text-ink-muted">Belum terselesaikan</div>
                )}
                <div className="space-y-1 px-3 py-2.5">
                  <p className="flex items-center justify-between gap-2">
                    <span className="font-bold">{hijriMonthName(m.hijri_month)}</span>
                    <VerdictIcon tone={tone} className={tone === "lit" ? "text-verdict-lit" : tone === "margin" ? "text-verdict-margin" : "text-verdict-dark"} />
                  </p>
                  <p className="text-2xs text-ink-muted">
                    {m.date ? formatLongDate(m.date, { weekday: undefined, month: "short", year: undefined }) : ""} ·{" "}
                    {ok && m.verdict !== undefined ? verdictText(method, m.verdict) : "—"}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
