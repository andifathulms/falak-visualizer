"use client";

import { useState } from "react";
import { FileWarning, History, Search } from "lucide-react";
import { HisabDisclaimer } from "@/components/HisabDisclaimer";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, inputClasses } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Table, TableColumn } from "@/components/ui/Table";
import { ISBAT_RECORDS } from "@/lib/falak/isbat";
import { ApiError, fetchIsbatAccuracy, HilalMethod, IsbatAccuracyResult, IsbatComparisonRecord } from "@/lib/api";
import { ResultAnnouncer } from "@/components/ResultAnnouncer";

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
<span className="text-ink-muted">
        unresolved
        {record.errors[method] ? <span className="mt-0.5 block text-2xs">{record.errors[method]}</span> : null}
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

/** Distinct Hijri years present in the seeded record list, ascending. */
// Array.from rather than spreading the Set: the project targets a JS level
// below the one that allows iterating a Set with spread, and widening the
// tsconfig target for a cosmetic line would be a config change smuggled into a
// presentation pass.
const SEEDED_YEARS = Array.from(new Set(ISBAT_RECORDS.map((r) => r.hijriYear))).sort((a, b) => a - b);

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
      setError(err instanceof ApiError ? err.message : "The calculation failed unexpectedly.");
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
      className: "max-w-xs whitespace-normal text-sm text-ink-muted",
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
      <ResultAnnouncer message={result ? `${result.count} isbat ${result.count === 1 ? "record" : "records"} loaded.` : null} />
      <PageHeader
        icon={History}
        title="Isbat Accuracy"
        description="How often does each hisab method match the real Kemenag sidang isbat announcement? Compared against actual historical records, not this app's own engine. Predictions are evaluated for Jakarta; sidang isbat is a national determination, so a criterion can miss simply because the deciding evening looked different elsewhere in the archipelago — and because isbat can weigh rukyat testimony no calculation anticipates."
      />

      <HisabDisclaimer />

      {/* Informational, not an error. Every seeded record is currently
          unverified, so a red alarm would put the whole dataset under a banner
          reading "this is broken" when what it actually says is "the
          provenance has not been double-checked yet" - and a warning that is
          always on is a warning readers learn to skip. Matches the hisab
          disclaimer's register, which is the same kind of caveat. */}
      <div className="flex gap-3 rounded-xl border border-gold-500/30 bg-gold-500/[0.07] px-4 py-3 text-sm">
        <FileWarning className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={2} />
        <p>
          Records marked <Badge tone="indeterminate">Unverified</Badge> carry a citation to a primary Kemenag
          press release, but a maintainer has not yet opened it and confirmed the date. Treat them as sourced,
          not as confirmed historical fact.
        </p>
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

      {/* This used to read "No isbat records seeded yet", which was true when the
          list was empty and is now misleading: the only way to reach this branch
          is to filter to a year that has none, and the message told the reader
          the app was unfinished instead. The available years are derived from
          the record list rather than written out, so they cannot go stale as
          rows are added. */}
      {result && result.records.length === 0 && (
        <Card className="p-5 text-center text-sm text-ink-muted">
          {SEEDED_YEARS.length === 0 ? (
            <>No isbat records have been seeded yet.</>
          ) : (
            <>
              No sidang isbat record for {hijriYear || "that year"}. Records are currently seeded for{" "}
              <span className="font-medium text-foreground">{SEEDED_YEARS.join(", ")} H</span> — clear the year
              field to see all of them.
            </>
          )}
        </Card>
      )}

      {result && result.records.length > 0 && (
        <Card className="p-5">
          <Table
            columns={columns}
            rows={result.records}
            caption="Announced sidang isbat dates compared against what each hisab criterion predicts, evaluated for Jakarta."
            rowKey={(r) => `${r.hijri_year}-${r.hijri_month}`}
          />
        </Card>
      )}
    </div>
  );
}
