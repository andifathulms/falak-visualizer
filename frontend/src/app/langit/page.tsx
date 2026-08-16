"use client";

import { useEffect, useState } from "react";
import { DayArc } from "@/components/DayArc";
import { ConventionNote, CONVENTION_OPTIONS, DEFAULT_CONVENTION } from "@/components/ConventionNote";
import { ErrorBanner } from "@/components/ErrorBanner";
import { HisabDisclaimer } from "@/components/HisabDisclaimer";
import { Select } from "@/components/ui/Select";
import { Table, type TableColumn } from "@/components/ui/Table";
import { useObservation } from "@/components/ObservationProvider";
import { ApiError, fetchPrayerTimesMonth, fetchRashdulQibla, type PrayerTimesMonthResult, type PrayerTimesResult, type RashdulQiblaResult } from "@/lib/api";
import { buildDayArcInput } from "@/lib/dayArcData";
import type { DayArcInput, PrayerKey } from "@/lib/dayArcGeometry";
import { CONVENTIONS } from "@/lib/falak/prayerTimes";
import { qiblaDirection } from "@/lib/falak/qibla";
import { parsePlainDate } from "@/lib/falak/time";
import { readQueryParams } from "@/lib/permalink";

const PRAYER_ORDER: PrayerKey[] = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];
const PRAYER_LABEL: Record<PrayerKey, string> = {
  fajr: "Subuh",
  sunrise: "Terbit",
  dhuhr: "Dzuhur",
  asr: "Ashar",
  maghrib: "Maghrib",
  isha: "Isya",
};

function formatLocalTime(instant: number | null, timeZone: string): string {
  if (instant === null) return "—";
  return new Date(instant / 1000).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone });
}

function formatTime(iso: string | null, timeZone: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone });
}

/**
 * /langit - "where is the sun, and which way is the Kaaba?" (DESIGN.md
 * §4.1/§6). Absorbs /prayer-times and /qibla: DayArc at the top, the daily
 * readout as one row (not six cards), convention selector + ConventionNote,
 * a monthly toggle that swaps the readout for the jadwal imsakiyah table
 * while keeping the arc, and Rashdul Qibla at the bottom with its own year
 * input (DESIGN.md §6: "keeps its own section... its own year input" -
 * the one control on this page that isn't the shared context bar, since a
 * calibration year isn't "place and date").
 *
 * DayArc's input is computed here from the SAME dailyPrayerTimes call the
 * readout row formats - one computation, two views of it, not two separate
 * calls that could drift.
 */
