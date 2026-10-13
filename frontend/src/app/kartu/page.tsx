"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CircleAlert, Copy, Download, ExternalLink, TriangleAlert } from "lucide-react";
import type { Warning } from "carousel-core";
import { ErrorBanner } from "@/components/ErrorBanner";
import { HisabDisclaimer } from "@/components/HisabDisclaimer";
import { Button } from "@/components/ui/Button";
import { Field, inputClasses } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { useCarouselCore } from "@/components/kartu/useCarouselCore";
import { useDeckPreview } from "@/components/kartu/useDeckPreview";
import { MONTH_OR_CRITERIA_SERIES, type CardDeck, type Series } from "@/lib/cards/deck";
import { HISAB_DISCLAIMER, ruleViolations } from "@/lib/cards/rules";
import { KAMUS_ENTRIES } from "@/lib/cards/series/kamusFalak";
import {
  SERIES,
  TEN_CITIES,
  buildSelection,
  defaultSelection,
  hijriMonthOptions,
  rashdulOptions,
  todayPlainDate,
  type Option,
  type Selection,
} from "@/lib/cards/selection";
import { cn } from "@/lib/cn";
import { todayIsoIn } from "@/lib/localDate";
import { INDONESIAN_CITIES } from "@/lib/locations";

const CAROUSEL_PRESS_URL = "https://andifathulms.github.io/carousel-press/";

/** [start, end) character offsets of a 0-based line in `text`. */
function lineRange(text: string, line: number): [number, number] {
  let start = 0;
  for (let i = 0; i < line; i += 1) {
    const next = text.indexOf("\n", start);
    if (next === -1) return [text.length, text.length];
    start = next + 1;
  }
  const end = text.indexOf("\n", start);
  return [start, end === -1 ? text.length : end];
}

function SlideCanvas({ bitmap, className, label }: { bitmap: ImageBitmap; className?: string; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (ctx) ctx.drawImage(bitmap, 0, 0);
  }, [bitmap]);
  return <canvas ref={ref} width={bitmap.width} height={bitmap.height} className={className} role="img" aria-label={label} />;
}

/**
 * /kartu - "Buat kartu TikTok". Pick a series and its inputs, the engine
 * runs, a builder in lib/cards writes the deck, and carousel-core renders it
 * with the falak-malam variant. Numbers are never typed here: the deck text is
 * editable for wording, but every value in it came from the engine, and the
 * house rules (lib/cards/rules.ts) are re-checked on every edit.
 */
