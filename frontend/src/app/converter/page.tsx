"use client";

import { useState } from "react";
import { HisabDisclaimer } from "@/components/HisabDisclaimer";
import { CalculationPanel } from "@/components/CalculationPanel";
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

export default function ConverterPage() {
  const [direction, setDirection] = useState<"gregorian_to_hijri" | "hijri_to_gregorian">(
    "gregorian_to_hijri",
  );
  const [date, setDate] = useState("2024-04-09");
  const [hijriYear, setHijriYear] = useState(1445);
  const [hijriMonth, setHijriMonth] = useState(9);
  const [hijriDay, setHijriDay] = useState(1);
  const [result, setResult] = useState<ConvertResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      <div>
        <h1 className="text-xl font-semibold">Hijri ↔ Gregorian Converter</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          MABIMS-2021 method (Indonesia&apos;s current standard) — computed from real ijtimak + visibility, not a
          tabular lookup.
        </p>
      </div>

      <HisabDisclaimer />

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={direction === "gregorian_to_hijri"}
              onChange={() => setDirection("gregorian_to_hijri")}
            />
            Gregorian → Hijri
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={direction === "hijri_to_gregorian"}
              onChange={() => setDirection("hijri_to_gregorian")}
            />
            Hijri → Gregorian
          </label>
        </div>

        {direction === "gregorian_to_hijri" ? (
          <label className="block text-sm">
            Gregorian date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <label className="text-sm">
              Hijri year
              <input
                type="number"
                value={hijriYear}
                onChange={(e) => setHijriYear(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
              />
            </label>
            <label className="text-sm">
              Month
              <select
                value={hijriMonth}
                onChange={(e) => setHijriMonth(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
              >
                {HIJRI_MONTHS.map((name, i) => (
                  <option key={name} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Day
              <input
                type="number"
                min={1}
                max={30}
                value={hijriDay}
                onChange={(e) => setHijriDay(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
              />
            </label>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {loading ? "Converting…" : "Convert"}
        </button>
      </form>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          {result.direction === "gregorian_to_hijri" ? (
            <p className="text-lg">
              {result.input_date} corresponds to{" "}
              <strong>
                {result.hijri_day} {result.hijri_month_name} {result.hijri_year}H
              </strong>
            </p>
          ) : (
            <p className="text-lg">
              {result.hijri_day} {HIJRI_MONTHS[result.hijri_month - 1]} {result.hijri_year}H corresponds to{" "}
              <strong>{result.gregorian_date}</strong>
            </p>
          )}
          <CalculationPanel
            rows={[
              ["Method", result.method],
              ["Direction", result.direction],
            ]}
          />
        </div>
      )}
    </div>
  );
}
