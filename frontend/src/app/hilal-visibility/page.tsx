"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MoonStar, Search, Gauge, Ruler, Clock3, Sunset, Percent, Timer, Sparkles } from "lucide-react";
import { HisabDisclaimer } from "@/components/HisabDisclaimer";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, inputClasses } from "@/components/ui/Field";
import { ApiError, fetchHilalVisibility, HilalObservation } from "@/lib/api";

function isVisible(verdict: boolean | string) {
  return verdict === true || verdict === "visible" || verdict === "visible_optical_aid";
}

const CRITERIA = [
  {
    key: "wujudul_hilal" as const,
    name: "Wujudul Hilal",
    rule: "Conjunction before sunset, moonset after sunset",
  },
  {
    key: "mabims_2021" as const,
    name: "MABIMS 2021",
    rule: "Altitude ≥ 3°, elongation ≥ 6.4°",
  },
  {
    key: "odeh" as const,
    name: "Odeh",
    rule: "Continuous classification (ARCV vs. crescent width)",
  },
];

export default function HilalVisibilityPage() {
  const [date, setDate] = useState("2024-04-09");
  const [lat, setLat] = useState(-6.2);
  const [lon, setLon] = useState(106.8);
  const [obs, setObs] = useState<HilalObservation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setObs(null);
    try {
      const r = await fetchHilalVisibility({ date, lat, lon });
      setObs(r);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reach the Falak API.");
    } finally {
      setLoading(false);
    }
  }

  const stats = obs
    ? [
        { label: "Moon altitude", value: `${obs.moon_altitude_deg.toFixed(2)}°`, icon: Gauge },
        { label: "Elongation", value: `${obs.elongation_deg.toFixed(2)}°`, icon: Ruler },
        { label: "Moon age", value: `${obs.moon_age_hours.toFixed(1)} h`, icon: Clock3 },
        { label: "Illumination", value: `${(obs.illumination_fraction * 100).toFixed(2)}%`, icon: Percent },
        {
          label: "Lag time",
          value: obs.lag_time_minutes != null ? `${obs.lag_time_minutes.toFixed(1)} min` : "—",
          icon: Timer,
        },
        { label: "Crescent width", value: `${obs.crescent_width_arcmin.toFixed(2)}'`, icon: Sparkles },
      ]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={MoonStar}
        title="Hilal Visibility"
        description="Numeric conditions at sunset on the given evening (intended for the 29th of a Hijri month), classified against three criteria side by side."
      />

      <HisabDisclaimer />

      <Card className="p-5">
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 items-end gap-3 sm:grid-cols-4"
        >
          <Field label="Date (evening)">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClasses} />
          </Field>
          <Field label="Latitude">
            <input
              type="number"
              step="0.0001"
              value={lat}
              onChange={(e) => setLat(Number(e.target.value))}
              className={inputClasses}
            />
          </Field>
          <Field label="Longitude">
            <input
              type="number"
              step="0.0001"
              value={lon}
              onChange={(e) => setLon(Number(e.target.value))}
              className={inputClasses}
            />
          </Field>
          <Button type="submit" loading={loading} className="w-full">
            {!loading && <Search className="size-4" />}
            {loading ? "Computing…" : "Compute"}
          </Button>
        </form>
      </Card>

      {error && <ErrorBanner message={error} />}

      {obs && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2 rounded-xl bg-night-500/5 px-4 py-2.5 text-sm text-neutral-600 dark:text-neutral-400">
            <Sunset className="size-4 text-gold-500" />
            Sunset {new Date(obs.sunset_time_utc).toISOString().slice(11, 16)} UTC · Moonset{" "}
            {obs.moonset_time_utc ? new Date(obs.moonset_time_utc).toISOString().slice(11, 16) : "—"} UTC ·
            Conjunction {new Date(obs.conjunction_time_utc).toISOString().slice(0, 16).replace("T", " ")} UTC
          </div>

          <Card className="p-5">
            <h2 className="mb-3 font-medium">Observational numbers</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.04 }}
                  className="rounded-xl border border-neutral-200 p-3 dark:border-night-700/60"
                >
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                    <stat.icon className="size-3.5" strokeWidth={1.8} />
                    {stat.label}
                  </div>
                  <div className="mt-1 font-mono text-lg">{stat.value}</div>
                </motion.div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 font-medium">Criteria comparison</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {CRITERIA.map((c, i) => {
                const verdict = obs.criteria[c.key];
                return (
                  <motion.div
                    key={c.key}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.06 }}
                    className="rounded-xl border border-neutral-200 p-3.5 dark:border-night-700/60"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{c.name}</span>
                      <Badge tone={isVisible(verdict) ? "positive" : "neutral"}>{String(verdict)}</Badge>
                    </div>
                    <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">{c.rule}</p>
                  </motion.div>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400">
              These criteria can and do disagree — that is expected, not a bug. This tool does not advocate for one
              method.
            </p>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