export default function LangitPage() {
  const { lat, lon, dateIso, timeZone } = useObservation();
  const [convention, setConvention] = useState(DEFAULT_CONVENTION);
  const [view, setView] = useState<"daily" | "monthly">("daily");

  // `?convention=` read once on mount (migration step 9): the redirect
  // stub replacing /prayer-times needs a way to carry an old link's
  // convention choice over, the same reasoning as /hilal's `?sweep=`.
  useEffect(() => {
    const qConvention = readQueryParams().get("convention");
    if (qConvention && CONVENTION_OPTIONS.some((o) => o.value === qConvention)) {
      setConvention(qConvention);
    }
  }, []);

  const [dayArc, setDayArc] = useState<DayArcInput | null>(null);
  const [dayArcError, setDayArcError] = useState<string | null>(null);
  const [qibla, setQibla] = useState<{ bearingDeg: number; distanceKm: number } | null>(null);

  const [monthResult, setMonthResult] = useState<PrayerTimesMonthResult | null>(null);
  const [monthError, setMonthError] = useState<string | null>(null);
  const [monthLoading, setMonthLoading] = useState(false);
  const now = new Date();
  const [monthYear, setMonthYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [rashdulYear, setRashdulYear] = useState(() => new Date().getFullYear());
  const [rashdul, setRashdul] = useState<RashdulQiblaResult | null>(null);
  const [rashdulError, setRashdulError] = useState<string | null>(null);
  const [rashdulLoading, setRashdulLoading] = useState(false);

  const displayTimeZone = timeZone ?? "UTC";

  useEffect(() => {
    let cancelled = false;
    setDayArcError(null);
    try {
      const q = qiblaDirection(lat, lon);
      const conventionDef = CONVENTIONS[convention] ?? CONVENTIONS[DEFAULT_CONVENTION];
      const input = buildDayArcInput(parsePlainDate(dateIso), lat, lon, conventionDef, q.bearingDeg);
      if (!cancelled) {
        setQibla(q);
        setDayArc(input);
      }
    } catch (err) {
      if (!cancelled) {
        setDayArc(null);
        setDayArcError(err instanceof Error ? err.message : String(err));
      }
    }
    return () => {
      cancelled = true;
    };
  }, [dateIso, lat, lon, convention]);

  useEffect(() => {
    let cancelled = false;
    setRashdulLoading(true);
    setRashdulError(null);
    fetchRashdulQibla({ year: rashdulYear })
      .then((r) => {
        if (!cancelled) setRashdul(r);
      })
      .catch((err) => {
        if (cancelled) return;
        setRashdulError(err instanceof ApiError ? err.message : "Perhitungan gagal.");
      })
      .finally(() => {
        if (!cancelled) setRashdulLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rashdulYear]);

  async function loadMonth() {
    setMonthLoading(true);
    setMonthError(null);
    try {
      const r = await fetchPrayerTimesMonth({ year: monthYear, month, lat, lon, convention });
      setMonthResult(r);
    } catch (err) {
      setMonthError(err instanceof ApiError ? err.message : "Perhitungan gagal.");
    } finally {
      setMonthLoading(false);
    }
  }

  const monthColumns: TableColumn<PrayerTimesResult>[] = [
    { key: "date", header: "Tanggal", render: (d) => d.date },
    ...PRAYER_ORDER.map(
      (key): TableColumn<PrayerTimesResult> => ({
        key,
        header: PRAYER_LABEL[key],
        render: (d) => formatTime(d[key], displayTimeZone),
      }),
    ),
  ];

  return (
    <div lang="id" className="space-y-6">
      <h1 className="sr-only">Langit</h1>

      {dayArcError && (
        <ErrorBanner
          message={`Jadwal untuk lokasi dan tanggal ini tidak dapat dihitung dengan andal: ${dayArcError}`}
        />
      )}

      {dayArc && (
        <div className="-mx-4 sm:mx-0">
          <DayArc input={dayArc} />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Tampilan" className="inline-flex rounded-xl border border-border p-1 text-sm">
          {(["daily", "monthly"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={
                view === v
                  ? "rounded-lg bg-accent-solid/15 px-3 py-1.5 font-medium text-accent"
                  : "rounded-lg px-3 py-1.5 text-ink-muted transition-colors duration-fast hover:text-ink"
              }
            >
              {v === "daily" ? "Harian" : "Bulanan"}
            </button>
          ))}
        </div>
        <Select label="Konvensi" value={convention} onChange={setConvention} options={CONVENTION_OPTIONS} />
      </div>

      {view === "daily" ? (
        dayArc && (
          <>
            {/* DESIGN.md §6: "the daily prayer times as a single readout
                row - not six separate cards". */}
            <dl className="flex flex-wrap gap-x-8 gap-y-3 rounded-2xl border border-border bg-surface-card px-5 py-4">
              {dayArc.prayers.map((p) => (
                <div key={p.key}>
                  <dt className="text-2xs font-medium text-ink-muted">{PRAYER_LABEL[p.key]}</dt>
                  <dd className="font-mono text-lg font-semibold tabular-nums">
                    {formatLocalTime(p.instant, displayTimeZone)}
                  </dd>
                </div>
              ))}
            </dl>
            <ConventionNote convention={convention} />
          </>
        )
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1.5 block font-medium text-ink-muted">Tahun</span>
              <input
                type="number"
                value={monthYear}
                onChange={(e) => setMonthYear(Number(e.target.value))}
                className="h-11 w-24 rounded-lg border border-border bg-surface-card px-3 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1.5 block font-medium text-ink-muted">Bulan</span>
              <input
                type="number"
                min={1}
                max={12}
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="h-11 w-20 rounded-lg border border-border bg-surface-card px-3 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={loadMonth}
              disabled={monthLoading}
              className="h-11 rounded-xl bg-accent-solid px-4 text-sm font-medium text-accent-on shadow-md shadow-accent-solid/20 disabled:opacity-60"
            >
              {monthLoading ? "Memuat…" : "Muat jadwal bulanan"}
            </button>
          </div>

          {monthError && <ErrorBanner message={monthError} />}

          {monthResult && (
            <div className="rounded-2xl border border-border bg-surface-card p-5">
              <Table
                columns={monthColumns}
                rows={monthResult.days}
                caption={`Jadwal salat harian bulan ${monthResult.month} tahun ${monthResult.year}, konvensi ${convention}, waktu setempat.`}
                rowKey={(d) => d.date}
              />
              <ConventionNote convention={convention} />
            </div>
          )}
        </div>
      )}

      {/* Qibla bearing/distance, and the compass strip at the base of
          DayArc above already marks it - this section gives the numbers
          the drawing's marker stands for. */}
      {qibla !== null && (
        <div className="rounded-2xl border border-border bg-surface-card p-5">
          <dl className="flex flex-wrap gap-x-8 gap-y-3">
            <div>
              <dt className="text-2xs font-medium text-ink-muted">Arah kiblat (dari utara sejati)</dt>
              <dd className="font-mono text-xl font-semibold tabular-nums">{qibla.bearingDeg.toFixed(2)}°</dd>
            </div>
            <div>
              <dt className="text-2xs font-medium text-ink-muted">Jarak ke Ka&apos;bah</dt>
              <dd className="font-mono text-xl font-semibold tabular-nums">{qibla.distanceKm.toFixed(1)} km</dd>
            </div>
          </dl>
        </div>
      )}

      {/* Rashdul Qibla: its own section, its own year input, per DESIGN.md
          §6 - a calibration year isn't "place and date" the shared context
          bar owns. */}
      <div className="rounded-2xl border border-border bg-surface-card p-5">
        <h2 className="text-md font-semibold">Kalibrasi Matahari (Rashdul Kiblat)</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Dua kali setahun matahari tepat berada di atas Ka&apos;bah. Pada saat itu, di mana pun
          matahari sedang bersinar, bayangan benda tegak menunjuk persis berlawanan arah kiblat —
          tanpa perlu kompas.
        </p>

        <div className="mt-4 flex items-end gap-3">
          <label className="text-sm">
            <span className="mb-1.5 block font-medium text-ink-muted">Tahun</span>
            <input
              type="number"
              value={rashdulYear}
              onChange={(e) => setRashdulYear(Number(e.target.value))}
              className="h-11 w-28 rounded-lg border border-border bg-surface-card px-3 text-sm"
            />
          </label>
        </div>

        {rashdulError && <ErrorBanner message={rashdulError} />}
        {rashdulLoading && <p className="mt-3 text-sm text-ink-muted">Menghitung…</p>}

        {rashdul && (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {rashdul.events.map((event) => (
              <div key={event.direction} className="rounded-xl border border-border p-3.5">
                <div className="text-2xs font-medium uppercase tracking-wide text-ink-muted">
                  {event.direction === "ascending" ? "Akhir Mei" : "Pertengahan Juli"}
                </div>
                <div className="mt-1 font-mono text-lg">
                  {new Date(event.utc_time).toLocaleString("id-ID", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: displayTimeZone,
                  })}
                </div>
                <div className="mt-1 text-sm text-ink-muted">{displayTimeZone}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <HisabDisclaimer />
    </div>
  );
}
