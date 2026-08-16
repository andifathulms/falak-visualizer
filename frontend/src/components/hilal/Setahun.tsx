"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { HorizonInstrument } from "@/components/HorizonInstrument";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useObservation } from "@/components/ObservationProvider";
import { ApiError, fetchVisibilityCalendar, type HilalMethod, type VisibilityCalendarMonth, type VisibilityCalendarResult } from "@/lib/api";
import { gregorianToHijri } from "@/lib/falak/converter";
import { parsePlainDate } from "@/lib/falak/time";
import { isVisible } from "@/lib/verdict";
import { verdictLabel } from "@/lib/verdictLabels";
import { horizonReadingFromObservation, type InstrumentViewport } from "@/lib/instrumentGeometry";

/**
 * "Setahun" - one place, twelve evenings (DESIGN.md §4.2/§6). The absorbed
 * replacement for /visibility-calendar: twelve miniature HorizonInstruments
 * instead of twelve cards of numbers, so a reader scans twelve small skies
 * and sees which months are marginal at a glance, per DESIGN.md's explicit
 * instruction that this "replaces /visibility-calendar and is worth
 * building carefully."
 *
 * The Hijri year isn't a separate control: it's derived from the context
 * bar's current date (DESIGN.md §4.3's single source of truth for "when"),
 * so changing the date in the bar moves which year this shows, the same way
 * it moves every other sweep.
 *
 * DESIGN.md §5.1 says "~120px wide" for each mini instrument; used here at
 * 150px for legibility of the altitude/lag numbers at this scale without
 * meaningfully departing from "miniature".
 */
const MINI_VIEWPORT: InstrumentViewport = { width: 150, height: 84 };

function isResolvedMonth(
  month: VisibilityCalendarMonth,
): month is VisibilityCalendarMonth &
  Required<
    Pick<
      VisibilityCalendarMonth,
      "moon_altitude_deg" | "sun_altitude_deg" | "elongation_deg" | "illumination_fraction"
    >
  > {
  return (
    month.error === undefined &&
    month.moon_altitude_deg !== undefined &&
    month.sun_altitude_deg !== undefined &&
    month.elongation_deg !== undefined &&
    month.illumination_fraction !== undefined
  );
}

export function Setahun({ method }: { method: HilalMethod }) {
  const { lat, lon, dateIso } = useObservation();
  const [result, setResult] = useState<VisibilityCalendarResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hijriYear = useMemo(() => {
    try {
      return gregorianToHijri(parsePlainDate(dateIso), lat, lon).year;
    } catch {
      return null;
    }
  }, [dateIso, lat, lon]);

  useEffect(() => {
    if (hijriYear === null) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchVisibilityCalendar({ hijri_year: hijriYear, method, lat, lon })
      .then((r) => {
        if (cancelled) return;
        setResult(r);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Perhitungan gagal.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hijriYear, method, lat, lon]);

  if (hijriYear === null) {
    return <ErrorBanner message="Tanggal di luar rentang efemeris (1900-2100). Pilih tanggal lain." />;
  }

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} />}
      {loading && !result && <p className="text-sm text-ink-muted">Menghitung dua belas bulan…</p>}

      {result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
        >
          {result.months.map((month) => {
            const resolved = isResolvedMonth(month);
            const visible = resolved && month.verdict !== undefined && isVisible(month.verdict);
            return (
              <div
                key={month.hijri_month}
                className={
                  resolved && visible
                    ? "rounded-xl border border-verdict-lit/40 bg-verdict-lit/[0.05] p-2"
                    : "rounded-xl border border-border p-2"
                }
              >
                <div className="mb-1 flex items-center justify-between gap-1 text-xs">
                  <span className="font-medium">{month.hijri_month_name}</span>
                  {resolved && (
                    <span className={visible ? "text-verdict-lit" : "text-ink-muted"}>
                      {verdictLabel(month.verdict)}
                    </span>
                  )}
                </div>
                {resolved ? (
                  <HorizonInstrument
                    reading={horizonReadingFromObservation({
                      ...month,
                      lag_time_minutes: month.lag_time_minutes ?? null,
                      crescent_width_arcmin: month.crescent_width_arcmin ?? null,
                    })}
                    viewport={MINI_VIEWPORT}
                    showReadout={false}
                  />
                ) : (
                  <div className="flex h-[84px] flex-col items-center justify-center gap-1 rounded-lg bg-ink-muted/5 px-2 text-center text-2xs text-ink-muted">
                    <span>Belum terselesaikan</span>
                    {month.error && <span className="line-clamp-2">{month.error}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
