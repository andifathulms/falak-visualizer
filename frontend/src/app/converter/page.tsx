"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeftRight, Calendar } from "lucide-react";
import { HisabDisclaimer } from "@/components/HisabDisclaimer";
import { CalculationPanel } from "@/components/CalculationPanel";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, inputClasses } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { cn } from "@/lib/cn";
import { todayIso } from "@/lib/date";
import { ApiError, convertDate, ConvertResult } from "@/lib/api";
import { readQueryParams, writeQueryParams } from "@/lib/permalink";

const HIJRI_MONTHS = [
  "Muharram",
  "Safar",
  "Rabi'ul Awwal",
  "Rabi'ul Akhir",
  "Jumadil Awwal",
  "Jumadil Akhir",
  "Rajab",
  "Sya'ban",
  "Ramadhan",
  "Syawal",
  "Dzulqa'dah",
  "Dzulhijjah",
];

const MONTH_OPTIONS = HIJRI_MONTHS.map((name, i) => ({ value: String(i + 1), label: name }));

const METHOD_LABELS: Record<string, string> = {
  mabims_2021: "MABIMS 2021",
};

const DIRECTION_LABELS: Record<string, string> = {
  gregorian_to_hijri: "Gregorian → Hijri",
  hijri_to_gregorian: "Hijri → Gregorian",
};

export default function ConverterPage() {
  const [direction, setDirection] = useState<"gregorian_to_hijri" | "hijri_to_gregorian">(
    "gregorian_to_hijri",
  );
  const [date, setDate] = useState("");
  const [hijriYear, setHijriYear] = useState(1445);
  const [hijriMonth, setHijriMonth] = useState(9);
  const [hijriDay, setHijriDay] = useState(1);
  const [result, setResult] = useState<ConvertResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function compute(
    dir: "gregorian_to_hijri" | "hijri_to_gregorian",
    d: string,
    y: number,
    m: number,
    day: number,
  ) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await convertDate(
        dir === "gregorian_to_hijri"
          ? { direction: dir, date: d }
          : { direction: dir, hijri_year: y, hijri_month: m, hijri_day: day },
      );
      setResult(r);
      writeQueryParams(
        dir === "gregorian_to_hijri"
          ? { direction: dir, date: d }
          : { direction: dir, hijri_year: y, hijri_month: m, hijri_day: day },
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The calculation failed unexpectedly.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const params = readQueryParams();
    const qDirection = params.get("direction");
    if (qDirection === "gregorian_to_hijri" && params.get("date")) {
      const qDate = params.get("date")!;
      setDirection(qDirection);
      setDate(qDate);
      compute(qDirection, qDate, hijriYear, hijriMonth, hijriDay);
    } else if (qDirection === "hijri_to_gregorian" && params.get("hijri_year")) {
      const y = Number(params.get("hijri_year"));
      const m = Number(params.get("hijri_month") ?? hijriMonth);
      const day = Number(params.get("hijri_day") ?? hijriDay);
      setDirection(qDirection);
      setHijriYear(y);
      setHijriMonth(m);
      setHijriDay(day);
      compute(qDirection, date, y, m, day);
    } else {
      setDate(todayIso());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await compute(direction, date, hijriYear, hijriMonth, hijriDay);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Calendar}
        title="Hijri ↔ Gregorian Converter"
        description="MABIMS-2021 method (Indonesia's current standard) — computed from real ijtimak + visibility, not a tabular lookup."
      />

      <HisabDisclaimer />

      <Card className="p-5">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="inline-flex rounded-xl border border-neutral-300 p-1 dark:border-night-600/50">
            {(
              [
                ["gregorian_to_hijri", "Gregorian → Hijri"],
                ["hijri_to_gregorian", "Hijri → Gregorian"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setDirection(value)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  direction === value
                    ? "bg-gold-500/15 text-accent"
                    : "text-ink-muted hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {direction === "gregorian_to_hijri" ? (
              <motion.div
                key="g2h"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.2 }}
              >
                <Field label="Gregorian date">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={inputClasses}
                  />
                </Field>
              </motion.div>
            ) : (
              <motion.div
                key="h2g"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-3 gap-3"
              >
                <Field label="Hijri year">
                  <input
                    type="number"
                    value={hijriYear}
                    onChange={(e) => setHijriYear(Number(e.target.value))}
                    className={inputClasses}
                  />
                </Field>
                <Select
                  label="Month"
                  value={String(hijriMonth)}
                  onChange={(v) => setHijriMonth(Number(v))}
                  options={MONTH_OPTIONS}
                />
                <Field label="Day">
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={hijriDay}
                    onChange={(e) => setHijriDay(Number(e.target.value))}
                    className={inputClasses}
                  />
                </Field>
              </motion.div>
            )}
          </AnimatePresence>

          <Button type="submit" loading={loading}>
            {!loading && <ArrowLeftRight className="size-4" />}
            {loading ? "Converting…" : "Convert"}
          </Button>
        </form>
      </Card>

      {error && <ErrorBanner message={error} />}

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <Card className="p-5">
              {result.direction === "gregorian_to_hijri" ? (
                <p className="text-lg">
                  {result.input_date} corresponds to{" "}
                  <strong className="text-gradient-accent">
                    {result.hijri_day} {result.hijri_month_name} {result.hijri_year}H
                  </strong>
                </p>
              ) : (
                <p className="text-lg">
                  {result.hijri_day} {HIJRI_MONTHS[result.hijri_month - 1]} {result.hijri_year}H corresponds to{" "}
                  <strong className="text-gradient-accent">
                    {result.gregorian_date}
                  </strong>
                </p>
              )}
              <CalculationPanel
                rows={[
                  ["Method", METHOD_LABELS[result.method] ?? result.method],
                  ["Direction", DIRECTION_LABELS[result.direction] ?? result.direction],
                ]}
              />
            </Card>
            <div className="mt-4">
              <CopyLinkButton />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
