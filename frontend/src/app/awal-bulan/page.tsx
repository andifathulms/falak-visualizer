"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { CriterionHistory } from "@/components/CriterionHistory";
import { ErrorBanner } from "@/components/ErrorBanner";
import { HisabDisclaimer } from "@/components/HisabDisclaimer";
import { HorizonInstrument } from "@/components/HorizonInstrument";
import { IndonesiaMap } from "@/components/awal-bulan/IndonesiaMap";
import { Setahun } from "@/components/awal-bulan/Setahun";
import { useObservation } from "@/components/ObservationProvider";
import { useHilalVisibility } from "@/components/useHilalVisibility";
import { useNow } from "@/components/useNow";
import { VerdictPill } from "@/components/VerdictPill";
import { CRITERIA, CRITERIA_ORDER, MODEL_CAVEATS_ID, marginText, verdictText, verdictTone } from "@/lib/criteria";
import { allThresholdBands, horizonReadingFromObservation } from "@/lib/instrumentGeometry";
import { daysBetween, formatPlainDate, parsePlainDate, type PlainDate } from "@/lib/falak/time";
import type { HilalMethod } from "@/lib/falak/visibility";
import { HIJRI_MONTHS_ID, hijriMonthArabic, hijriMonthName } from "@/lib/hijriNames";
import { formatClock, formatClockIso, formatLongDate, todayIsoIn, zoneAbbreviation } from "@/lib/localDate";
import { hijriToday, monthOutlook, nextHijriMonth, KEY_MONTHS } from "@/lib/monthOutlook";
import { gregorianToHijri } from "@/lib/falak/converter";
import { readQueryParams, writeQueryParams } from "@/lib/permalink";
import { cn } from "@/lib/cn";

type View = "petang" | "indonesia" | "setahun";

const VIEWS: Array<{ key: View; label: string; hint: string }> = [
  { key: "petang", label: "Petang penentu", hint: "satu tempat, satu petang" },
  { key: "indonesia", label: "Se-Indonesia", hint: "satu petang, semua tempat" },
  { key: "setahun", label: "Setahun", hint: "satu tempat, dua belas petang" },
];

function longDate(d: PlainDate): string {
  return formatLongDate(formatPlainDate(d));
}

/**
 * /awal-bulan (DESIGN.md v2 §6): "when does this Hijri month start, per
 * criterion, and why?" The reader picks a MONTH, not a date - the page finds
 * its ijtimak and the deciding evening itself - and gets the answer as a
 * sentence, then the evidence (the sky at sunset with a scrubber, the numbers,
 * each criterion's verdict and who uses it), then the Indonesia map and the
 * year. Explanations live in Belajar, one "Kenapa?" away.
 *
 * URL state: ?bulan=1448-9&tampilan=petang|indonesia|setahun&kriteria=... so a
 * shared link reproduces the view. Old /hilal links (?sweep=&method=) still land
 * on the right view.
 */
