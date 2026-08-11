"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CalendarRange, Search } from "lucide-react";
import { HisabDisclaimer } from "@/components/HisabDisclaimer";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, inputClasses } from "@/components/ui/Field";
import { LocationPicker } from "@/components/LocationPicker";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { PrintButton } from "@/components/PrintButton";
import { ApiError, fetchHijriYearArchive, HijriYearArchive } from "@/lib/api";
import { DEFAULT_CITY } from "@/lib/locations";
import { readQueryParams, writeQueryParams } from "@/lib/permalink";
import { cn } from "@/lib/cn";
import { ResultAnnouncer } from "@/components/ResultAnnouncer";

// Column order is fixed with MABIMS in the middle because every offset is
// measured against it: putting the baseline between the two comparisons makes
// a row readable left-to-right without a legend.
const METHODS = [
  { key: "wujudul_hilal" as const, label: "Wujudul Hilal" },
  { key: "mabims_2021" as const, label: "MABIMS 2021" },
  { key: "odeh" as const, label: "Odeh" },
];

const CURRENT_HIJRI_YEAR_GUESS = 1447;

function formatOffset(days: number | undefined): string {
  if (days === undefined) return "—";
  if (days === 0) return "same day";
  return days > 0 ? `+${days}d` : `${days}d`;
}

