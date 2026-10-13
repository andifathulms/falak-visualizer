"use client";

import { useEffect, useState } from "react";
import type { Deck, Warning } from "carousel-core";
import type { CarouselCore } from "./useCarouselCore";

export interface DeckPreview {
  deck: Deck | null;
  /** Parse warnings plus layout warnings with real fonts, by line. */
  warnings: Warning[];
  /** One full-size render per slide, drawn by carousel-core's own renderSlide. */
  slides: ImageBitmap[];
  error: string | null;
  busy: boolean;
}

const EMPTY: DeckPreview = { deck: null, warnings: [], slides: [], error: null, busy: false };

function dedupe(warnings: Warning[]): Warning[] {
  const seen = new Set<string>();
  return warnings.filter((w) => {
    const key = `${w.code}:${w.line}:${w.slideIndex}:${w.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Re-render the preview a beat after the deck text stops changing. */
export function useDeckPreview(core: CarouselCore | null, text: string): DeckPreview {
  const [state, setState] = useState<DeckPreview>(EMPTY);

  useEffect(() => {
    if (!core || !text.trim()) {
      setState(EMPTY);
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, busy: true }));
    const timer = window.setTimeout(async () => {
      try {
        const { deck, warnings } = core.parseDeck(text);
        const variant = core.getVariant(deck.template);
        await core.loadFonts(variant);
        const layout = core.layoutWarnings(deck, variant);
        const icons = core.deckIcons(deck, variant);
        const slides: ImageBitmap[] = [];
        for (let i = 0; i < deck.slides.length; i += 1) {
          const slide = deck.slides[i];
          const canvas = document.createElement("canvas");
          canvas.width = core.CANVAS.w;
          canvas.height = core.CANVAS.h;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("canvas 2D tidak tersedia");
          core.renderSlide(ctx, slide, deck, variant, { photo: null, darkness: 50, icon: icons[i] ?? null, preview: true });
          slides.push(await createImageBitmap(canvas));
        }
        if (!cancelled) setState({ deck, warnings: dedupe([...warnings, ...layout]), slides, error: null, busy: false });
      } catch (error) {
        if (!cancelled) setState({ ...EMPTY, error: error instanceof Error ? error.message : String(error) });
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [core, text]);

  return state;
}
