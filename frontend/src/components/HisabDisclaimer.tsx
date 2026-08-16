import { TriangleAlert } from "lucide-react";

/**
 * The religious-sensitivity framing CLAUDE.md requires near any month-start
 * or Ramadan-related output - present on every page that produces one.
 *
 * DESIGN.md §7: "one quiet line with a disclosure, not a bordered amber box
 * that competes with the drawing. Reduce its visual weight; do not reduce
 * its presence." That directive isn't scoped to new pages only, so this
 * replaces the old bordered-box `full` variant everywhere it's used
 * (including the pre-migration pages still live during this rework) rather
 * than forking a second component - same information, quieter, and in
 * Indonesian per §7's decided language direction. The old `full`/`compact`
 * split is gone: this is now the one implementation for every context.
 */
const HEADLINE = "Hisab, bukan penetapan resmi.";

const BODY = (
  <>
    Ini hasil hisab (perhitungan), bukan rukyat (pengamatan langsung). Awal Ramadhan, Syawal, dan
    Dzulhijjah di Indonesia ditetapkan resmi melalui sidang isbat Kemenag, yang dapat
    mempertimbangkan laporan rukyat yang tidak diperhitungkan di sini. Perbedaan antar metode
    memang terjadi dan sengaja ditampilkan apa adanya, bukan kesalahan.
  </>
);

export function HisabDisclaimer() {
  return (
    <details lang="id" className="group text-sm text-ink-muted">
      <summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
        <TriangleAlert className="size-3.5 shrink-0 text-accent" strokeWidth={2} aria-hidden="true" />
        <span>
          <span className="font-medium text-ink">{HEADLINE}</span>{" "}
          <span className="underline decoration-dotted underline-offset-2">Selengkapnya</span>
        </span>
      </summary>
      <p className="mt-2 pl-[21px]">{BODY}</p>
    </details>
  );
}