export default function HijriArchivePage() {
  const [year, setYear] = useState(CURRENT_HIJRI_YEAR_GUESS);
  const [lat, setLat] = useState(DEFAULT_CITY.lat);
  const [lon, setLon] = useState(DEFAULT_CITY.lon);
  const [result, setResult] = useState<HijriYearArchive | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  async function compute(y: number, la: number, lo: number) {
    setProgress(0);
    setError(null);
    setResult(null);
    try {
      const r = await fetchHijriYearArchive({
        hijriYear: y,
        lat: la,
        lon: lo,
        onProgress: (done) => setProgress(done),
      });
      setResult(r);
      writeQueryParams({ year: y, lat: la, lon: lo });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The calculation failed unexpectedly.");
    } finally {
      setProgress(null);
    }
  }

  useEffect(() => {
    const params = readQueryParams();
    const qYear = params.get("year");
    const qLat = params.get("lat");
    const qLon = params.get("lon");
    if (qYear && qLat && qLon) {
      setYear(Number(qYear));
      setLat(Number(qLat));
      setLon(Number(qLon));
      compute(Number(qYear), Number(qLat), Number(qLon));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loading = progress !== null;

  return (
    <div className="space-y-6">
      <ResultAnnouncer message={result ? `Year ${result.hijri_year} Hijri ready. ${result.unanimous_months} of 12 months agreed across all three criteria; ${result.diverging_months} decided by the criterion.` : null} />
      <PageHeader
        icon={CalendarRange}
        title="Hijri Year Archive"
        description="How far apart do the three criteria land across a Hijri year, and how much of the calendar does that move? Shows each month's start under every criterion with its offset in days from MABIMS 2021, plus a count of how many months the criterion actually decided. For a plain agree/differ readout, use Method Divergence."
      />

      <Card className="p-5 no-print">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            compute(year, lat, lon);
          }}
          className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <Field label="Hijri year">
            <input
              type="number"
              min={1}
              max={2000}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className={inputClasses}
            />
          </Field>
          <LocationPicker
            lat={lat}
            lon={lon}
            onChange={(newLat, newLon) => {
              setLat(newLat);
              setLon(newLon);
            }}
          />
          <Button type="submit" loading={loading} className="w-full">
            {!loading && <Search className="size-4" />}
            {loading ? `Month ${progress} of 12…` : "Generate year"}
          </Button>
        </form>
        <p className="mt-3 text-2xs text-ink-muted">
          Thirty-six month-start searches, each solving a conjunction and testing candidate
          evenings. It runs entirely in this tab, a month at a time, which is why it reports
          progress rather than freezing.
        </p>
      </Card>

      {error && <ErrorBanner message={error} />}

      {result && (
        <div className="print-area space-y-4">
          {/* The headline number, and the actual answer to "does the criterion
              matter?" for this year - which the per-month table alone leaves
              the reader to count by hand. */}
          <Card className="p-5">
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
              <div>
                <div className="font-mono text-xl font-semibold tabular-nums">
                  {result.unanimous_months} / 12
                </div>
                <div className="text-2xs uppercase tracking-wide text-ink-muted">
                  months all three criteria agree on
                </div>
              </div>
              <div>
                <div className="font-mono text-xl font-semibold tabular-nums text-accent">
                  {result.diverging_months}
                </div>
                <div className="text-2xs uppercase tracking-wide text-ink-muted">
                  months where the criterion decides the date
                </div>
              </div>
            </div>
            <p className="mt-3 text-sm text-ink-muted">
              Offsets are measured against MABIMS 2021, the criterion Kemenag uses. A month marked
              +1d starts a day later under that criterion — and because Hijri months run
              consecutively, that shift carries into every month after it until another divergence
              cancels it.
            </p>
          </Card>

          {/* Same reasoning as ui/Table: a 36rem-minimum table needs a
              keyboard-reachable scroll container, or its right-hand columns are
              unreachable without a pointer. */}
          <Card
            className="overflow-x-auto p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-solid)]"
            tabIndex={0}
            role="region"
            aria-label={`Hijri year ${result.hijri_year} month starts by criterion`}
          >
            <table className="w-full min-w-[36rem] text-left text-sm">
              <caption className="sr-only">
                Hijri year {result.hijri_year}: the Gregorian start date of each month under each of
                the three criteria, with its offset in days from MABIMS 2021.
              </caption>
              <thead>
                <tr className="border-b border-neutral-200 dark:border-night-700/60">
                  <th scope="col" className="whitespace-nowrap px-3 py-2 font-medium text-ink-muted">
                    Month
                  </th>
                  {METHODS.map((m) => (
                    <th
                      key={m.key}
                      scope="col"
                      className="whitespace-nowrap px-3 py-2 font-medium text-ink-muted"
                    >
                      {m.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.months.map((row, i) => (
                  <motion.tr
                    key={row.month}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: i * 0.02 }}
                    className={cn(
                      "border-b border-neutral-200 last:border-0 dark:border-night-700/60",
                      // Divergent rows are the signal; unanimous rows are the
                      // baseline the eye should skim past.
                      !row.unanimous && "bg-gold-500/[0.06]",
                    )}
                  >
                    <th scope="row" className="whitespace-nowrap px-3 py-2 font-normal">
                      <span className="font-medium">{row.month_name}</span>{" "}
                      <span className="text-2xs text-ink-muted">{row.month}</span>
                    </th>
                    {METHODS.map((m) => {
                      const start = row.starts[m.key];
                      const offset = row.offsets[m.key];
                      const err = row.errors[m.key];
                      return (
                        <td key={m.key} className="whitespace-nowrap px-3 py-2">
                          {err ? (
                            <span className="text-verdict-negative">
                              unresolved
                              <span className="mt-0.5 block text-2xs font-normal">{err}</span>
                            </span>
                          ) : (
                            <>
                              <span className="font-mono tabular-nums">{start}</span>
                              {offset !== undefined && offset !== 0 && (
                                <span className="ml-2 font-mono text-2xs font-semibold tabular-nums text-accent">
                                  {formatOffset(offset)}
                                </span>
                              )}
                            </>
                          )}
                        </td>
                      );
                    })}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </Card>

          <HisabDisclaimer />

          <div className="no-print flex flex-wrap gap-3">
            <CopyLinkButton />
            <PrintButton label="Print / Save as PDF" />
          </div>
        </div>
      )}
    </div>
  );
}
