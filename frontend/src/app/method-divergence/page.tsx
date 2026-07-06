"use client";

import { useState } from "react";
import { GitCompareArrows } from "lucide-react";
import { HisabDisclaimer } from "@/components/HisabDisclaimer";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PageHeader } from "@/components/PageHeader";
import { LocationPicker } from "@/components/LocationPicker";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, inputClasses } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Table, TableColumn } from "@/components/ui/Table";
import {
  ApiError,
  fetchMethodDivergence,
  HilalMethod,
  MethodDivergenceMonth,
  MethodDivergenceResult,
} from "@/lib/api";
import { DEFAULT_CITY } from "@/lib/locations";

const METHODS: { key: HilalMethod; label: string }[] = [
  { key: "wujudul_hilal", label: "Wujudul Hilal" },
  { key: "mabims_2021", label: "MABIMS 2021" },
  { key: "odeh", label: "Odeh" },
];

export default function MethodDivergencePage() {
  const [hijriYear, setHijriYear] = useState(1446);
  const [lat, setLat] = useState(DEFAULT_CITY.lat);
  const [lon, setLon] = useState(DEFAULT_CITY.lon);
  const [result, setResult] = useState<MethodDivergenceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetchMethodDivergence({ hijri_year: hijriYear, lat, lon });
      setResult(r);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reach the Falak API.");
    } finally {
      setLoading(false);
    }
  }

  const columns: TableColumn<MethodDivergenceMonth>[] = [
    { key: "month", header: "Month", render: (m) => m.hijri_month_name },
    ...METHODS.map(({ key, label }): TableColumn<MethodDivergenceMonth> => ({
      key,
      header: label,
      render: (m) =>
        m.start_dates[key] ?? (
          <span className="text-neutral-400" title={m.errors?.[key]}>
            unresolved
          </span>
        ),
    })),
    {
      key: "diverges",
      header: "Diverges",
      render: (m) =>
        m.diverges === null ? (
          <Badge tone="neutral">unresolved</Badge>
        ) : m.diverges ? (
          <Badge tone="negative">Diverges</Badge>
        ) : (
          <Badge tone="positive">Agree</Badge>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={GitCompareArrows}
        title="Method Divergence"
        description="Do Wujudul Hilal, MABIMS 2021, and Odeh agree on when each Hijri month starts? See it across a whole year, not one date at a time."
      />

      <HisabDisclaimer />

      <Card className="p-5">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Hijri year">
            <input
              type="number"
              value={hijriYear}
              onChange={(e) => setHijriYear(Number(e.target.value))}
              className={inputClasses}
            />
          </Field>
          <LocationPicker lat={lat} lon={lon} onChange={(newLat, newLon) => { setLat(newLat); setLon(newLon); }} />
          <div className="sm:col-span-2">
            <Button type="submit" loading={loading}>
              {loading ? "Comparing…" : "Compare methods"}
            </Button>
          </div>
        </form>
      </Card>

      {error && <ErrorBanner message={error} />}

      {result && (
        <Card className="p-5">
          <Table columns={columns} rows={result.months} rowKey={(m) => String(m.hijri_month)} />
        </Card>
      )}
    </div>
  );
}
