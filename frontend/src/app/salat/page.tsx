"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayArc } from "@/components/DayArc";
import { DateStepper } from "@/components/DateStepper";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PrintButton } from "@/components/PrintButton";
import { Select } from "@/components/ui/Select";
import { useObservation } from "@/components/ObservationProvider";
import { useNow } from "@/components/useNow";
import { CONVENTION_OPTIONS, ConventionNote, DEFAULT_CONVENTION } from "@/components/ConventionNote";
import { buildDayArcInput } from "@/lib/dayArcData";
import type { DayArcInput } from "@/lib/dayArcGeometry";
import { gregorianToHijri, monthStartDate } from "@/lib/falak/converter";
import { CONVENTIONS, dailyPrayerTimes, type DailyPrayerTimes } from "@/lib/falak/prayerTimes";
import { qiblaDirection } from "@/lib/falak/qibla";
import { addDays, daysBetween, MINUTE_US, parsePlainDate, type PlainDate } from "@/lib/falak/time";
import { hijriMonthName } from "@/lib/hijriNames";
import { formatClock, formatLongDate, todayIsoIn, zoneAbbreviation } from "@/lib/localDate";
import { formatCountdown, nextPrayer, PRAYER_LABEL, PRAYER_ORDER } from "@/lib/prayerSchedule";
import { readQueryParams } from "@/lib/permalink";
import { cn } from "@/lib/cn";

/** Kemenag's imsak: a fixed precaution before Subuh, not an astronomical moment. */
const IMSAK_MINUTES = 10;

const MONTHS_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function fmtDeg(value: number): string {
  return `${value.toFixed(value % 1 === 0 ? 0 : 2).replace(".", ",")}°`;
}

/** Hijri labels for a run of consecutive days: one conversion, then roll over at each month start. */
function hijriLabels(first: PlainDate, count: number, lat: number, lon: number): string[] {
  try {
    const h = gregorianToHijri(first, lat, lon);
    let [y, m, d] = [h.year, h.month, h.day];
    let next = monthStartDate(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, lat, lon);
    const out: string[] = [];
    for (let i = 0; i < count; i += 1) {
      const day = addDays(first, i);
      if (daysBetween(next, day) >= 0) {
        [y, m, d] = m === 12 ? [y + 1, 1, 1] : [y, m + 1, 1];
        next = monthStartDate(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, lat, lon);
      } else if (i > 0) {
        d += 1;
      }
      out.push(`${d} ${hijriMonthName(m)}`);
    }
    return out;
  } catch {
    return Array.from({ length: count }, () => "—");
  }
}

/**
 * /salat (DESIGN.md v2 §6): one day's prayer times with the Sun's path behind
 * them and the angle that defines each time, and the month as a printable
 * jadwal imsakiyah. Everything recomputes for the place in the header and the
 * day in the stepper; there is nothing to submit.
 */
