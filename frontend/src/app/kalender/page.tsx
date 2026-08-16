"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Equal, GitCompareArrows } from "lucide-react";
import { BoundaryRibbon } from "@/components/BoundaryRibbon";
import { DerivationTrace } from "@/components/DerivationTrace";
import { HisabDisclaimer } from "@/components/HisabDisclaimer";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Badge } from "@/components/ui/Badge";
import { Table, type TableColumn } from "@/components/ui/Table";
import { useObservation } from "@/components/ObservationProvider";
import {
  ApiError,
  convertDate,
  fetchHijriYearArchive,
  fetchIsbatAccuracy,
  type ConvertResult,
  type HijriYearArchive,
  type HilalMethod,
  type IsbatAccuracyResult,
  type IsbatComparisonRecord,
} from "@/lib/api";
import { boundaryPointsFromArchive } from "@/lib/boundaryRibbonData";
import { cn } from "@/lib/cn";

const METHODS: Array<{ key: HilalMethod; label: string }> = [
  { key: "wujudul_hilal", label: "Wujudul Hilal" },
  { key: "mabims_2021", label: "MABIMS 2021" },
  { key: "odeh", label: "Odeh" },
];

function formatOffset(days: number | undefined): string {
  if (days === undefined) return "—";
  if (days === 0) return "sama";
  return days > 0 ? `+${days}h` : `${days}h`;
}

function MatchCell({ record, method }: { record: IsbatComparisonRecord; method: HilalMethod }) {
  const predicted = record.predicted[method];
  const match = record.matches[method];
  if (predicted === undefined) {
    return <span className="text-ink-muted">belum terselesaikan</span>;
  }
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs">{predicted}</span>
      <Badge tone={match ? "positive" : "negative"}>{match ? "Cocok" : "Berbeda"}</Badge>
    </div>
  );
}

/**
 * /kalender - "what date is it, and why?" (DESIGN.md §4.1/§6). Absorbs
 * /converter, /hijri-archive, /isbat-accuracy: BoundaryRibbon at the top,
 * then the conversion result, the month x method table (kept, per DESIGN.md
 * §5.2 - "do not delete it"), the isbat comparison, DerivationTrace in a
 * disclosure.
 *
 * No separate date form: the "conversion control" DESIGN.md asks for is the
 * context bar's own date input (§4.3), already global. Typing a date there
 * changes `hijri` (migration step 4's ObservationProvider), which both
 * updates the conversion line below and highlights BoundaryRibbon's
 * matching month - "typing a date scrolls the ribbon and marks it" (§6),
 * achieved by one shared piece of state, not a second input.
 *
 * The year-wide archive (36 month-start searches) keeps the old page's
 * progress readout rather than gaining Se-Indonesia's explicit trigger:
 * unlike the Indonesia sweep, it needs no Web Worker, and each of its
 * component sweeps (12 single-evening reads) already proved auto-compute
 * was fine for a lighter version of this same shape in /hilal's Setahun
 * (migration step 5). This resolves the open question MIGRATION.md flagged
 * about this exact function.
 */
