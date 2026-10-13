/**
 * editorial/falak-malam - Falak's own card variant for carousel-core
 * (docs/RECON_CARDS.md §7), built from the app's tokens in globals.css and
 * DESIGN.md §3.
 *
 * Surfaces: malam (the sky after isya, --sky-zenith), senja (--sky-high),
 * fajar (the light theme), and deep for covers and ends. The Sun is ember
 * (#F4A259) and the Moon pearl (#F3E9CF), never swapped; the pearl is the
 * icon colour on the dark surfaces, and decks use icon=none anyway (lib/cards
 * /deck.ts) so carousel-core's auto pool never draws a pearl sun.
 *
 * Verdict (semantic) colours are checked by carousel-core against EVERY
 * surface, light fajar included, so they are mid-tones rather than the app's
 * per-theme verdict tokens. Every stamp carries its word (TERPENUHI, TERLALU
 * TIPIS ...); colour is never the only carrier.
 *
 * Deco, honestly: carousel-core v1.0.0's editorial family draws only blobs.
 * dotGrid/glow are drawn by the dev family alone and cornerGlyph by lexicon
 * alone, so the star field, horizon glow and crescent glyph from RECON §7 are
 * not expressible on an editorial variant without a carousel-core change.
 * They are left off rather than set to flags the renderer ignores.
 */
import type { Surface, Variant } from "carousel-core";
import { FALAK_TEMPLATE_ID } from "./deck";

const S = (
  bg: string, ink: string, body: string, muted: string, accent: string,
  badgeBg: string, badgeInk: string, blob: string, icon: string, inlineCodeBg: string,
): Surface => ({ bg, ink, body, muted, accent, badgeBg, badgeInk, blob, icon, inlineCodeBg });

const SUN = "#F4A259";
const MOON = "#F3E9CF";

const malam = S("#0B0D1F", "#ECEAF4", "#D9D7E8", "#A3A6CB", SUN, SUN, "#1A1330", "#1B1F40", MOON, "#1B1F40");

export const falakMalam: Variant = {
  id: FALAK_TEMPLATE_ID,
  name: "Falak Malam",
  family: "editorial",
  fonts: { serif: "Newsreader", sans: "Plus Jakarta Sans", mono: "IBM Plex Mono" },
  surfaces: {
    malam,
    senja: S("#2A2350", "#EEECF6", "#E2DFF0", "#B4B6D6", "#F6D78B", "#F6D78B", "#1A1330", "#3A3168", MOON, "#3A3168"),
    fajar: S("#F4F5FA", "#15183A", "#2A2E52", "#555A7C", "#A34A12", "#B4531A", "#FFFFFF", "#E4E7F2", "#A34A12", "#E4E7F2"),
    deep: malam,
  },
  rotation: ["malam", "senja", "malam", "fajar"],
  onPhoto: {
    bg: "#000000", ink: "#FFFFFF", body: "rgba(255,255,255,0.90)", muted: "rgba(255,255,255,0.75)",
    accent: SUN, badgeBg: SUN, badgeInk: "#1A1330", blob: "rgba(0,0,0,0)", icon: MOON,
    inlineCodeBg: "rgba(255,255,255,0.18)", tint: "#07081A",
  },
  code: {
    panel: "#131631", border: "#262B55", text: "#ECEAF4", prompt: SUN, command: "#FFFFFF", subcommand: "#C7BCFF",
    flag: "#F6D78B", string: "#B8D8A8", comment: "#A3A6CB", number: "#F6D78B", keyword: "#F4A259", fn: "#C7BCFF",
    punct: "#D9D7E8", dots: null,
  },
  deco: { blobs: false, dotGrid: false, scanlines: false, glow: false, bigGlyph: null },
  swatches: ["#0B0D1F", SUN, MOON, "#2A2350"],
  // lit / marginal / not met: gold, violet, slate - mid-tones that clear 3:1 on all four surfaces.
  semantic: { ok: "#A87B0C", warn: "#8676DD", bad: "#7C8199" },
};

/**
 * Host faces for configureFonts: the same files the app serves through
 * next/font/local, copied to public/carousel-core/fonts/ at build. The two
 * variable files cover the editorial family's weights directly. IBM Plex Mono
 * ships only Regular and SemiBold; the editorial font gate also waits for mono
 * 500, which Regular is declared to cover. No card uses mono text.
 */
export function falakFontFaces(baseUrl: string) {
  return [
    { family: "Plus Jakarta Sans", weight: [400, 800] as [number, number], url: `${baseUrl}PlusJakartaSans-Variable.woff2` },
    { family: "Newsreader", weight: [200, 800] as [number, number], url: `${baseUrl}Newsreader-Variable.woff2` },
    { family: "IBM Plex Mono", weight: [400, 500] as [number, number], url: `${baseUrl}IBMPlexMono-Regular.woff2` },
    { family: "IBM Plex Mono", weight: 600, url: `${baseUrl}IBMPlexMono-SemiBold.woff2` },
  ];
}
