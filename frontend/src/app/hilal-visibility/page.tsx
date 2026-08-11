"use client";

import { useEffect, useMemo, useState } from "react";
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
import { verdictLabel } from "@/lib/verdictLabels";
import { formatMargin, MODEL_CAVEATS } from "@/lib/falak/tolerance";
import { CRITERION_CITATIONS } from "@/lib/falak/citations";
import { CitationList } from "@/components/CitationList";
import { readQueryParams, writeQueryParams } from "@/lib/permalink";
import { resolveTimeZone } from "@/lib/timezone";
import { ResultAnnouncer } from "@/components/ResultAnnouncer";
import { HowMonthsWork } from "@/components/HowMonthsWork";
import { CriterionHistory } from "@/components/CriterionHistory";

// Each criterion states its rule AND why that rule - what question the
// arithmetic is standing in for. Citing a threshold answers "who says so";
// these answer "why this number", which is the part a reader needs in order to
// judge a disagreement rather than just observe one.
const CRITERIA = [
  {
    key: "wujudul_hilal" as const,
    name: "Wujudul Hilal",
    rule: "Conjunction before sunset, and moonset after sunset",
    why:
      "Asks whether the crescent EXISTS above the horizon, not whether anyone could see it. If the Moon sets before the Sun it is already gone during the only window it could be observed in, so lag time is the whole test.",
  },
  {
    key: "mabims_2021" as const,
    name: "MABIMS 2021",
    rule: "Altitude ≥ 3° AND elongation ≥ 6.4°",
    why:
      "Two conditions because they ask different things. Altitude asks whether the Moon is high enough to still be up in a dark enough sky. Elongation asks whether it has pulled far enough from the Sun to be lit at all — below roughly 6.4°, the Danjon limit, the crescent is too thin to be seen however high it sits. Both must hold; a comfortable altitude cannot rescue a crescent that physically is not there.",
  },
  {
    key: "odeh" as const,
    name: "Odeh",
    rule: "Continuous v-value from arc of vision and crescent width",
    why:
      "Not a threshold but a distance. Odeh fitted a curve to 737 recorded observations of the faintest crescents actually seen at each width; v is how far above that curve this evening sits. Positive and large means comfortably seen before, near zero means at the edge of what anyone has ever reported, which is why it returns four grades rather than yes or no.",
  },
];

function formatLocalTime(iso: string | null, timeZone: string) {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone });
}

function formatLocalDateTime(iso: string | null, timeZone: string) {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  return `${d.toLocaleDateString([], { day: "2-digit", month: "short", timeZone })} ${d.toLocaleTimeString(
    [],
    { hour: "2-digit", minute: "2-digit", timeZone },
  )}`;
}

function utcTime(iso: string | null) {
  return iso ? `${new Date(iso).toISOString().slice(11, 16)}Z` : "\u2014";
}

