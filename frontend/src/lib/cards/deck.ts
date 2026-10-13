/**
 * A typed writer for carousel-core's deck grammar (Carousel Press PRD §4,
 * SPEC-lexicon §2): builders describe slides, this turns them into text, and
 * applies the rules in rules.ts on the way out.
 *
 * Only the slide types builders are allowed to use exist here. There is no
 * `compare` (its default labels are Salah/Benar), no `ayah`/`hadith`, and no
 * `cta` on word/table slides (carousel-core v1.0.0 drops the swipe hint there
 * but draws no button) - decks end on an `[end]` slide instead.
 */
import { HISAB_DISCLAIMER, ENGINE_ERROR_TEXT, ruleViolations } from "./rules";

export const FALAK_TEMPLATE_ID = "editorial/falak-malam";

export type Tone = "ok" | "warn" | "bad";

export type SlideSpec =
  | { type: "cover"; kicker?: string; headline: string; subtitle?: string }
  | { type: "card"; headline: string; body?: string[]; verdict?: { label: string; tone: Tone } }
  | { type: "table"; headline: string; header: string[]; rows: string[][]; note?: string }
  | { type: "word"; fields: { word: string; pos?: string; meaning?: string; example?: string; note?: string } }
  | { type: "end"; headline: string; body?: string[] };

/** Card-deck series, also the slug prefix of every export. */
export type Series =
  | "petang-penentu"
  | "angka-di-balik-hilal"
  | "kiblat-sore-ini"
  | "kiblat-kotamu"
  | "jam-langit"
  | "kamus-falak";

/** Decks about month starts or criteria carry the hisab disclaimer. */
export const MONTH_OR_CRITERIA_SERIES: ReadonlySet<Series> = new Set<Series>([
  "petang-penentu",
  "angka-di-balik-hilal",
  "kamus-falak",
]);

export interface CardDeck {
  series: Series;
  /** Slug-ish title; carousel-core names the PNGs after it. */
  title: string;
  text: string;
  /** One line for the TikTok caption. Never drawn on a slide. */
  caption: string;
  /**
   * Non-empty when the engine could not produce part of the deck. The page
   * refuses to export; the deck also says ENGINE_ERROR_TEXT where the value
   * would have been.
   */
  blocking: string[];
}

/** Plain engine-derived or builder text: no accidental line breaks, accents or code pills. */
export function plain(text: string): string {
  return text.replace(/\r?\n/g, " ").replace(/\\/g, "").replace(/\|/g, "\\|").replace(/[*`]/g, "");
}

function cell(text: string): string {
  return plain(text).trim() || "—";
}

function quoteAttr(value: string): string {
  return `"${plain(value).replace(/"/g, '\\"')}"`;
}

function slideText(s: SlideSpec): string {
  switch (s.type) {
    case "cover": {
      const tag = s.kicker ? `[cover kicker=${quoteAttr(s.kicker)}]` : "[cover]";
      return [tag, s.headline, s.subtitle].filter(Boolean).join("\n");
    }
    case "card": {
      const attrs = ["card", "icon=none"];
      if (s.verdict) attrs.push(`verdict=${quoteAttr(s.verdict.label)}`, `tone=${s.verdict.tone}`);
      return [`[${attrs.join(" ")}]`, s.headline, ...(s.body ?? [])].join("\n");
    }
    case "table": {
      const row = (cells: string[]) => `| ${cells.map(cell).join(" | ")} |`;
      return ["[table]", s.headline, row(s.header), ...s.rows.map(row), ...(s.note ? [s.note] : [])].join("\n");
    }
    case "word": {
      const f = s.fields;
      const lines = [`word: ${plain(f.word)}`];
      if (f.pos) lines.push(`pos: ${plain(f.pos)}`);
      if (f.meaning) lines.push(`meaning: ${f.meaning}`);
      if (f.example) lines.push(`example: ${f.example}`);
      if (f.note) lines.push(`note: ${plain(f.note)}`);
      return ["[word]", ...lines].join("\n");
    }
    case "end":
      return ["[end icon=none]", s.headline, ...(s.body ?? [])].join("\n");
  }
}

/** Carousel-core's table limits (SPEC-lexicon §2.2): split long tables into pages of at most 8 rows. */
export const TABLE_MAX_ROWS = 8;

export function pagedTables(
  headline: string,
  header: string[],
  rows: string[][],
  note: string | undefined,
  perPage = 5,
): SlideSpec[] {
  const size = Math.max(1, Math.min(TABLE_MAX_ROWS, perPage));
  const pages: string[][][] = [];
  for (let i = 0; i < rows.length; i += size) pages.push(rows.slice(i, i + size));
  return pages.map((page, i) => ({
    type: "table" as const,
    headline: pages.length > 1 ? `${headline} (${i + 1}/${pages.length})` : headline,
    header,
    rows: page,
    note,
  }));
}

export interface DeckOptions {
  series: Series;
  title: string;
  caption: string;
  slides: SlideSpec[];
  blocking?: string[];
  handle?: string;
}

/**
 * Assemble the deck text. Applies the house rules: the disclaimer is
 * appended to month/criteria decks (as the slide before the end slide, and in
 * the caption), a blocked deck says so on its first content slide, and any
 * forbidden phrase is a programming error, not something to publish.
 */
export function assembleDeck(opts: DeckOptions): CardDeck {
  const blocking = opts.blocking ?? [];
  const slides = [...opts.slides];
  let caption = opts.caption;

  if (blocking.length) {
    slides.splice(1, 0, {
      type: "card",
      headline: `Sebagian angka ${ENGINE_ERROR_TEXT}`,
      body: blocking.map((b) => plain(b)),
      verdict: { label: "TIDAK DAPAT DIHITUNG", tone: "bad" },
    });
  }

  if (MONTH_OR_CRITERIA_SERIES.has(opts.series)) {
    const endAt = slides.findIndex((s) => s.type === "end");
    const disclaimer: SlideSpec = { type: "card", headline: "Catatan", body: [HISAB_DISCLAIMER] };
    slides.splice(endAt === -1 ? slides.length : endAt, 0, disclaimer);
    if (!caption.includes(HISAB_DISCLAIMER)) caption = `${caption} ${HISAB_DISCLAIMER}`;
  }

  const header = [
    `template: ${FALAK_TEMPLATE_ID}`,
    "lang: id",
    `title: ${plain(opts.title)}`,
    ...(opts.handle ? [`handle: ${plain(opts.handle)}`] : []),
    `caption: ${plain(caption)}`,
  ];
  const text = [header.join("\n"), ...slides.map(slideText)].join("\n---\n") + "\n";

  const violations = ruleViolations(text);
  if (violations.length) throw new Error(`card deck breaks the house rules: ${violations.join("; ")}`);

  return { series: opts.series, title: opts.title, text, caption: plain(caption), blocking };
}
