"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sun, Sunrise, Sunset, Moon, MoonStar, CloudSun, Search } from "lucide-react";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, inputClasses } from "@/components/ui/Field";
import { LocationPicker } from "@/components/LocationPicker";
import { ApiError, fetchPrayerTimes, PrayerTimesResult } from "@/lib/api";
import { DEFAULT_CITY } from "@/lib/locations";
import { todayIso } from "@/lib/date";

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
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
  const [date, setDate] = useState("");
  const [lat, setLat] = useState(DEFAULT_CITY.lat);
  const [lon, setLon] = useState(DEFAULT_CITY.lon);
  const [result, setResult] = useState<PrayerTimesResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setDate(todayIso());
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetchPrayerTimes({ date, lat, lon, convention: "Kemenag RI" });
      setResult(r);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reach the Falak API.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Sun}
        title="Prayer Times"
        description="Kemenag RI convention (fajr 20°, isha 18°, Shafi'i shadow-length asr) — computed from solar position for any coordinate and date. Times shown in UTC."
      />

      <Card className="p-5">
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {PRAYERS.map((p, i) => (
            <motion.div
              key={p.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.06, ease: "easeOut" }}
            >
              <Card className="flex flex-col items-center gap-2 p-4 text-center transition-transform hover:-translate-y-0.5">
                <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-gold-400/20 to-moon-500/20 text-gold-600 dark:text-gold-400">
                  <p.icon className="size-5" strokeWidth={1.8} />
                </div>
                <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{p.label}</div>
                <div className="font-mono text-lg font-semibold">{formatTime(result[p.key])}</div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