export default function KalenderPage() {
  const { lat, lon, dateIso, hijri } = useObservation();

  const [archive, setArchive] = useState<HijriYearArchive | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [archiveProgress, setArchiveProgress] = useState<number | null>(null);

  const [isbat, setIsbat] = useState<IsbatAccuracyResult | null>(null);

  const [conversion, setConversion] = useState<ConvertResult | null>(null);
  const [conversionError, setConversionError] = useState<string | null>(null);

  const hijriYear = hijri.year;

  useEffect(() => {
    if (hijriYear === undefined) return;
    let cancelled = false;
    setArchiveProgress(0);
    setArchiveError(null);
    fetchHijriYearArchive({ hijriYear, lat, lon, onProgress: (done) => !cancelled && setArchiveProgress(done) })
      .then((r) => {
        if (cancelled) return;
        setArchive(r);
        setArchiveProgress(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setArchiveError(err instanceof ApiError ? err.message : "Perhitungan gagal.");
        setArchiveProgress(null);
      });
    return () => {
      cancelled = true;
    };
  }, [hijriYear, lat, lon]);

  useEffect(() => {
    if (hijriYear === undefined) return;
    let cancelled = false;
    fetchIsbatAccuracy({ hijri_year: hijriYear }).then((r) => {
      if (!cancelled) setIsbat(r);
    });
    return () => {
      cancelled = true;
    };
  }, [hijriYear]);

  useEffect(() => {
    let cancelled = false;
    setConversionError(null);
    convertDate({ direction: "gregorian_to_hijri", date: dateIso, lat, lon })
      .then((r) => {
        if (!cancelled) setConversion(r);
      })
      .catch((err) => {
        if (cancelled) return;
        setConversion(null);
        setConversionError(err instanceof ApiError ? err.message : "Konversi gagal.");
      });
    return () => {
      cancelled = true;
    };
  }, [dateIso, lat, lon]);

  return (
    <div lang="id" className="space-y-6">
      <h1 className="sr-only">Kalender</h1>

      {hijri.error ? (
        <ErrorBanner message="Tanggal di luar rentang efemeris (1900-2100). Pilih tanggal lain." />
      ) : (
        <>
          {archiveError && <ErrorBanner message={archiveError} />}

          {archiveProgress !== null && (
            <p className="text-sm text-ink-muted">Menghitung tahun {hijriYear} H — bulan {archiveProgress} dari 12…</p>
          )}

          {archive && (
            <BoundaryRibbon
              points={boundaryPointsFromArchive(archive, isbat)}
              lat={lat}
              lon={lon}
              highlightMonth={hijri.month}
              className="rounded-2xl border border-border bg-surface-card p-4"
            />
          )}

          {/* The conversion result - the context bar already IS the input
              for this, see the module comment above. */}
          <div>
            {conversionError ? (
              <ErrorBanner message={conversionError} />
            ) : conversion ? (
              <p className="font-display text-xl">
                {conversion.input_date} bertepatan dengan{" "}
                <strong className="text-accent">
                  {conversion.hijri_day} {conversion.hijri_month_name} {conversion.hijri_year} H
                </strong>
              </p>
            ) : null}
            {conversion?.derivation && (
              <details>
                <summary className="mt-2 cursor-pointer list-none text-sm font-medium text-ink-muted underline decoration-dotted underline-offset-2 [&::-webkit-details-marker]:hidden">
                  Lihat penjabaran lengkap
                </summary>
                <DerivationTrace derivation={conversion.derivation} />
              </details>
            )}
          </div>

          {archive && (
            <div
              className="overflow-x-auto rounded-2xl border border-border bg-surface-card p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-solid)]"
              tabIndex={0}
              role="region"
              aria-label={`Awal bulan tahun ${archive.hijri_year} Hijriah per kriteria`}
            >
              <table className="w-full min-w-[36rem] text-left text-sm">
                <caption className="sr-only">
                  Tahun {archive.hijri_year} Hijriah: tanggal Masehi awal tiap bulan menurut tiga kriteria,
                  dengan selisih harinya dari MABIMS 2021.
                </caption>
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="whitespace-nowrap px-3 py-2 font-medium text-ink-muted">Bulan</th>
                    {METHODS.map((m) => (
                      <th key={m.key} scope="col" className="whitespace-nowrap px-3 py-2 font-medium text-ink-muted">
                        {m.label}
                      </th>
                    ))}
                    <th scope="col" className="whitespace-nowrap px-3 py-2 font-medium text-ink-muted">Kriteria</th>
                  </tr>
                </thead>
                <tbody>
                  {archive.months.map((row, i) => (
                    <motion.tr
                      key={row.month}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: i * 0.02 }}
                      className={cn("border-b border-border/60 last:border-0", !row.unanimous && "bg-accent-solid/[0.06]")}
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
                              <span className="text-verdict-dark">
                                belum terselesaikan
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
                      <td className="whitespace-nowrap px-3 py-2">
                        {Object.keys(row.errors).length > 0 ? (
                          <Badge tone="indeterminate">Belum selesai</Badge>
                        ) : row.unanimous ? (
                          <Badge tone="neutral" icon={Equal}>Sepakat</Badge>
                        ) : (
                          <Badge tone="neutral" icon={GitCompareArrows}>Berbeda</Badge>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {isbat && isbat.records.length > 0 && (
            <div className="rounded-2xl border border-border bg-surface-card p-5">
              <h2 className="mb-3 text-md font-semibold">Dibandingkan dengan sidang isbat</h2>
              <Table
                columns={
                  [
                    { key: "month", header: "Bulan", render: (r) => `${r.hijri_month_name} ${r.hijri_year}H` },
                    { key: "actual", header: "Sidang isbat", render: (r) => r.actual_start_date },
                    ...METHODS.map(
                      ({ key, label }): TableColumn<IsbatComparisonRecord> => ({
                        key,
                        header: label,
                        render: (r) => <MatchCell record={r} method={key} />,
                      }),
                    ),
                  ] as TableColumn<IsbatComparisonRecord>[]
                }
                rows={isbat.records}
                caption="Tanggal sidang isbat dibandingkan dengan prediksi tiap kriteria hisab, dihitung untuk Jakarta."
                rowKey={(r) => `${r.hijri_year}-${r.hijri_month}`}
              />
            </div>
          )}

          <HisabDisclaimer />
        </>
      )}
    </div>
  );
}
