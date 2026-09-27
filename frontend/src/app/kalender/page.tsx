"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { DerivationTrace } from "@/components/DerivationTrace";
import { ErrorBanner } from "@/components/ErrorBanner";
import { HisabDisclaimer } from "@/components/HisabDisclaimer";
import { useObservation } from "@/components/ObservationProvider";
import { useNow } from "@/components/useNow";
import { VerdictIcon } from "@/components/VerdictPill";
import { Table, type TableColumn } from "@/components/ui/Table";
import {
  ApiError,
  convertDate,
  fetchHijriYearArchive,
  fetchIsbatAccuracy,
  type ConvertResult,
  type HijriYearArchive,
  type IsbatAccuracyResult,
  type IsbatComparisonRecord,
} from "@/lib/api";
import { CRITERIA, CRITERIA_ORDER } from "@/lib/criteria";
import { hijriToGregorian, monthStartDate } from "@/lib/falak/converter";
import { addDays, daysBetween, formatPlainDate, parsePlainDate, type PlainDate } from "@/lib/falak/time";
import type { HilalMethod } from "@/lib/falak/visibility";
import { hijriDaysFor } from "@/lib/hijriCalendar";
import { HIJRI_MONTHS_ID, hijriMonthArabic, hijriMonthName, ISLAMIC_DAYS, toArabicDigits } from "@/lib/hijriNames";
import { formatLongDate, todayIsoIn } from "@/lib/localDate";
import { monthOutlook } from "@/lib/monthOutlook";
import { cn } from "@/lib/cn";

const MONTHS_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const WEEKDAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function iso(d: PlainDate): string {
  return formatPlainDate(d);
}

/**
 * /kalender (DESIGN.md v2 §6): an actual calendar. A month grid with the
 * Gregorian and Hijri day in every cell, day 1 of each Hijri month marked, and
 * - where another criterion starts the month on a different day - that day
 * hatched in the same grid. Beside it: the selected day, two-way conversion
 * and the Islamic days of the year; below it: the year at a glance, the month
 * x criterion table and the comparison with sidang isbat.
 *
 * Every Hijri date is MABIMS 2021 for the place in the header, the criterion
 * Kemenag uses; the others are shown where they differ, never silently.
 */