export default function AwalBulanPage() {
  const { lat, lon, timeZone, matchedCity } = useObservation();
  const now = useNow(60_000);
  const zone = zoneAbbreviation(timeZone);

  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [view, setView] = useState<View>("petang");
  const [method, setMethod] = useState<HilalMethod>("mabims_2021");
  const [pickerOpen, setPickerOpen] = useState(false);

  // Read the permalink once.
  useEffect(() => {
    const q = readQueryParams();
    const bulan = /^(\d{4})-(\d{1,2})$/.exec(q.get("bulan") ?? "");
    if (bulan) setSelected([Number(bulan[1]), Number(bulan[2])]);
    else if (q.get("sweep") && q.get("d")) {
      // An old /hilal-era link names an EVENING, not a month: open the month
      // that evening could start (late in a Hijri month -> the next one).
      try {
        const h = gregorianToHijri(parsePlainDate(q.get("d")!), lat, lon);
        setSelected(h.day >= 25 ? nextHijriMonth(h.year, h.month) : [h.year, h.month]);
      } catch {
        // Out of range: fall back to the default month rather than guess.
      }
    }
    const v = q.get("tampilan") ?? q.get("sweep");
    if (v === "petang" || v === "indonesia" || v === "setahun") setView(v);
    const k = q.get("kriteria") ?? q.get("method");
    if (k === "mabims_2021" || k === "wujudul_hilal" || k === "odeh") setMethod(k);
    // Read once on mount. lat/lon may still be the provider's default here;
    // which month an evening belongs to does not depend on the place in practice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = useMemo(() => (now === null ? null : parsePlainDate(todayIsoIn(timeZone))), [now === null, timeZone]); // eslint-disable-line react-hooks/exhaustive-deps
  const current = useMemo(() => {
    if (!today) return null;
    const h = hijriToday(today, lat, lon);
    return "date" in h ? h.date : null;
  }, [today, lat, lon]);

  // Default month: the next one to start.
  const active: [number, number] | null = selected ?? (current ? nextHijriMonth(current.year, current.month) : null);

  useEffect(() => {
    if (!active) return;
    writeQueryParams({
      bulan: `${active[0]}-${active[1]}`,
      tampilan: view,
      kriteria: method === "mabims_2021" ? undefined : method,
      sweep: undefined,
      method: undefined,
    });
  }, [active?.[0], active?.[1], view, method]); // eslint-disable-line react-hooks/exhaustive-deps

  const outlook = useMemo(() => (active ? monthOutlook(active[0], active[1], lat, lon) : null), [active?.[0], active?.[1], lat, lon]); // eslint-disable-line react-hooks/exhaustive-deps
  const eveningIso = outlook?.deciding ? formatPlainDate(outlook.deciding.date) : null;
  const { obs, error: obsError } = useHilalVisibility(eveningIso ?? "2000-01-01", lat, lon);
  const evening = eveningIso && obs && obs.date === eveningIso ? obs : null;

  // Chips: the next month, then the next Ramadan, Syawal, Zulhijah.
  const chips = useMemo(() => {
    if (!current) return [];
    const out: Array<{ y: number; m: number; note: string }> = [];
    const [ny, nm] = nextHijriMonth(current.year, current.month);
    out.push({ y: ny, m: nm, note: "berikutnya" });
    for (const year of [current.year, current.year + 1]) {
      for (const m of KEY_MONTHS) {
        if ((year > current.year || m > current.month) && !(year === ny && m === nm) && out.length < 4) {
          out.push({ y: year, m, note: m === 9 ? "puasa" : m === 10 ? "Idulfitri" : "Iduladha" });
        }
      }
    }
    return out;
  }, [current]);

  const mabimsStart = outlook?.starts.mabims_2021;
  const sunsetUs = evening ? new Date(evening.sunset_time_utc).getTime() * 1000 : null;

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div>
          <p className="text-2xs font-bold uppercase tracking-[0.14em] text-accent">Awal bulan Hijriah · {matchedCity?.name ?? "lokasi Anda"}</p>
          <h1 className="mt-1 text-[1.9rem] font-extrabold leading-tight tracking-tight sm:text-4xl">
            {active ? (
              <>
                Kapan 1 {hijriMonthName(active[1])} {active[0]}?{" "}
                <span lang="ar" dir="rtl" className="font-arab text-[0.8em] font-normal text-moon">
                  {hijriMonthArabic(active[1])}
                </span>
              </>
            ) : (
              "Awal bulan"
            )}
          </h1>
        </div>

        {/* Month chips. */}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {chips.map((c) => {
            const on = active?.[0] === c.y && active?.[1] === c.m;
            return (
              <button
                key={`${c.y}-${c.m}`}
                type="button"
                onClick={() => setSelected([c.y, c.m])}
                aria-pressed={on}
                className={cn(
                  "shrink-0 rounded-control border px-3.5 py-2 text-left transition-colors duration-fast",
                  on ? "border-accent-solid bg-accent-solid text-accent-on-solid" : "border-border bg-surface-card hover:border-border-strong",
                )}
              >
                <span className="block text-sm font-bold">
                  {hijriMonthName(c.m)} {c.y}
                </span>
                <span className={cn("block text-2xs", on ? "opacity-80" : "text-ink-muted")}>{c.note}</span>
              </button>
            );
          })}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              aria-expanded={pickerOpen}
              className="flex h-full items-center gap-1.5 rounded-control border border-dashed border-border-strong px-3.5 py-2 text-sm font-bold text-ink-muted hover:text-ink"
            >
              Bulan lain <ChevronDown className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        {pickerOpen && active && (
          <div className="card flex flex-wrap items-end gap-3 p-4">
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-ink-muted">Bulan</span>
              <select
                value={active[1]}
                onChange={(e) => setSelected([active[0], Number(e.target.value)])}
                className="h-10 rounded-control border border-border bg-surface-page px-3 text-sm"
              >
                {HIJRI_MONTHS_ID.map((name, i) => (
                  <option key={name} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-ink-muted">Tahun (H)</span>
              <input
                type="number"
                min={1320}
                max={1520}
                value={active[0]}
                onChange={(e) => e.target.value && setSelected([Number(e.target.value), active[1]])}
                className="h-10 w-28 rounded-control border border-border bg-surface-page px-3 text-sm"
              />
            </label>
          </div>
        )}
      </header>

      {outlook && Object.keys(outlook.errors).length > 0 && (
        <ErrorBanner
          message="Sebagian perhitungan untuk bulan ini tidak bisa diselesaikan; kriteria yang terdampak ditandai dan tidak diberi tanggal."
          detail={Object.entries(outlook.errors)
            .map(([k, v]) => `${k}: ${v}`)
            .join(" · ")}
        />
      )}

      {/* Layer 1: the answer. */}
      {outlook && mabimsStart && (
        <section className="space-y-4" aria-label="Jawaban">
          <p className="max-w-3xl font-display text-[1.7rem] leading-snug sm:text-[2.1rem]">
            Menurut MABIMS 2021, <span className="text-accent">1 {hijriMonthName(outlook.hijriMonth)} {outlook.hijriYear}</span> jatuh{" "}
            {longDate(mabimsStart)}.
            {today && daysBetween(today, mabimsStart) > 0 && (
              <span className="text-ink-muted"> {daysBetween(today, mabimsStart)} hari lagi.</span>
            )}
          </p>
          <ol className="grid gap-3 sm:grid-cols-3">
            <li className="card p-4">
              <p className="text-2xs font-bold uppercase tracking-[0.12em] text-verdict-margin">1 · Ijtimak</p>
              <p className="mt-1 font-bold">
                {formatLongDate(new Date(outlook.conjunction / 1000).toLocaleDateString("en-CA", { timeZone: timeZone ?? undefined }))}
              </p>
              <p className="text-sm text-ink-muted">
                pukul {formatClock(outlook.conjunction, timeZone)} {zone}
              </p>
            </li>
            <li className="card p-4">
              <p className="text-2xs font-bold uppercase tracking-[0.12em] text-sun">2 · Petang penentu</p>
              <p className="mt-1 font-bold">{outlook.deciding ? longDate(outlook.deciding.date) : "—"}</p>
              <p className="text-sm text-ink-muted">
                matahari terbenam {evening ? `${formatClockIso(evening.sunset_time_utc, timeZone)} ${zone}` : "…"}
              </p>
            </li>
            <li className="card p-4">
              <p className="text-2xs font-bold uppercase tracking-[0.12em] text-verdict-lit">3 · Tanggal 1</p>
              <p className="mt-1 font-bold">{longDate(mabimsStart)}</p>
              <p className="text-sm text-ink-muted">
                {outlook.unanimous ? "ketiga kriteria sepakat" : "kriteria berbeda — lihat di bawah"}
              </p>
            </li>
          </ol>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <HisabDisclaimer />
            <CopyLinkButton />
          </div>
        </section>
      )}

      {/* Views. */}
      <div role="tablist" aria-label="Tampilan" className="flex gap-1 overflow-x-auto rounded-full bg-surface-raised p-1 sm:inline-flex">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            role="tab"
            aria-selected={view === v.key}
            onClick={() => setView(v.key)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-left transition-colors duration-fast",
              view === v.key ? "bg-surface-card shadow-sm" : "text-ink-muted hover:text-ink",
            )}
          >
            <span className="block text-sm font-bold">{v.label}</span>
            <span className="hidden text-2xs text-ink-muted sm:block">{v.hint}</span>
          </button>
        ))}
      </div>

      {view !== "petang" && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-ink-muted">Kriteria:</span>
          {CRITERIA_ORDER.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setMethod(k)}
              aria-pressed={method === k}
              className={cn(
                "rounded-full border px-3 py-1.5 font-semibold",
                method === k ? "border-accent-solid bg-accent-solid/15 text-accent" : "border-border text-ink-muted hover:text-ink",
              )}
            >
              {CRITERIA[k].name}
            </button>
          ))}
        </div>
      )}

      {view === "petang" && outlook && (
        <div className="space-y-6">
          {obsError && <ErrorBanner message="Langit petang penentu tidak bisa dihitung untuk lokasi ini." detail={obsError} />}
          {evening && (
            <>
              <section aria-label="Langit saat matahari terbenam" className="-mx-4 sm:mx-0">
                <div className="hidden sm:block">
                  <HorizonInstrument
                  reading={horizonReadingFromObservation(evening)}
                  bands={allThresholdBands(evening.crescent_width_arcmin)}
                  trajectory={evening.trajectory}
                  sunsetClock={(m) => (sunsetUs === null ? "" : formatClock(sunsetUs + Math.round(m * 60) * 1_000_000, timeZone))}
                  viewport={{ width: 760, height: 360 }}
                  verdictSentence={`Langit barat ${matchedCity?.name ?? ""} saat matahari terbenam, ${longDate(parsePlainDate(evening.date))}: tinggi bulan ${evening.moon_altitude_deg.toFixed(2)} derajat, elongasi ${evening.elongation_deg.toFixed(2)} derajat.`}
                  className="[&>dl]:px-4 sm:[&>dl]:px-0 [&>p]:px-4 sm:[&>p]:px-0"
                />
                </div>
                <div className="sm:hidden">
                  <HorizonInstrument
                  reading={horizonReadingFromObservation(evening)}
                  bands={allThresholdBands(evening.crescent_width_arcmin)}
                  trajectory={evening.trajectory}
                  sunsetClock={(m) => (sunsetUs === null ? "" : formatClock(sunsetUs + Math.round(m * 60) * 1_000_000, timeZone))}
                  viewport={{ width: 420, height: 340 }}
                  verdictSentence={`Langit barat ${matchedCity?.name ?? ""} saat matahari terbenam, ${longDate(parsePlainDate(evening.date))}: tinggi bulan ${evening.moon_altitude_deg.toFixed(2)} derajat, elongasi ${evening.elongation_deg.toFixed(2)} derajat.`}
                  className="[&>dl]:px-4 sm:[&>dl]:px-0 [&>p]:px-4 sm:[&>p]:px-0"
                />
                </div>
              </section>

              <section aria-label="Hasil tiap kriteria" className="grid gap-4 lg:grid-cols-3">
                {CRITERIA_ORDER.map((k) => {
                  const info = CRITERIA[k];
                  const verdict = evening.criteria[k];
                  const start = outlook.starts[k];
                  const margin = evening.margins?.[k];
                  const differs = start && mabimsStart && daysBetween(mabimsStart, start) !== 0;
                  return (
                    <article key={k} className={cn("card flex flex-col gap-3 p-5", k === "mabims_2021" && "ring-2 ring-verdict-lit/40")}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold">{info.name}</h3>
                          <p className="text-2xs text-ink-muted">
                            {info.who}
                            {info.whoUnsourced && <span className="ml-1 rounded bg-surface-raised px-1 py-0.5">rujukan belum diverifikasi</span>}
                          </p>
                        </div>
                        <VerdictPill tone={margin?.verdict === "indeterminate" ? "margin" : verdictTone(k, verdict)}>
                          {margin?.verdict === "indeterminate" ? "Belum pasti" : verdictText(k, verdict)}
                        </VerdictPill>
                      </div>
                      <div>
                        <p className="text-2xs font-semibold text-ink-muted">1 {hijriMonthName(outlook.hijriMonth)} menurut kriteria ini</p>
                        <p className={cn("font-display text-xl leading-snug", differs && "text-verdict-margin")}>{start ? longDate(start) : "—"}</p>
                      </div>
                      <p className="text-sm">{info.rule}</p>
                      {margin && <p className="text-sm text-ink-muted">Petang ini: {marginText(k, margin)}.</p>}
                      {info.note && <p className="rounded-control bg-surface-raised px-3 py-2 text-xs text-ink-muted">{info.note}</p>}
                      <Link href={`/belajar#kriteria-${k}`} className="mt-auto inline-flex items-center gap-1 text-sm font-bold text-accent hover:underline">
                        Kenapa kriteria ini? <ArrowRight className="size-3.5" aria-hidden="true" />
                      </Link>
                    </article>
                  );
                })}
              </section>
              <p className="text-sm text-ink-muted">
                Ketiga kriteria bisa berbeda hasil — itu wajar, bukan kesalahan. Falak tidak memihak satu kriteria; tanggal utama memakai MABIMS
                2021 karena itulah yang dipakai sidang isbat.
              </p>

              <CriterionHistory obs={evening} />

              <div className="grid gap-4 lg:grid-cols-2">
                <details className="card px-5 py-4 text-sm">
                  <summary className="cursor-pointer font-bold">Batasan model ({MODEL_CAVEATS_ID.length})</summary>
                  <dl className="mt-3 space-y-3">
                    {MODEL_CAVEATS_ID.map((c) => (
                      <div key={c.title}>
                        <dt className="font-semibold">{c.title}</dt>
                        <dd className="text-ink-muted">{c.detail}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
                <details className="card px-5 py-4 text-sm">
                  <summary className="cursor-pointer font-bold">Lintasan sekitar terbenam ({evening.trajectory.length} sampel)</summary>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left text-sm tabular-nums">
                      <caption className="sr-only">Tinggi bulan dan elongasi tiap lima menit di sekitar matahari terbenam.</caption>
                      <thead className="text-2xs uppercase tracking-wider text-ink-muted">
                        <tr>
                          <th scope="col" className="py-1.5 pr-3">Menit</th>
                          <th scope="col" className="py-1.5 pr-3 text-right">Tinggi bulan</th>
                          <th scope="col" className="py-1.5 pr-3 text-right">Matahari</th>
                          <th scope="col" className="py-1.5 text-right">Elongasi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {evening.trajectory.map((p) => (
                          <tr key={p.minutes_from_sunset} className={cn("border-t border-border/70", p.minutes_from_sunset === 0 && "font-bold")}>
                            <th scope="row" className="py-1.5 pr-3 font-normal">
                              {p.minutes_from_sunset > 0 ? "+" : ""}
                              {p.minutes_from_sunset}
                            </th>
                            <td className="py-1.5 pr-3 text-right">{p.moon_altitude_deg.toFixed(2).replace(".", ",")}°</td>
                            <td className="py-1.5 pr-3 text-right">{p.sun_altitude_deg.toFixed(2).replace(".", ",")}°</td>
                            <td className="py-1.5 text-right">{p.elongation_deg.toFixed(2).replace(".", ",")}°</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </div>
            </>
          )}
        </div>
      )}

      {view === "indonesia" && eveningIso && <IndonesiaMap eveningIso={eveningIso} method={method} />}

      {view === "setahun" && active && (
        <Setahun
          hijriYear={active[0]}
          method={method}
          lat={lat}
          lon={lon}
          selectedMonth={active[1]}
          onSelect={(m) => {
            setSelected([active[0], m]);
            setView("petang");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}
    </div>
  );
}