function utcDateTime(iso: string | null) {
  return iso ? `${new Date(iso).toISOString().slice(0, 16).replace("T", " ")}Z` : "\u2014";
}

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

  // Every number gets a definition and, crucially, a note of which criterion
  // consumes it. Six identically-styled cards gave a reader no way to tell
  // which three decided the verdict and which two decide nothing at all.
  const stats = obs
    ? [
        {
          label: "Moon altitude",
          value: `${obs.moon_altitude_deg.toFixed(2)}°`,
          icon: Gauge,
          what: "How far above the horizon the Moon sits at sunset.",
          usedBy: "Used by MABIMS 2021 and Odeh",
        },
        {
          label: "Elongation",
          value: `${obs.elongation_deg.toFixed(2)}°`,
          icon: Ruler,
          what: "The angle between the Moon and the Sun as seen from Earth — how far the Moon has pulled away from the glare.",
          usedBy: "Used by MABIMS 2021",
        },
        {
          label: "Moon age",
          value: `${obs.moon_age_hours.toFixed(1)} h`,
          icon: Clock3,
          what: "Time since conjunction.",
          usedBy: "Decides nothing here — the pre-2021 MABIMS rule required 8 hours; the 2021 rule dropped it",
        },
        {
          label: "Illumination",
          value: `${(obs.illumination_fraction * 100).toFixed(2)}%`,
          icon: Percent,
          what: "Fraction of the Moon's disc lit from our viewpoint.",
          usedBy: "Decides nothing — shown for a sense of scale",
        },
        {
          label: "Lag time",
          value: obs.lag_time_minutes != null ? `${obs.lag_time_minutes.toFixed(1)} min` : "—",
          icon: Timer,
          what: "How long the Moon stays up after the Sun sets. Negative means it sets first, so there is no window to look in.",
          usedBy: "Used by Wujudul Hilal",
        },
        {
          label: "Crescent width",
          value: `${obs.crescent_width_arcmin.toFixed(2)}'`,
          icon: Sparkles,
          what: "Thickness of the lit arc, in arcminutes. A very thin crescent is faint no matter how high it is.",
          usedBy: "Used by Odeh",
        },
      ]
    : [];

  // Sunset is the most checkable number on this page - it is the one a reader
  // can verify by looking outside - and it was rendered in UTC, seven hours off
  // for the primary audience. Local is now primary and UTC is kept alongside
  // rather than replaced: the engine works in UTC, permalinks are shared across
  // zones, and a reader comparing against an almanac needs it.
  const timeZone = useMemo(() => resolveTimeZone(lat, lon), [lat, lon]);
  const displayTimeZone = timeZone ?? "UTC";

  // The headline reports MABIMS, so it has to be able to report the same three
  // states the MABIMS card below can. Before this it was a binary on
  // isVisible(), which meant a margin inside tolerance produced a confident
  // "Hilal not established" in 36px type directly above a card saying the
  // criterion does not resolve. Same data, read the same way - no second
  // calculation, and the moon still renders unlit when nothing is established.
  const headlineUndecided = obs?.margins?.mabims_2021?.verdict === "indeterminate";
  const headlineVisible = obs ? !headlineUndecided && isVisible(obs.criteria.mabims_2021) : false;

  return (
    <div className="space-y-6">
      <ResultAnnouncer message={obs ? `Result ready. ${headlineUndecided ? "Too close to call under MABIMS 2021" : headlineVisible ? "Hilal likely visible" : "Hilal not established"}. Moon altitude ${obs.moon_altitude_deg.toFixed(2)} degrees, elongation ${obs.elongation_deg.toFixed(2)} degrees.` : null} />
      <PageHeader
        icon={MoonStar}
        title="Hilal Visibility"
        description="Numeric conditions at sunset on the given evening (intended for the 29th of a Hijri month), classified against three criteria side by side."
      />

      <HisabDisclaimer />

      <HowMonthsWork />

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
            <HilalMoon illuminationFraction={obs.illumination_fraction} visible={headlineVisible} />
            <div>
              <div
                className={
                  headlineVisible
                    ? "text-2xl font-semibold text-gradient-accent"
                    : "text-2xl font-semibold text-ink-muted"
                }
              >
                {headlineUndecided
                  ? "Too close to call"
                  : headlineVisible
                    ? "Hilal likely visible"
                    : "Hilal not established"}
              </div>
              <p className="mt-1 text-sm text-ink-muted">
                {(obs.illumination_fraction * 100).toFixed(2)}% illuminated ·{" "}
                {headlineUndecided
                  ? "MABIMS 2021 lands within this engine's own tolerance here, so it does not resolve — see the margin in the comparison below"
                  : "per MABIMS 2021 — see comparison below, criteria can disagree"}
              </p>
              <div className="mt-3 flex flex-col items-center gap-1 text-xs text-ink-muted sm:items-start">
                <div className="flex items-center gap-2">
                  <Sunset className="size-3.5 text-gold-500" />
                  Sunset {formatLocalTime(obs.sunset_time_utc, displayTimeZone)} · Moonset{" "}
                  {formatLocalTime(obs.moonset_time_utc, displayTimeZone)} · Conjunction{" "}
                  {formatLocalDateTime(obs.conjunction_time_utc, displayTimeZone)}
                </div>
                <div className="pl-[22px] text-2xs">
                  {timeZone
                    ? `Local time for this location (${timeZone}).`
                    : "Time zone lookup failed for this location, so these are UTC."}{" "}
                  In UTC: sunset {utcTime(obs.sunset_time_utc)}, moonset {utcTime(obs.moonset_time_utc)},
                  conjunction {utcDateTime(obs.conjunction_time_utc)}.
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-1 text-md font-semibold">Observational numbers</h2>
            <p className="mb-3 text-sm text-ink-muted">
              Everything measured at the moment of sunset on this evening. Four of these six feed a
              criterion below; the other two are context, and are labelled as such — a number on
              screen is not evidence that anything used it.
            </p>
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
                  <p className="mt-1.5 text-2xs text-ink-muted">{stat.what}</p>
                  <p className="mt-1 text-2xs font-medium text-accent">{stat.usedBy}</p>
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
                <LineChart
                  data={obs.trajectory}
                  margin={{ top: 4, right: 12, bottom: 0, left: -12 }}
                  // Recharts 3's built-in keyboard layer: arrow keys walk the
                  // series and each point is announced. Without it the chart is
                  // an unlabelled SVG carrying data that appears nowhere else on
                  // the page.
                  accessibilityLayer
                >
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

            {/* The chart is the only place the trajectory exists - unlike the
                map, whose verdicts are also summarised in prose. A picture with
                no textual equivalent fails 1.1.1, so the same series is offered
                as a table. Collapsed by default because it repeats what the
                chart already shows for anyone who can see it. */}
            <details className="mt-3 rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm dark:border-night-700/60">
              <summary className="cursor-pointer list-none font-medium [&::-webkit-details-marker]:hidden">
                Trajectory as a table{" "}
                <span className="font-normal text-ink-muted underline decoration-dotted underline-offset-2">
                  ({obs.trajectory.length} samples)
                </span>
              </summary>
              <div className="mt-2.5 overflow-x-auto">
                <table className="w-full min-w-max text-left text-xs">
                  <caption className="sr-only">
                    Moon altitude and elongation sampled every five minutes across the hour
                    surrounding sunset.
                  </caption>
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-night-700/60">
                      <th scope="col" className="px-3 py-2 font-medium text-ink-muted">
                        From sunset
                      </th>
                      <th scope="col" className="px-3 py-2 font-medium text-ink-muted">
                        Moon altitude
                      </th>
                      <th scope="col" className="px-3 py-2 font-medium text-ink-muted">
                        Elongation
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {obs.trajectory.map((point) => (
                      <tr
                        key={point.minutes_from_sunset}
                        className="border-b border-neutral-100 last:border-0 dark:border-night-700/40"
                      >
                        <th scope="row" className="whitespace-nowrap px-3 py-1.5 font-normal">
                          {point.minutes_from_sunset > 0 ? "+" : ""}
                          {point.minutes_from_sunset} min
                        </th>
                        <td className="whitespace-nowrap px-3 py-1.5 font-mono tabular-nums">
                          {point.moon_altitude_deg.toFixed(2)}°
                        </td>
                        <td className="whitespace-nowrap px-3 py-1.5 font-mono tabular-nums">
                          {point.elongation_deg.toFixed(2)}°
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </Card>

          <Card className="p-5">
            <CriterionHistory obs={obs} />
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
                        {undecided ? "Too close to call" : verdictLabel(verdict)}
                      </Badge>
                    </div>
                    <p className="mt-1.5 font-mono text-2xs text-foreground">{c.rule}</p>
                    <p className="mt-1.5 text-sm text-ink-muted">{c.why}</p>
                    {/* The margin is the point of this whole panel: a verdict
                        without it reads as settled when it may have been decided
                        by a hundredth of a degree. */}
                    <CitationList keys={CRITERION_CITATIONS[c.key] ?? []} />
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