export default function KalenderPage() {
  const { lat, lon, dateIso, setDate, timeZone } = useObservation();
  const now = useNow(60_000);
  const today = now === null ? null : todayIsoIn(timeZone);
  const selected = parsePlainDate(dateIso);
  const [cursor, setCursor] = useState({ year: selected.year, month: selected.month });
  useEffect(() => {
    const d = parsePlainDate(dateIso);
    setCursor((c) => (c.year === d.year && c.month === d.month ? c : { year: d.year, month: d.month }));
  }, [dateIso]);

  const first: PlainDate = { year: cursor.year, month: cursor.month, day: 1 };
  const daysInMonth = new Date(Date.UTC(cursor.year, cursor.month, 0)).getUTCDate();
  const leading = new Date(Date.UTC(cursor.year, cursor.month - 1, 1)).getUTCDay();

  const grid = useMemo(() => {
    const hijri = hijriDaysFor(first, daysInMonth, lat, lon);
    if (!hijri) return null;
    // Other criteria's day 1 for the Hijri months that touch this grid.
    const months = new Map<string, [number, number]>();
    for (const h of hijri) months.set(`${h.year}-${h.month}`, [h.year, h.month]);
    const last = hijri[hijri.length - 1];
    const [ny, nm] = last.month === 12 ? [last.year + 1, 1] : [last.year, last.month + 1];
    months.set(`${ny}-${nm}`, [ny, nm]);
    const alt = new Map<string, Array<{ method: HilalMethod; month: number }>>();
    for (const [y, m] of Array.from(months.values())) {
      const o = monthOutlook(y, m, lat, lon);
      for (const method of CRITERIA_ORDER) {
        const start = o.starts[method];
        if (method === "mabims_2021" || !start || !o.starts.mabims_2021) continue;
        if (daysBetween(o.starts.mabims_2021, start) === 0) continue;
        const key = iso(start);
        alt.set(key, [...(alt.get(key) ?? []), { method, month: m }]);
      }
    }
    return { hijri, alt };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor.year, cursor.month, lat, lon]);

  const selectedHijri = useMemo(() => hijriDaysFor(selected, 1, lat, lon)?.[0] ?? null, [dateIso, lat, lon]); // eslint-disable-line react-hooks/exhaustive-deps
  const hijriYear = selectedHijri?.year ?? null;

  const holidays = useMemo(() => {
    if (hijriYear === null) return [];
    return ISLAMIC_DAYS.map((d) => {
      try {
        return { ...d, date: hijriToGregorian(hijriYear, d.month, d.day, lat, lon) };
      } catch {
        return { ...d, date: null };
      }
    });
  }, [hijriYear, lat, lon]);

  const holidayByIso = useMemo(() => {
    const map = new Map<string, string>();
    if (!grid) return map;
    grid.hijri.forEach((h, i) => {
      const hit = ISLAMIC_DAYS.find((d) => d.month === h.month && d.day === h.day);
      if (hit) map.set(iso(addDays(first, i)), hit.name);
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid]);

  const shift = (delta: number) =>
    setCursor(({ year, month }) => {
      const m = month + delta;
      return m < 1 ? { year: year - 1, month: 12 } : m > 12 ? { year: year + 1, month: 1 } : { year, month: m };
    });

  const hijriSpan = grid
    ? Array.from(new Set(grid.hijri.map((h) => `${hijriMonthName(h.month)} ${h.year}`))).join(" – ")
    : "";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-2xs font-bold uppercase tracking-[0.14em] text-accent">Kalender Hijriah</p>
          <h1 className="mt-1 text-[1.9rem] font-extrabold leading-tight tracking-tight sm:text-4xl">
            {MONTHS_ID[cursor.month - 1]} {cursor.year}
          </h1>
          <p className="text-ink-muted">{hijriSpan} H</p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => shift(-1)} className="flex size-10 items-center justify-center rounded-full border border-border bg-surface-card hover:bg-surface-raised" aria-label="Bulan sebelumnya">
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          {today && (
            <button
              type="button"
              onClick={() => setDate(today)}
              className="h-10 rounded-full border border-border bg-surface-card px-4 text-sm font-semibold hover:bg-surface-raised"
            >
              Hari ini
            </button>
          )}
          <button type="button" onClick={() => shift(1)} className="flex size-10 items-center justify-center rounded-full border border-border bg-surface-card hover:bg-surface-raised" aria-label="Bulan berikutnya">
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <section className="card self-start p-3 sm:p-5" aria-label={`Kalender ${MONTHS_ID[cursor.month - 1]} ${cursor.year}`}>
          {grid === null ? (
            <ErrorBanner message="Tanggal Hijriah bulan ini tidak bisa dihitung (di luar rentang efemeris 1900–2100)." />
          ) : (
            <>
              <div role="grid" className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {WEEKDAYS.map((w, i) => (
                  <div key={w} role="columnheader" className={cn("pb-1 text-center text-2xs font-bold uppercase tracking-wider", i === 5 ? "text-accent" : "text-ink-muted")}>
                    {w}
                  </div>
                ))}
                {Array.from({ length: leading }, (_, i) => (
                  <div key={`e${i}`} />
                ))}
                {grid.hijri.map((h, i) => {
                  const date = addDays(first, i);
                  const key = iso(date);
                  const isFirst = h.day === 1;
                  const alt = grid.alt.get(key);
                  const holiday = holidayByIso.get(key);
                  const isSelected = key === dateIso;
                  const isToday = key === today;
                  const friday = (leading + i) % 7 === 5;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="gridcell"
                      aria-selected={isSelected}
                      aria-label={`${formatLongDate(key)}, ${h.day} ${hijriMonthName(h.month)} ${h.year} H${holiday ? `, ${holiday}` : ""}${alt ? `, awal bulan menurut ${alt.map((a) => CRITERIA[a.method].name).join(" dan ")}` : ""}`}
                      onClick={() => setDate(key)}
                      className={cn(
                        "relative flex min-h-[3.6rem] min-w-0 flex-col justify-between overflow-hidden rounded-control p-1.5 text-left transition-colors duration-fast sm:min-h-[5rem] sm:p-2",
                        isFirst ? "bg-ink text-surface-page" : "bg-surface-raised/60 hover:bg-surface-raised",
                        alt && !isFirst && "bg-[repeating-linear-gradient(135deg,transparent_0_5px,rgb(86_69_192/0.16)_5px_10px)]",
                        isSelected && "ring-2 ring-accent-solid",
                        isToday && !isSelected && "ring-2 ring-accent-solid/40",
                      )}
                    >
                      <span className={cn("text-base font-extrabold tabular-nums sm:text-lg", friday && !isFirst && "text-accent")}>{date.day}</span>
                      <span className={cn("max-w-full self-end text-right text-[10px] leading-tight tabular-nums sm:text-2xs", isFirst ? "font-bold text-verdict-lit" : "text-ink-muted")}>
                        {isFirst ? (
                          <>
                            1<span className="hidden truncate xl:block">{hijriMonthName(h.month)}</span>
                          </>
                        ) : (
                          h.day
                        )}
                        {alt && !isFirst && <span className="block font-semibold text-verdict-margin">{alt.map((a) => CRITERIA[a.method].name.split(" ")[0]).join("/")}: 1</span>}
                      </span>
                      {holiday && <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-accent-solid" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-muted">
                <span className="flex items-center gap-1.5">
                  <span className="size-3 rounded bg-ink" /> 1 bulan Hijriah (MABIMS 2021)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-3 rounded bg-[repeating-linear-gradient(135deg,transparent_0_2px,rgb(86_69_192/0.5)_2px_4px)] ring-1 ring-verdict-margin/40" /> kriteria lain memulai bulan di hari ini
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-accent-solid" /> hari besar Islam
                </span>
              </div>
            </>
          )}
        </section>

        <div className="space-y-5">
          <SelectedDay dateIso={dateIso} hijri={selectedHijri} holiday={holidayByIso.get(dateIso) ?? null} lat={lat} lon={lon} />
          <HijriToGregorian lat={lat} lon={lon} defaultYear={hijriYear} onGo={(d) => setDate(d)} />
          <section className="card overflow-hidden" aria-label="Hari besar Islam">
            <h2 className="border-b border-border px-5 py-3.5 text-sm font-bold">Hari besar {hijriYear ?? ""} H</h2>
            <ul>
              {holidays.map((h) => (
                <li key={h.name}>
                  <button
                    type="button"
                    disabled={!h.date}
                    onClick={() => h.date && setDate(iso(h.date))}
                    className="flex w-full items-center gap-3 border-b border-border px-5 py-2.5 text-left last:border-b-0 hover:bg-surface-raised"
                  >
                    <span className="w-12 shrink-0 rounded-control bg-surface-raised py-1 text-center leading-tight">
                      <span className="block text-md font-extrabold tabular-nums">{h.date ? h.date.day : "—"}</span>
                      <span className="block text-[10px] font-bold uppercase text-ink-muted">{h.date ? MONTHS_ID[h.date.month - 1].slice(0, 3) : ""}</span>
                    </span>
                    <span className="min-w-0">
                      <span className={cn("block text-sm", h.major ? "font-bold" : "font-semibold")}>{h.name}</span>
                      <span className="block text-xs text-ink-muted">
                        {h.day} {hijriMonthName(h.month)} · {h.date ? formatLongDate(iso(h.date), { day: undefined, month: undefined, year: undefined }) : "tidak terhitung"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <HisabDisclaimer />

      {hijriYear !== null && <YearSection hijriYear={hijriYear} lat={lat} lon={lon} />}
    </div>
  );
}

function SelectedDay({
  dateIso,
  hijri,
  holiday,
  lat,
  lon,
}: {
  dateIso: string;
  hijri: { year: number; month: number; day: number } | null;
  holiday: string | null;
  lat: number;
  lon: number;
}) {
  const [conversion, setConversion] = useState<ConvertResult | null>(null);
  useEffect(() => {
    let cancelled = false;
    convertDate({ direction: "gregorian_to_hijri", date: dateIso, lat, lon })
      .then((r) => !cancelled && setConversion(r))
      .catch(() => !cancelled && setConversion(null));
    return () => {
      cancelled = true;
    };
  }, [dateIso, lat, lon]);

  return (
    <section className="card p-5" aria-label="Tanggal terpilih">
      <p className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-muted">{formatLongDate(dateIso)}</p>
      {hijri ? (
        <>
          <p className="mt-1 font-display text-3xl leading-tight">
            {hijri.day} {hijriMonthName(hijri.month)} <span className="whitespace-nowrap">{hijri.year} H</span>
          </p>
          <p lang="ar" dir="rtl" className="font-arab text-xl text-moon">
            {toArabicDigits(hijri.day)} {hijriMonthArabic(hijri.month)} {toArabicDigits(hijri.year)}
          </p>
          {holiday && <p className="mt-2 inline-block rounded-full bg-accent-solid/15 px-3 py-1 text-sm font-bold text-accent">{holiday}</p>}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
            <Link href="/salat" className="inline-flex items-center gap-1 text-accent hover:underline">
              Jadwal salat hari itu <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
            <Link href={`/awal-bulan?bulan=${hijri.year}-${hijri.month}`} className="inline-flex items-center gap-1 text-accent hover:underline">
              Awal {hijriMonthName(hijri.month)} <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
          {conversion?.derivation && (
            <details className="mt-3 border-t border-border pt-3 text-sm">
              <summary className="cursor-pointer font-semibold text-ink-muted">Bagaimana tanggal ini dihitung</summary>
              <DerivationTrace derivation={conversion.derivation} />
            </details>
          )}
        </>
      ) : (
        <p className="mt-2 text-ink-muted">Tanggal ini di luar rentang efemeris (1900–2100).</p>
      )}
    </section>
  );
}

function HijriToGregorian({ lat, lon, defaultYear, onGo }: { lat: number; lon: number; defaultYear: number | null; onGo: (dateIso: string) => void }) {
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState(9);
  const [day, setDay] = useState(1);
  const y = year ?? defaultYear ?? 1448;

  let result: { date: PlainDate } | { error: string };
  try {
    if (day < 1 || day > 30) throw new Error("hari 1–30");
    const date = hijriToGregorian(y, month, day, lat, lon);
    // A day 30 that is really day 1 of the next month: say so rather than roll silently.
    const nextStart = monthStartDate(month === 12 ? y + 1 : y, month === 12 ? 1 : month + 1, lat, lon);
    if (daysBetween(nextStart, date) >= 0) throw new Error(`${hijriMonthName(month)} ${y} hanya 29 hari`);
    result = { date };
  } catch (error) {
    result = { error: error instanceof Error ? error.message : String(error) };
  }

  return (
    <section className="card p-5" aria-label="Konversi Hijriah ke Masehi">
      <h2 className="text-sm font-bold">Hijriah → Masehi</h2>
      <p className="text-xs text-ink-muted">Masehi → Hijriah: ketuk tanggal mana pun di kalender.</p>
      <div className="mt-3 grid grid-cols-[4.5rem_1fr_5.5rem] gap-2">
        <input type="number" min={1} max={30} value={day} onChange={(e) => setDay(Number(e.target.value))} aria-label="Tanggal Hijriah" className="h-10 rounded-control border border-border bg-surface-page px-3 text-sm" />
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} aria-label="Bulan Hijriah" className="h-10 rounded-control border border-border bg-surface-page px-2 text-sm">
          {HIJRI_MONTHS_ID.map((n, i) => (
            <option key={n} value={i + 1}>
              {n}
            </option>
          ))}
        </select>
        <input type="number" min={1320} max={1520} value={y} onChange={(e) => setYear(Number(e.target.value))} aria-label="Tahun Hijriah" className="h-10 rounded-control border border-border bg-surface-page px-3 text-sm" />
      </div>
      {"date" in result ? (
        <button type="button" onClick={() => onGo(formatPlainDate(result.date))} className="mt-3 flex w-full items-center justify-between rounded-control bg-accent-solid/10 px-3 py-2.5 text-left hover:bg-accent-solid/15">
          <span className="font-bold">{formatLongDate(formatPlainDate(result.date))}</span>
          <span className="text-xs font-semibold text-accent">lihat di kalender</span>
        </button>
      ) : (
        <p className="mt-3 text-sm text-verdict-dark">Tidak bisa dikonversi: {result.error}.</p>
      )}
    </section>
  );
}

function MatchCell({ record, method }: { record: IsbatComparisonRecord; method: HilalMethod }) {
  const predicted = record.predicted[method];
  const match = record.matches[method];
  if (predicted === undefined) return <span className="text-ink-muted">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <VerdictIcon tone={match ? "lit" : "dark"} className={match ? "text-verdict-lit" : "text-verdict-dark"} />
      <span className="tabular-nums">{formatLongDate(predicted, { weekday: undefined, month: "short" })}</span>
    </span>
  );
}

function YearSection({ hijriYear, lat, lon }: { hijriYear: number; lat: number; lon: number }) {
  const [archive, setArchive] = useState<HijriYearArchive | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isbat, setIsbat] = useState<IsbatAccuracyResult | null>(null);
  const [nextYearStart, setNextYearStart] = useState<PlainDate | null>(null);

  useEffect(() => {
    let cancelled = false;
    setProgress(0);
    setError(null);
    fetchHijriYearArchive({ hijriYear, lat, lon, onProgress: (d) => !cancelled && setProgress(d) })
      .then((r) => !cancelled && setArchive(r))
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : String(err)))
      .finally(() => !cancelled && setProgress(null));
    fetchIsbatAccuracy({ hijri_year: hijriYear }).then((r) => !cancelled && setIsbat(r));
    try {
      setNextYearStart(monthStartDate(hijriYear + 1, 1, lat, lon));
    } catch {
      setNextYearStart(null);
    }
    return () => {
      cancelled = true;
    };
  }, [hijriYear, lat, lon]);

  const months = archive?.months ?? [];

  return (
    <div className="space-y-5">
      <section className="card p-5" aria-label={`Tahun ${hijriYear} H sekilas`}>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-md font-bold">Tahun {hijriYear} H sekilas</h2>
            <p className="text-sm text-ink-muted">
              {archive ? `Ketiga kriteria sepakat pada ${archive.unanimous_months} dari 12 awal bulan.` : "Menghitung…"} Ketuk bulan untuk melihat langit petang penentunya.
            </p>
          </div>
          {progress !== null && <span className="text-xs text-ink-muted">bulan {progress} dari 12…</span>}
        </div>
        {error && <ErrorBanner message={`Tahun ${hijriYear} H tidak bisa dihitung.`} detail={error} />}
        <ol className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {months.map((m, i) => {
            const start = m.starts.mabims_2021 ? parsePlainDate(m.starts.mabims_2021) : null;
            const nextIso = months[i + 1]?.starts.mabims_2021;
            const next = nextIso ? parsePlainDate(nextIso) : i === 11 ? nextYearStart : null;
            const length = start && next ? daysBetween(start, next) : null;
            const special = m.month === 9 || m.month === 10 || m.month === 12;
            return (
              <li key={m.month}>
                <Link
                  href={`/awal-bulan?bulan=${hijriYear}-${m.month}`}
                  className={cn(
                    "relative flex h-full flex-col justify-between rounded-control border p-2.5 transition-colors hover:border-border-strong",
                    special ? "border-accent-solid/40 bg-accent-solid/10" : "border-border bg-surface-raised/50",
                  )}
                >
                  {!m.unanimous && <span className="absolute -right-1 -top-1 size-3 rounded-full bg-verdict-margin ring-2 ring-surface-card" title="Kriteria berbeda" />}
                  <span className="text-sm font-bold">{HIJRI_MONTHS_ID[m.month - 1]}</span>
                  <span className="mt-2 text-2xs tabular-nums text-ink-muted">
                    {start ? formatLongDate(iso(start), { weekday: undefined, month: "short", year: undefined }) : "—"}
                    {length !== null && <span className="block">{length} hari</span>}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      {archive && (
        <section className="card overflow-hidden" aria-label="Awal bulan per kriteria">
          <h2 className="border-b border-border px-5 py-3.5 text-sm font-bold">Awal bulan per kriteria</h2>
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={`Awal bulan tahun ${hijriYear} H per kriteria`}>
            <table className="w-full min-w-[40rem] text-sm">
              <caption className="sr-only">Tahun {hijriYear} H: tanggal Masehi awal tiap bulan menurut tiga kriteria.</caption>
              <thead className="bg-surface-raised text-2xs uppercase tracking-wider text-ink-muted">
                <tr>
                  <th scope="col" className="px-5 py-2.5 text-left">Bulan</th>
                  {CRITERIA_ORDER.map((k) => (
                    <th key={k} scope="col" className="px-3 py-2.5 text-left">{CRITERIA[k].name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {archive.months.map((row) => (
                  <tr key={row.month} className={cn("border-t border-border/70", !row.unanimous && "bg-verdict-margin/[0.06]")}>
                    <th scope="row" className="px-5 py-2.5 text-left font-bold">{HIJRI_MONTHS_ID[row.month - 1]}</th>
                    {CRITERIA_ORDER.map((k) => {
                      const start = row.starts[k];
                      const offset = row.offsets[k];
                      return (
                        <td key={k} className="whitespace-nowrap px-3 py-2.5 tabular-nums">
                          {row.errors[k] ? (
                            <span className="text-verdict-dark">belum terselesaikan</span>
                          ) : (
                            <>
                              {start ? formatLongDate(start, { weekday: "short", month: "short" }) : "—"}
                              {offset !== undefined && offset !== 0 && (
                                <span className="ml-1.5 rounded bg-verdict-margin/15 px-1.5 py-0.5 text-2xs font-bold text-verdict-margin">
                                  {offset > 0 ? `+${offset}` : offset} hari
                                </span>
                              )}
                            </>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {isbat && isbat.records.length > 0 && (
        <section className="card overflow-hidden" aria-label="Dibandingkan dengan sidang isbat">
          <div className="border-b border-border px-5 py-3.5">
            <h2 className="text-sm font-bold">Dibandingkan dengan sidang isbat</h2>
            <p className="text-xs text-ink-muted">Keputusan resmi Kemenag dibandingkan dengan tanggal tiap kriteria, dihitung untuk Jakarta.</p>
          </div>
          <div className="px-2 py-2">
            <Table
              columns={
                [
                  { key: "month", header: "Bulan", render: (r) => `${hijriMonthName(r.hijri_month)} ${r.hijri_year}` },
                  { key: "actual", header: "Sidang isbat", render: (r) => formatLongDate(r.actual_start_date, { weekday: "short", month: "short" }) },
                  ...CRITERIA_ORDER.map(
                    (key): TableColumn<IsbatComparisonRecord> => ({
                      key,
                      header: CRITERIA[key].name,
                      render: (r) => <MatchCell record={r} method={key} />,
                    }),
                  ),
                ] as TableColumn<IsbatComparisonRecord>[]
              }
              rows={isbat.records}
              caption="Tanggal sidang isbat dibandingkan dengan tanggal tiap kriteria hisab, dihitung untuk Jakarta."
              rowKey={(r) => `${r.hijri_year}-${r.hijri_month}`}
            />
          </div>
        </section>
      )}
    </div>
  );
}
