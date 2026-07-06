"use client";

import { useState } from "react";
import { History, Search } from "lucide-react";
import { HisabDisclaimer } from "@/components/HisabDisclaimer";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, inputClasses } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Table, TableColumn } from "@/components/ui/Table";
import { ApiError, fetchIsbatAccuracy, HilalMethod, IsbatAccuracyResult, IsbatComparisonRecord } from "@/lib/api";

const METHODS: { key: HilalMethod; label: string }[] = [
  { key: "wujudul_hilal", label: "Wujudul Hilal" },
  { key: "mabims_2021", label: "MABIMS 2021" },
  { key: "odeh", label: "Odeh" },
];

function MatchCell({ record, method }: { record: IsbatComparisonRecord; method: HilalMethod }) {
  const predicted = record.predicted[method];
  const match = record.matches[method];
  if (predicted === undefined) {
    return (
      <span className="text-neutral-400" title={record.errors[method]}>
        unresolved
      </span>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs">{predicted}</span>
      <Badge tone={match ? "positive" : "negative"}>{match ? "Match" : "Mismatch"}</Badge>
    </div>
  );
}

export default function IsbatAccuracyPage() {
  const [hijriYear, setHijriYear] = useState("");
  const [result, setResult] = useState<IsbatAccuracyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const r = await fetchIsbatAccuracy(hijriYear ? { hijri_year: Number(hijriYear) } : {});
      setResult(r);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reach the Falak API.");
    } finally {
      setLoading(false);
    }
  }

  const columns: TableColumn<IsbatComparisonRecord>[] = [
    {
      key: "month",
      header: "Month",
      render: (r) => `${r.hijri_month_name} ${r.hijri_year}H`,
    },
    { key: "actual", header: "Actual (Kemenag)", render: (r) => r.actual_start_date },
    ...METHODS.map(({ key, label }): TableColumn<IsbatComparisonRecord> => ({
      key,
      header: label,
      render: (r) => <MatchCell record={r} method={key} />,
    })),
    {
      key: "source",
      header: "Source",
      className: "max-w-xs whitespace-normal text-xs text-neutral-500 dark:text-neutral-400",
      render: (r) => (
        <div className="flex flex-col gap-1">
          <span>{r.source_note}</span>
          {!r.verified && <Badge tone="neutral">Unverified</Badge>}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={History}
        title="Isbat Accuracy"
        description="How often does each hisab method match the real Kemenag sidang isbat announcement? Compared against actual historical records, not this app's own engine."
      />

      <HisabDisclaimer />

      <div className="flex gap-3 rounded-xl border border-red-300/50 bg-red-500/[0.05] px-4 py-3 text-sm text-red-700 dark:border-red-800/50 dark:text-red-300">
        Records marked <Badge tone="neutral">Unverified</Badge> have not yet been confirmed against a primary
        Kemenag source and should not be treated as confirmed historical fact.
      </div>

      <Card className="p-5">
        <form onSubmit={load} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-4">
          <Field label="Hijri year (optional)">
            <input
              type="number"
              placeholder="All years"
              value={hijriYear}
              onChange={(e) => setHijriYear(e.target.value)}
              className={inputClasses}
            />
          </Field>
          <div className="sm:col-span-3">
            <Button type="submit" loading={loading}>
              {!loading && <Search className="size-4" />}
              {loading ? "Loading…" : "Load records"}
            </Button>
          </div>
        </form>
      </Card>

      {error && <ErrorBanner message={error} />}

      {result && result.records.length === 0 && (
        <Card className="p-5 text-center text-sm text-neutral-500 dark:text-neutral-400">
          No isbat records seeded yet.
        </Card>
      )}

      {result && result.records.length > 0 && (
        <Card className="p-5">
          <Table
            columns={columns}
            rows={result.records}
            rowKey={(r) => `${r.hijri_year}-${r.hijri_month}`}
          />
        </Card>
      )}
    </div>
  );
}
