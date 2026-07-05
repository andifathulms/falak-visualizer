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
import { cn } from "@/lib/cn";
import { todayIso } from "@/lib/date";
import { ApiError, convertDate, ConvertResult } from "@/lib/api";

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

  useEffect(() => {
    setDate(todayIso());
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await convertDate(
        direction === "gregorian_to_hijri"
          ? { direction, date }
          : { direction, hijri_year: hijriYear, hijri_month: hijriMonth, hijri_day: hijriDay },
      );
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
                    ? "bg-gold-500/15 text-gold-600 dark:text-gold-400"
                    : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200",
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
                  <strong className="bg-gradient-to-r from-gold-500 to-moon-500 bg-clip-text text-transparent">
                    {result.hijri_day} {result.hijri_month_name} {result.hijri_year}H
                  </strong>
                </p>
              ) : (
                <p className="text-lg">
                  {result.hijri_day} {HIJRI_MONTHS[result.hijri_month - 1]} {result.hijri_year}H corresponds to{" "}
                  <strong className="bg-gradient-to-r from-gold-500 to-moon-500 bg-clip-text text-transparent">
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