export default function SalatPage() {
  const { lat, lon, dateIso, timeZone, setDate, matchedCity } = useObservation();
  const [convention, setConvention] = useState(DEFAULT_CONVENTION);
  const now = useNow(30_000);
  const zone = zoneAbbreviation(timeZone);

  // Old /prayer-times links carry ?convention= (redirect stub).
  useEffect(() => {
    const q = readQueryParams().get("convention");
    if (q && CONVENTION_OPTIONS.some((o) => o.value === q)) setConvention(q);
  }, []);

  const conventionDef = CONVENTIONS[convention] ?? CONVENTIONS[DEFAULT_CONVENTION];

  const day = useMemo(() => {
    try {
      const date = parsePlainDate(dateIso);
      const input: DayArcInput = buildDayArcInput(date, lat, lon, conventionDef, qiblaDirection(lat, lon).bearingDeg);
      const times = dailyPrayerTimes(date, lat, lon, conventionDef);
      const tomorrow = dailyPrayerTimes(addDays(date, 1), lat, lon, conventionDef);
      return { input, times, tomorrow, error: null as string | null };
    } catch (error) {
      return { input: null, times: null, tomorrow: null, error: error instanceof Error ? error.message : String(error) };
    }
  }, [dateIso, lat, lon, conventionDef]);

  const isToday = now !== null && dateIso === todayIsoIn(timeZone);
  const next = isToday && day.times && now !== null ? nextPrayer(day.times, day.tomorrow, now) : null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-2xs font-bold uppercase tracking-[0.14em] text-accent">Jadwal salat</p>
          <h1 className="mt-1 text-[1.9rem] font-extrabold leading-tight tracking-tight sm:text-4xl">
            {matchedCity?.name ?? "Lokasi Anda"}
          </h1>
        </div>
        <DateStepper value={dateIso} onChange={setDate} timeZone={timeZone} />
      </header>

      {day.error && (
        <ErrorBanner
          message="Jadwal untuk lokasi dan tanggal ini tidak bisa dihitung dengan andal, jadi tidak ditampilkan. Coba tanggal atau lokasi lain."
          detail={day.error}
        />
      )}

      {day.times && day.input && (
        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <section className="card overflow-hidden" aria-label="Lintasan matahari">
            <div className="flex items-center justify-between gap-3 px-5 pt-4">
              <h2 className="text-sm font-bold">Lintasan matahari</h2>
              <span className="text-xs text-ink-muted">waktu {zone}</span>
            </div>
            <div className="hidden px-2 pb-3 pt-1 sm:block">
              <DayArc input={day.input} timeZone={timeZone} now={isToday ? now : null} viewport={{ width: 640, archHeight: 420 }} />
            </div>
            <div className="px-1 pb-3 pt-1 sm:hidden">
              <DayArc input={day.input} timeZone={timeZone} now={isToday ? now : null} viewport={{ width: 420, archHeight: 360 }} />
            </div>
          </section>

          <section className="card overflow-hidden" aria-label="Waktu salat">
            {next && now !== null && (
              <div className="flex items-end justify-between gap-3 border-b border-border bg-accent-solid/10 px-5 py-4">
                <div>
                  <p className="text-2xs font-bold uppercase tracking-[0.14em] text-accent">Berikutnya</p>
                  <p className="text-2xl font-extrabold">
                    {PRAYER_LABEL[next.key]}{" "}
                    <span className="tabular-nums text-accent">{formatClock(next.instant, timeZone)}</span>
                  </p>
                </div>
                <p className="whitespace-nowrap text-sm font-bold text-accent" aria-live="polite">
                  {formatCountdown(now, next.instant)} lagi
                </p>
              </div>
            )}
            <ul>
              <li className="flex items-center justify-between border-b border-border px-5 py-2.5 text-sm text-ink-muted">
                <span>
                  Imsak <span className="text-2xs">(Subuh − {IMSAK_MINUTES} mnt)</span>
                </span>
                <span className="tabular-nums">{formatClock(day.times.fajr === null ? null : day.times.fajr - IMSAK_MINUTES * MINUTE_US, timeZone)}</span>
              </li>
              {PRAYER_ORDER.map((key) => {
                const t = day.times![key];
                const plotted = day.input!.prayers.find((p) => p.key === key);
                const isNext = next !== null && !next.tomorrow && next.key === key;
                const past = isToday && now !== null && t !== null && t <= now;
                return (
                  <li
                    key={key}
                    className={cn(
                      "flex items-center justify-between gap-3 border-b border-border px-5 py-3 last:border-b-0",
                      isNext && "bg-accent-solid/10",
                      key === "sunrise" && "text-ink-muted",
                    )}
                  >
                    <span className="min-w-0">
                      <span className={cn("block font-bold", isNext && "text-accent", past && "text-ink-muted")}>{PRAYER_LABEL[key]}</span>
                      {plotted && (
                        <span className="block text-2xs text-ink-muted">
                          {key === "dhuhr"
                            ? `matahari transit + ${conventionDef.dhuhrCorrectionMinutes} mnt`
                            : key === "asr"
                              ? `bayangan = ${conventionDef.asrShadowFactor}× tinggi + bayangan zuhur (matahari ${fmtDeg(plotted.definingAltitudeDeg)})`
                              : `matahari ${fmtDeg(plotted.definingAltitudeDeg)}`}
                        </span>
                      )}
                    </span>
                    <span className={cn("text-xl font-extrabold tabular-nums", isNext && "text-accent", past && "text-ink-muted")}>
                      {formatClock(t, timeZone)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}

      <section className="card space-y-4 p-5" aria-label="Konvensi">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-md font-bold">Konvensi sudut</h2>
            <p className="text-sm text-ink-muted">Hanya Subuh dan Isya yang bergantung pada pilihan ini.</p>
          </div>
          <div className="w-56">
            <Select label="Konvensi" value={convention} onChange={setConvention} options={CONVENTION_OPTIONS} />
          </div>
        </div>
        <ConventionNote convention={convention} />
      </section>

      <MonthTable lat={lat} lon={lon} dateIso={dateIso} timeZone={timeZone} convention={convention} />
    </div>
  );
}

function MonthTable({
  lat,
  lon,
  dateIso,
  timeZone,
  convention,
}: {
  lat: number;
  lon: number;
  dateIso: string;
  timeZone: string | null;
  convention: string;
}) {
  const initial = parsePlainDate(dateIso);
  const [cursor, setCursor] = useState({ year: initial.year, month: initial.month });
  useEffect(() => {
    const d = parsePlainDate(dateIso);
    setCursor({ year: d.year, month: d.month });
  }, [dateIso]);

  const rows = useMemo(() => {
    try {
      const conv = CONVENTIONS[convention];
      const first: PlainDate = { year: cursor.year, month: cursor.month, day: 1 };
      const count = new Date(Date.UTC(cursor.year, cursor.month, 0)).getUTCDate();
      const hijri = hijriLabels(first, count, lat, lon);
      const days: Array<{ date: PlainDate; hijri: string; times: DailyPrayerTimes }> = [];
      for (let i = 0; i < count; i += 1) {
        const date = addDays(first, i);
        days.push({ date, hijri: hijri[i], times: dailyPrayerTimes(date, lat, lon, conv) });
      }
      return { days, error: null as string | null };
    } catch (error) {
      return { days: [], error: error instanceof Error ? error.message : String(error) };
    }
  }, [cursor, lat, lon, convention]);

  const shift = (delta: number) =>
    setCursor(({ year, month }) => {
      const m = month + delta;
      return m < 1 ? { year: year - 1, month: 12 } : m > 12 ? { year: year + 1, month: 1 } : { year, month: m };
    });

  const today = todayIsoIn(timeZone);

  return (
    <section className="card print-area overflow-hidden" aria-label="Jadwal sebulan">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
        <div>
          <h2 className="text-md font-bold">Jadwal sebulan</h2>
          <p className="text-sm text-ink-muted">
            {convention} · waktu {zoneAbbreviation(timeZone)} · Imsak = Subuh − {IMSAK_MINUTES} menit
          </p>
        </div>
        <div className="no-print flex items-center gap-1">
          <button type="button" onClick={() => shift(-1)} className="flex size-10 items-center justify-center rounded-full border border-border hover:bg-surface-raised" aria-label="Bulan sebelumnya">
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <span className="min-w-[9.5rem] text-center text-sm font-bold">
            {MONTHS_ID[cursor.month - 1]} {cursor.year}
          </span>
          <button type="button" onClick={() => shift(1)} className="flex size-10 items-center justify-center rounded-full border border-border hover:bg-surface-raised" aria-label="Bulan berikutnya">
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
          <span className="ml-2 hidden sm:block">
            <PrintButton label="Cetak" />
          </span>
        </div>
      </div>

      {rows.error ? (
        <div className="p-5">
          <ErrorBanner message="Jadwal bulan ini tidak bisa dihitung untuk lokasi ini." detail={rows.error} />
        </div>
      ) : (
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tabel jadwal salat sebulan">
          <table className="w-full min-w-[46rem] text-sm">
            <caption className="sr-only">
              Jadwal salat {MONTHS_ID[cursor.month - 1]} {cursor.year}, konvensi {convention}, waktu setempat.
            </caption>
            <thead className="bg-surface-raised text-2xs uppercase tracking-wider text-ink-muted">
              <tr>
                <th scope="col" className="px-4 py-2.5 text-left font-bold">Tanggal</th>
                <th scope="col" className="px-3 py-2.5 text-left font-bold">Hijriah</th>
                <th scope="col" className="px-3 py-2.5 text-right font-bold">Imsak</th>
                {PRAYER_ORDER.map((k) => (
                  <th key={k} scope="col" className="px-3 py-2.5 text-right font-bold">
                    {PRAYER_LABEL[k]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.days.map(({ date, hijri, times }) => {
                const iso = `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
                const isToday = iso === today;
                const friday = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay() === 5;
                return (
                  <tr key={iso} className={cn("border-t border-border/70 tabular-nums", isToday && "bg-accent-solid/10 font-bold")}>
                    <th scope="row" className="whitespace-nowrap px-4 py-2 text-left font-semibold">
                      <span className={cn(friday && "text-accent")}>{formatLongDate(iso, { weekday: "short", month: undefined, year: undefined })}</span>
                    </th>
                    <td className="whitespace-nowrap px-3 py-2 text-ink-muted">{hijri}</td>
                    <td className="px-3 py-2 text-right text-ink-muted">
                      {formatClock(times.fajr === null ? null : times.fajr - IMSAK_MINUTES * MINUTE_US, timeZone)}
                    </td>
                    {PRAYER_ORDER.map((k) => (
                      <td key={k} className={cn("px-3 py-2 text-right", k === "sunrise" && "text-ink-muted")}>
                        {formatClock(times[k], timeZone)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
