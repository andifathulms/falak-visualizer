"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Sun, Sunrise, Sunset, Moon, MoonStar, CloudSun, Search, Clock } from "lucide-react";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, inputClasses } from "@/components/ui/Field";
import { LocationPicker } from "@/components/LocationPicker";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { PrintButton } from "@/components/PrintButton";
import { Table, TableColumn } from "@/components/ui/Table";
import { cn } from "@/lib/cn";
import {
  ApiError,
  fetchPrayerTimes,
  fetchPrayerTimesMonth,
  PrayerTimesMonthResult,
  PrayerTimesResult,
} from "@/lib/api";
import { DEFAULT_CITY } from "@/lib/locations";
import { todayIso } from "@/lib/date";
import { resolveTimeZone } from "@/lib/timezone";
import { readQueryParams, writeQueryParams } from "@/lib/permalink";

function formatTime(iso: string | null, timeZone: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone });
}

const PRAYERS = [
  { key: "fajr" as const, label: "Fajr", icon: MoonStar },
  { key: "sunrise" as const, label: "Sunrise", icon: Sunrise },
  { key: "dhuhr" as const, label: "Dhuhr", icon: Sun },
  { key: "asr" as const, label: "Asr", icon: CloudSun },
  { key: "maghrib" as const, label: "Maghrib", icon: Sunset },
  { key: "isha" as const, label: "Isha", icon: Moon },
];

export default function PrayerTimesPage() {
  const [view, setView] = useState<"daily" | "monthly">("daily");

  const [date, setDate] = useState("");
  const [lat, setLat] = useState(DEFAULT_CITY.lat);
  const [lon, setLon] = useState(DEFAULT_CITY.lon);
  const [result, setResult] = useState<PrayerTimesResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const now = new Date();
  const [monthYear, setMonthYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [monthResult, setMonthResult] = useState<PrayerTimesMonthResult | null>(null);
  const [monthError, setMonthError] = useState<string | null>(null);
  const [monthLoading, setMonthLoading] = useState(false);

  const monthTimeZone = useMemo(
    () => (monthResult ? resolveTimeZone(monthResult.latitude_deg, monthResult.longitude_deg) : null),
    [monthResult],
  );
  const displayMonthTimeZone = monthTimeZone ?? "UTC";

  async function loadMonth(e?: React.FormEvent) {
    e?.preventDefault();
    setMonthLoading(true);
    setMonthError(null);
    try {
      const r = await fetchPrayerTimesMonth({ year: monthYear, month, lat, lon, convention: "Kemenag RI" });
      setMonthResult(r);
    } catch (err) {
      setMonthError(err instanceof ApiError ? err.message : "The calculation failed unexpectedly.");
    } finally {
      setMonthLoading(false);
    }
  }

  const monthColumns: TableColumn<PrayerTimesResult>[] = [
    { key: "date", header: "Date", render: (d) => d.date },
    ...PRAYERS.map(
      (p): TableColumn<PrayerTimesResult> => ({
        key: p.key,
        header: p.label,
        render: (d) => formatTime(d[p.key], displayMonthTimeZone),
      }),
    ),
  ];

  const timeZone = useMemo(
    () => (result ? resolveTimeZone(result.latitude_deg, result.longitude_deg) : null),
    [result],
  );
  const displayTimeZone = timeZone ?? "UTC";

  async function compute(d: string, la: number, lo: number) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetchPrayerTimes({ date: d, lat: la, lon: lo, convention: "Kemenag RI" });
      setResult(r);
      writeQueryParams({ date: d, lat: la, lon: lo });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The calculation failed unexpectedly.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const params = readQueryParams();
    const qDate = params.get("date");
    const qLat = params.get("lat");
    const qLon = params.get("lon");
    if (qDate && qLat && qLon) {
      setDate(qDate);
      setLat(Number(qLat));
      setLon(Number(qLon));
      compute(qDate, Number(qLat), Number(qLon));
    } else {
      setDate(todayIso());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await compute(date, lat, lon);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Sun}
        title="Prayer Times"
        description="Kemenag RI convention (fajr 20°, isha 18°, Shafi'i shadow-length asr) — computed from solar position for any coordinate and date, shown in the local time zone for that location."
      />

      <div className="no-print inline-flex rounded-xl border border-neutral-300 p-1 dark:border-night-600/50">
        {(["daily", "monthly"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors",
              view === v
                ? "bg-gold-500/15 text-accent"
                : "text-ink-muted hover:text-foreground",
            )}
          >
            {v}
          </button>
        ))}
      </div>

      {view === "daily" ? (
        <>
          <Card className="p-5 no-print">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-4">
              <Field label="Date">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClasses} />
              </Field>
              <LocationPicker lat={lat} lon={lon} onChange={(newLat, newLon) => { setLat(newLat); setLon(newLon); }} />
              <Button type="submit" loading={loading} className="w-full">
                {!loading && <Search className="size-4" />}
                {loading ? "Computing…" : "Compute"}
              </Button>
            </form>
          </Card>

          {error && <ErrorBanner message={error} />}

          {result && (
            <div className="print-area space-y-3">
              <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                <Clock className="size-3.5" />
                Local time for this location: {displayTimeZone}
                {!timeZone && " (time zone lookup failed, showing UTC instead)"}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {PRAYERS.map((p, i) => (
                  <motion.div
                    key={p.key}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.06, ease: "easeOut" }}
                  >
                    <Card className="flex flex-col items-center gap-2 p-4 text-center transition-transform hover:-translate-y-0.5">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-gold-400/20 to-moon-500/20 text-accent">
                        <p.icon className="size-5" strokeWidth={1.8} />
                      </div>
                      <div className="text-xs font-medium text-ink-muted">{p.label}</div>
                      <div className="font-mono text-lg font-semibold">
                        {formatTime(result[p.key], displayTimeZone)}
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
              <div className="no-print flex flex-wrap gap-3">
                <CopyLinkButton />
                <PrintButton label="Print / Save as PDF" />
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <Card className="p-5 no-print">
            <form onSubmit={loadMonth} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-4">
              <Field label="Year">
                <input
                  type="number"
                  value={monthYear}
                  onChange={(e) => setMonthYear(Number(e.target.value))}
                  className={inputClasses}
                />
              </Field>
              <Field label="Month">
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className={inputClasses}
                />
              </Field>
              <LocationPicker lat={lat} lon={lon} onChange={(newLat, newLon) => { setLat(newLat); setLon(newLon); }} />
              <Button type="submit" loading={monthLoading} className="w-full">
                {!monthLoading && <Search className="size-4" />}
                {monthLoading ? "Loading…" : "Load month"}
              </Button>
            </form>
          </Card>

          {monthError && <ErrorBanner message={monthError} />}

          {monthResult && (
            <Card className="print-area p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                  <Clock className="size-3.5" />
                  Local time for this location: {displayMonthTimeZone}
                </div>
                <div className="no-print">
                  <PrintButton />
                </div>
              </div>
              <Table columns={monthColumns} rows={monthResult.days} rowKey={(d) => d.date} />
            </Card>
          )}
        </>
      )}
    </div>
  );
}
