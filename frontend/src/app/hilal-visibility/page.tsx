"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MoonStar, Search, Gauge, Ruler, Clock3, Sunset, Percent, Timer, Sparkles } from "lucide-react";
import { HisabDisclaimer } from "@/components/HisabDisclaimer";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, inputClasses } from "@/components/ui/Field";
import { LocationPicker } from "@/components/LocationPicker";
import { HilalMoon } from "@/components/HilalMoon";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { PrintButton } from "@/components/PrintButton";
import { ApiError, fetchHilalVisibility, HilalObservation } from "@/lib/api";
import { DEFAULT_CITY } from "@/lib/locations";
import { todayIso } from "@/lib/date";
import { isVisible } from "@/lib/verdict";
import { formatMargin, MODEL_CAVEATS } from "@/lib/falak/tolerance";
import { readQueryParams, writeQueryParams } from "@/lib/permalink";

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
  const [date, setDate] = useState("");
  const [lat, setLat] = useState(DEFAULT_CITY.lat);
  const [lon, setLon] = useState(DEFAULT_CITY.lon);
  const [obs, setObs] = useState<HilalObservation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);



  async function compute(d: string, la: number, lo: number) {
    setLoading(true);
    setError(null);
    setObs(null);
    try {
      const r = await fetchHilalVisibility({ date: d, lat: la, lon: lo });
      setObs(r);
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
          <LocationPicker lat={lat} lon={lon} onChange={(newLat, newLon) => { setLat(newLat); setLon(newLon); }} />
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
          className="print-area space-y-4"
        >
          <Card className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:justify-center sm:gap-8 sm:text-left">
            <HilalMoon illuminationFraction={obs.illumination_fraction} visible={isVisible(obs.criteria.mabims_2021)} />
            <div>
              <div
                className={
                  isVisible(obs.criteria.mabims_2021)
                    ? "text-2xl font-semibold bg-gradient-to-r from-gold-400 to-moon-500 bg-clip-text text-transparent"
                    : "text-2xl font-semibold text-ink-muted"
                }
              >
                {isVisible(obs.criteria.mabims_2021) ? "Hilal likely visible" : "Hilal not established"}
              </div>
              <p className="mt-1 text-sm text-ink-muted">
                {(obs.illumination_fraction * 100).toFixed(2)}% illuminated · per MABIMS 2021 — see comparison
                below, criteria can disagree
              </p>
              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-ink-muted sm:justify-start dark:text-ink-muted">
                <Sunset className="size-3.5 text-gold-500" />
                Sunset {new Date(obs.sunset_time_utc).toISOString().slice(11, 16)} UTC · Moonset{" "}
                {obs.moonset_time_utc ? new Date(obs.moonset_time_utc).toISOString().slice(11, 16) : "—"} UTC ·
                Conjunction {new Date(obs.conjunction_time_utc).toISOString().slice(0, 16).replace("T", " ")} UTC
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-md font-semibold">Observational numbers</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.04 }}
                  className="rounded-xl border border-neutral-200 p-3 dark:border-night-700/60"
                >
                  <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                    <stat.icon className="size-3.5" strokeWidth={1.8} />
                    {stat.label}
                  </div>
                  <div className="mt-1 font-mono text-lg">{stat.value}</div>
                </motion.div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-1 text-md font-semibold">Around sunset</h2>
            <p className="mb-3 text-sm text-ink-muted">
              Moon altitude and elongation for the hour spanning sunset — not just the sunset-instant numbers above.
            </p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={obs.trajectory} margin={{ top: 4, right: 12, bottom: 0, left: -12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} vertical={false} />
                  <XAxis
                    dataKey="minutes_from_sunset"
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}m`}
                    stroke="#94a3b8"
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    tickFormatter={(v) => `${v}°`}
                    stroke="#94a3b8"
                    width={40}
                  />
                  <ReferenceLine x={0} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: "Sunset", fontSize: 11, fill: "#94a3b8", position: "top" }} />
                  <Tooltip
                    formatter={(value, name) => [`${Number(value).toFixed(2)}°`, name]}
                    labelFormatter={(v) => `${Number(v) > 0 ? "+" : ""}${v} min from sunset`}
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="moon_altitude_deg"
                    name="Moon altitude"
                    stroke="#4fb3a6"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="elongation_deg"
                    name="Elongation"
                    stroke="#d9a83e"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-md font-semibold">Criteria comparison</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {CRITERIA.map((c, i) => {
                const verdict = obs.criteria[c.key];
                const m = obs.margins?.[c.key];
                const undecided = m?.verdict === "indeterminate";
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
                      <Badge
                        tone={
                          undecided ? "indeterminate" : isVisible(verdict) ? "positive" : "neutral"
                        }
                      >
                        {undecided ? "Too close to call" : String(verdict)}
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-sm text-ink-muted">{c.rule}</p>
                    {/* The margin is the point of this whole panel: a verdict
                        without it reads as settled when it may have been decided
                        by a hundredth of a degree. */}
                    {m && (
                      <p className="mt-2 border-t border-neutral-200 pt-2 text-2xs text-ink-muted dark:border-night-700/60">
                        {formatMargin(m) ? (
                          <>
                            <span className="font-mono font-semibold tabular-nums text-foreground">
                              {formatMargin(m)}
                            </span>{" "}
                            margin on {m.binding}
                          </>
                        ) : (
                          <>Decided by: {m.binding}</>
                        )}
                        {undecided && (
                          <>
                            {" "}— inside this engine&apos;s ±
                            {m.tolerance}
                            {m.unit === "deg" ? "°" : " min"} tolerance, so it is not resolved.
                          </>
                        )}
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </div>
            <p className="mt-4 text-sm text-ink-muted">
              These criteria can and do disagree — that is expected, not a bug. This tool does not advocate for one
              method.
            </p>

            {/* An accuracy claim that omitted these would mislead by omission:
                each is larger than the tolerance quoted above and none of them
                is fixed by more arithmetic precision. */}
            <details className="mt-3 rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm dark:border-night-700/60">
              <summary className="cursor-pointer list-none font-medium [&::-webkit-details-marker]:hidden">
                What this engine assumes{" "}
                <span className="font-normal text-ink-muted underline decoration-dotted underline-offset-2">
                  ({MODEL_CAVEATS.length} known limits)
                </span>
              </summary>
              <dl className="mt-2.5 space-y-2.5">
                {MODEL_CAVEATS.map((cav) => (
                  <div key={cav.title}>
                    <dt className="text-2xs font-semibold uppercase tracking-wide">{cav.title}</dt>
                    <dd className="mt-0.5 text-sm text-ink-muted">{cav.detail}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </Card>

          <div className="no-print flex flex-wrap gap-3">
            <CopyLinkButton />
            <PrintButton label="Print / Save as PDF (sidang isbat submission)" />
          </div>
        </motion.div>
      )}
    </div>
  );
}
