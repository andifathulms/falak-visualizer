"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Search } from "lucide-react";
import { HisabDisclaimer } from "@/components/HisabDisclaimer";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PageHeader } from "@/components/PageHeader";
import { LocationPicker } from "@/components/LocationPicker";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, inputClasses } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { ApiError, fetchVisibilityCalendar, HilalMethod, VisibilityCalendarResult } from "@/lib/api";
import { DEFAULT_CITY } from "@/lib/locations";
import { isVisible } from "@/lib/verdict";
import { verdictLabel } from "@/lib/verdictLabels";
import { ResultAnnouncer } from "@/components/ResultAnnouncer";
import { ROUTES } from "@/lib/routes";
import { readQueryParams, writeQueryParams } from "@/lib/permalink";

const METHOD_OPTIONS = [
  { value: "mabims_2021", label: "MABIMS 2021" },
  { value: "wujudul_hilal", label: "Wujudul Hilal" },
  { value: "odeh", label: "Odeh" },
];

export default function VisibilityCalendarPage() {
  const [hijriYear, setHijriYear] = useState(1446);
  const [method, setMethod] = useState<HilalMethod>("mabims_2021");
  const [lat, setLat] = useState(DEFAULT_CITY.lat);
  const [lon, setLon] = useState(DEFAULT_CITY.lon);
  const [result, setResult] = useState<VisibilityCalendarResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = readQueryParams();
    const qYear = params.get("hijri_year");
    if (!qYear) return;
    const y = Number(qYear);
    const m = (params.get("method") as HilalMethod | null) ?? method;
    const la = Number(params.get("lat") ?? lat);
    const lo = Number(params.get("lon") ?? lon);
    setHijriYear(y);
    setMethod(m);
    setLat(la);
    setLon(lo);
    compute(y, m, la, lo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await compute(hijriYear, method, lat, lon);
  }

  async function compute(y: number, m: HilalMethod, la: number, lo: number) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetchVisibilityCalendar({ hijri_year: y, method: m, lat: la, lon: lo });
      setResult(r);
      writeQueryParams({ hijri_year: y, method: m, lat: la, lon: lo });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The calculation failed unexpectedly.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <ResultAnnouncer message={result ? `Calendar ready for ${result.hijri_year} Hijri, ${result.months.length} months.` : null} />
      <PageHeader
        icon={CalendarDays}
        title={ROUTES["visibility-calendar"].title}
        description={ROUTES["visibility-calendar"].description}
      />

      <HisabDisclaimer />

      <Card className="p-5">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-4">
          <Field label="Hijri year">
            <input
              type="number"
              value={hijriYear}
              onChange={(e) => setHijriYear(Number(e.target.value))}
              className={inputClasses}
            />
          </Field>
          <Select
            label="Method"
            value={method}
            onChange={(v) => setMethod(v as HilalMethod)}
            options={METHOD_OPTIONS}
          />
          <LocationPicker lat={lat} lon={lon} onChange={(newLat, newLon) => { setLat(newLat); setLon(newLon); }} />
          <Button type="submit" loading={loading} className="w-full">
            {!loading && <Search className="size-4" />}
            {loading ? "Loading…" : "Load calendar"}
          </Button>
        </form>
      </Card>

      {error && <ErrorBanner message={error} />}

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
        >
          {result.months.map((month) => {
            const visible = month.verdict !== undefined && isVisible(month.verdict);
            return (
              <Card
                key={month.hijri_month}
                className={`p-4 ${
                  month.error
                    ? "border border-dashed border-neutral-300 dark:border-night-600/50"
                    : visible
                      ? "border border-moon-500/40 bg-moon-500/[0.07]"
                      : "border border-neutral-200 dark:border-night-700/60"
                }`}
              >
                <div className="text-sm font-medium">{month.hijri_month_name}</div>
                {month.error ? (
                  <>
                    <p className="mt-1 text-xs text-ink-muted">unresolved</p>
                    {/* The reason was a title attribute, which is unreachable by
                        keyboard, unreliable in screen readers and invisible on
                        touch. It is short - render it. */}
                    <p className="mt-1 text-2xs text-ink-muted">{month.error}</p>
                  </>
                ) : (
                  <>
                    <p className="mt-1 text-xs text-ink-muted">{month.date}</p>
                    <p
                      className={`mt-2 text-xs font-medium ${
                        visible ? "text-verdict-positive" : "text-ink-muted"
                      }`}
                    >
                      {verdictLabel(month.verdict)}
                    </p>
                    {/* The numbers behind the verdict. These were the whole
                        content of a title attribute, which meant this app's
                        "every verdict must be inspectable" rule was being met
                        only for users with a mouse. */}
                    <dl className="mt-2 space-y-0.5 border-t border-neutral-200 pt-2 text-2xs text-ink-muted dark:border-night-700/60">
                      <div className="flex justify-between gap-2">
                        <dt>Altitude</dt>
                        <dd className="font-mono tabular-nums">
                          {month.moon_altitude_deg?.toFixed(2) ?? "—"}°
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt>Elongation</dt>
                        <dd className="font-mono tabular-nums">
                          {month.elongation_deg?.toFixed(2) ?? "—"}°
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt>Lag</dt>
                        <dd className="font-mono tabular-nums">
                          {month.lag_time_minutes?.toFixed(1) ?? "—"} min
                        </dd>
                      </div>
                    </dl>
                  </>
                )}
              </Card>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