export default function KartuPage() {
  const core = useCarouselCore();
  const ready = core.status === "ready" ? core : null;

  // Dates depend on the reader's clock, so they are set after mount - the
  // static export prerenders this page at build time.
  const [clock, setClock] = useState<{ todayIso: string; nowUs: number } | null>(null);
  const [sel, setSel] = useState<Selection | null>(null);
  const [built, setBuilt] = useState<CardDeck | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [computing, setComputing] = useState(false);
  const [text, setText] = useState("");
  const [current, setCurrent] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportWarnings, setExportWarnings] = useState<Warning[]>([]);
  const [exportError, setExportError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const editor = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const todayIso = todayIsoIn("Asia/Jakarta");
    const nowUs = Date.now() * 1000;
    setClock({ todayIso, nowUs });
    try {
      setSel(defaultSelection(todayPlainDate(todayIso), nowUs));
    } catch (error) {
      setBuildError(error instanceof Error ? error.message : String(error));
    }
  }, []);

  const today = clock ? todayPlainDate(clock.todayIso) : null;
  const monthOptions: Option[] = useMemo(() => (today ? hijriMonthOptions(today) : []), [clock]); // eslint-disable-line react-hooks/exhaustive-deps
  const rashdulOpts: Option[] = useMemo(() => (clock && today ? rashdulOptions(clock.nowUs, today.year) : []), [clock]); // eslint-disable-line react-hooks/exhaustive-deps

  // Run the engine and the builder whenever the selection changes.
  useEffect(() => {
    if (!sel || !today) return;
    setComputing(true);
    const timer = window.setTimeout(() => {
      try {
        const deck = buildSelection(sel, today);
        setBuilt(deck);
        setText(deck.text);
        setBuildError(null);
      } catch (error) {
        setBuilt(null);
        setText("");
        setBuildError(error instanceof Error ? error.message : String(error));
      } finally {
        setComputing(false);
        setCurrent(0);
        setExportWarnings([]);
        setExportError(null);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [sel]); // eslint-disable-line react-hooks/exhaustive-deps

  const preview = useDeckPreview(ready?.core ?? null, text);
  const slideCount = preview.slides.length;
  const shown = Math.min(current, Math.max(0, slideCount - 1));

  // The rules apply to edits too: the builder wrote a compliant deck, and an
  // edit cannot take the disclaimer out or put a forbidden phrase in.
  const ruleProblems = useMemo(() => {
    const out = ruleViolations(text).map((v) => `Aturan kartu: ${v}`);
    if (built && MONTH_OR_CRITERIA_SERIES.has(built.series) && !text.includes(HISAB_DISCLAIMER)) {
      out.push(`Kalimat penafian hisab wajib ada, persis: "${HISAB_DISCLAIMER}"`);
    }
    return out;
  }, [text, built]);

  const engineBlocking = built?.blocking ?? [];
  const blockingCount = preview.warnings.filter((w) => ready?.core.isBlocking(w)).length;
  const canExport = !!ready && !!preview.deck && !computing && !preview.busy && engineBlocking.length === 0 && ruleProblems.length === 0;

  function update(patch: Partial<Selection>) {
    setSel((s) => (s ? { ...s, ...patch } : s));
  }

  function jumpToLine(line: number) {
    const el = editor.current;
    if (!el) return;
    const [start, end] = lineRange(text, line);
    el.focus();
    el.setSelectionRange(start, end);
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 20;
    el.scrollTop = Math.max(0, line * lineHeight - el.clientHeight / 3);
  }

  async function copy(value: string, what: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(`${what} disalin.`);
    } catch {
      setNotice(`${what} tidak bisa disalin otomatis; pilih teksnya dan salin manual.`);
    }
    window.setTimeout(() => setNotice(null), 2500);
  }

  async function exportZip() {
    if (!ready || !preview.deck) return;
    setExporting(true);
    setExportWarnings([]);
    setExportError(null);
    try {
      const blobs = await ready.core.renderDeck(text);
      const zip = await ready.zip.exportZip(blobs, preview.deck.slug);
      ready.zip.downloadBlob(zip, `${preview.deck.slug}.zip`);
    } catch (error) {
      if (error instanceof ready.core.BlockingWarningsError) setExportWarnings(error.warnings);
      else setExportError(error instanceof Error ? error.message : String(error));
    } finally {
      setExporting(false);
    }
  }

  const seriesInfo = SERIES.find((s) => s.key === sel?.series);
  const usesMonth = sel?.series === "petang-penentu" || sel?.series === "angka-di-balik-hilal";
  const cityOptions: Option[] = [
    ...(seriesInfo?.cities === "ten-or-one" ? [{ value: TEN_CITIES, label: "10 kota (rotasi akun)" }] : []),
    ...INDONESIAN_CITIES.map((c) => ({ value: c.name, label: c.name })),
  ];
  const caption = preview.deck?.caption || built?.caption || "";
  const allWarnings = [...preview.warnings, ...exportWarnings].filter(
    (w, i, all) => all.findIndex((x) => x.code === w.code && x.line === w.line && x.message === w.message) === i,
  );

  return (
    <div className="space-y-6">
      <header>
        <p className="text-2xs font-bold uppercase tracking-[0.14em] text-accent">Alat pembuat konten</p>
        <h1 className="mt-1 text-[1.9rem] font-extrabold leading-tight tracking-tight sm:text-4xl">Buat kartu TikTok</h1>
        <p className="mt-2 max-w-2xl text-ink-muted">
          Kartu 1080×1920 dari hitungan Falak sendiri. Angka tidak diketik: teks kartu ditulis dari keluaran mesin, dan aturan
          penulisannya diperiksa ulang setiap kali teks diubah.
        </p>
        <div className="mt-3">
          <HisabDisclaimer />
        </div>
      </header>

      {core.status === "error" && <ErrorBanner message={core.message} detail={core.detail} />}

      <div className="grid gap-5 lg:grid-cols-[16rem_minmax(0,1fr)_19rem]">
        {/* ---- left: what to make ---- */}
        <section className="card space-y-4 p-4" aria-label="Pilih seri kartu">
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-ink-muted">Seri</legend>
            <div className="space-y-1">
              {SERIES.map((s) => (
                <label
                  key={s.key}
                  className={cn(
                    "flex cursor-pointer flex-col rounded-control border px-3 py-2 text-sm",
                    sel?.series === s.key ? "border-accent-solid bg-accent-solid/10" : "border-border hover:bg-surface-raised",
                  )}
                >
                  <span className="flex items-center gap-2 font-semibold">
                    <input
                      type="radio"
                      name="series"
                      className="accent-[var(--accent-solid)]"
                      checked={sel?.series === s.key}
                      onChange={() => update({ series: s.key as Series, ...(s.cities === "one" && sel?.city === TEN_CITIES ? { city: "Jakarta" } : {}) })}
                    />
                    {s.label}
                  </span>
                  {sel?.series === s.key && <span className="mt-1 text-xs text-ink-muted">{s.hint}</span>}
                </label>
              ))}
            </div>
          </fieldset>

          {sel && usesMonth && (
            <Select label="Bulan hijriah" value={sel.hijriMonth} onChange={(v) => update({ hijriMonth: v })} options={monthOptions} />
          )}
          {sel && sel.series === "kiblat-sore-ini" && (
            rashdulOpts.length ? (
              <Select label="Rashdul Kiblat" value={sel.rashdul} onChange={(v) => update({ rashdul: v })} options={rashdulOpts} />
            ) : (
              <p className="text-sm text-ink-muted">Jadwal Rashdul Kiblat tidak dapat dihitung.</p>
            )
          )}
          {sel && seriesInfo?.cities !== "none" && (
            <Select label="Kota" value={sel.city} onChange={(v) => update({ city: v })} options={cityOptions} />
          )}
          {sel && sel.series === "kamus-falak" && (
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-ink-muted">Kata</legend>
              {KAMUS_ENTRIES.map((e) => (
                <label key={e.word} className="flex items-center gap-2 py-0.5 text-sm">
                  <input
                    type="checkbox"
                    className="accent-[var(--accent-solid)]"
                    checked={sel.words.includes(e.word)}
                    onChange={(ev) =>
                      update({ words: ev.target.checked ? [...sel.words, e.word] : sel.words.filter((w) => w !== e.word) })
                    }
                  />
                  {e.word}
                </label>
              ))}
            </fieldset>
          )}
          {sel && (
            <Field label="Handle akun (opsional)">
              <input
                className={inputClasses}
                value={sel.handle}
                placeholder="@akun"
                onChange={(e) => update({ handle: e.target.value })}
              />
            </Field>
          )}
          {usesMonth && (
            <p className="text-xs text-ink-muted">
              Angka lengkapnya ada di <Link href="/awal-bulan" className="underline">Awal Bulan</Link>, di bawah &ldquo;Lihat perhitungan&rdquo;.
            </p>
          )}
        </section>

        {/* ---- middle: the deck text ---- */}
        <section className="card flex min-w-0 flex-col gap-3 p-4" aria-label="Teks deck">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Teks deck</h2>
            <span className="text-xs text-ink-muted">{computing ? "Menghitung…" : preview.busy ? "Memperbarui pratinjau…" : `${slideCount} slide`}</span>
          </div>
          {buildError && <ErrorBanner message="Kartu tidak dapat dihitung untuk pilihan ini." detail={buildError} />}
          <textarea
            ref={editor}
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            className="min-h-[28rem] w-full flex-1 resize-y rounded-control border border-border bg-surface-raised p-3 font-mono text-xs leading-5 text-ink"
            aria-label="Teks deck carousel"
          />

          <div aria-live="polite" className="space-y-2">
            {[...engineBlocking, ...ruleProblems].map((m) => (
              <div key={m} className="flex items-start gap-2 rounded-control border border-verdict-dark/40 bg-verdict-dark/10 px-3 py-2 text-sm">
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-verdict-dark" aria-hidden="true" />
                <span>{m}</span>
              </div>
            ))}
            {exportError && <ErrorBanner message="Ekspor gagal; tidak ada berkas yang dibuat." detail={exportError} />}
            {preview.error && <ErrorBanner message="Pratinjau gagal." detail={preview.error} />}
            {allWarnings.length > 0 && (
              <ul className="divide-y divide-border rounded-control border border-border text-sm">
                {allWarnings.map((w, i) => {
                  const blocking = ready?.core.isBlocking(w);
                  return (
                    <li key={`${w.code}-${w.line}-${i}`} className="flex items-start gap-2 px-3 py-2">
                      {blocking ? (
                        <CircleAlert className="mt-0.5 size-4 shrink-0 text-verdict-dark" aria-label="Menghalangi ekspor" />
                      ) : (
                        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-verdict-margin" aria-label="Peringatan" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="font-semibold">Baris {w.line + 1}</span> · <span className="font-mono text-xs">{w.code}</span>
                        <span className="block text-ink-muted">{w.message}</span>
                      </span>
                      <button type="button" className="text-xs font-semibold text-accent underline" onClick={() => jumpToLine(w.line)}>
                        Perbaiki
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* ---- right: preview and export ---- */}
        <section className="card flex flex-col gap-3 p-4" aria-label="Pratinjau dan ekspor">
          <h2 className="text-sm font-bold">Pratinjau</h2>
          {core.status === "loading" && <p className="text-sm text-ink-muted">Memuat mesin kartu dan font…</p>}
          {preview.slides[shown] ? (
            <SlideCanvas
              bitmap={preview.slides[shown]}
              label={`Slide ${shown + 1} dari ${slideCount}`}
              className="aspect-[9/16] w-full rounded-control border border-border"
            />
          ) : (
            core.status === "ready" && <div className="aspect-[9/16] w-full rounded-control border border-dashed border-border" />
          )}
          {slideCount > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Filmstrip">
              {preview.slides.map((bmp, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === shown}
                  onClick={() => setCurrent(i)}
                  className={cn("w-12 shrink-0 rounded border-2", i === shown ? "border-accent-solid" : "border-transparent")}
                >
                  <SlideCanvas bitmap={bmp} label={`Slide ${i + 1}`} className="aspect-[9/16] w-full rounded-sm" />
                </button>
              ))}
            </div>
          )}

          <Button onClick={exportZip} loading={exporting} disabled={!canExport} className="w-full">
            <Download className="size-4" aria-hidden="true" /> Unduh ZIP
          </Button>
          {blockingCount > 0 && <p className="text-xs text-ink-muted">{blockingCount} peringatan menghalangi ekspor; perbaiki dulu.</p>}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => copy(text, "Deck")} disabled={!text}>
              <Copy className="size-4" aria-hidden="true" /> Salin deck
            </Button>
            <Button variant="ghost" onClick={() => copy(caption, "Caption")} disabled={!caption}>
              <Copy className="size-4" aria-hidden="true" /> Salin caption
            </Button>
          </div>
          {ready && text && (
            <a
              href={ready.core.encodeDeckLink(text, CAROUSEL_PRESS_URL)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent underline"
            >
              Buka di Carousel Press <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          )}
          <p className="text-xs text-ink-muted">
            Carousel Press tidak mengenal varian falak-malam dan akan memakai templat bawaannya.
          </p>
          {notice && <p role="status" className="text-xs text-ink-muted">{notice}</p>}
        </section>
      </div>
    </div>
  );
}
