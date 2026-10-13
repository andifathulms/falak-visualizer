"use client";

import { useEffect, useState } from "react";
import { falakFontFaces, falakMalam } from "@/lib/cards/variant";

export type CarouselCore = typeof import("carousel-core");
export type CarouselZip = typeof import("carousel-core/zip");

export type CoreState =
  | { status: "loading" }
  | { status: "ready"; core: CarouselCore; zip: CarouselZip }
  | { status: "error"; message: string; detail?: string };

/** Where public/carousel-core/fonts/ is served - basePath included, since Next does not prefix runtime URLs. */
export const FONT_BASE_URL = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/carousel-core/fonts/`;

let loading: Promise<{ core: CarouselCore; zip: CarouselZip }> | null = null;

/**
 * Load carousel-core client-side only, once per page: configure fonts,
 * register falak-malam (a VariantError lists every token problem - that is a
 * bug to fix, never something to render around), and wait for the variant's
 * faces. Everything the page needs later is fetched here, so preview and
 * export make no further network requests.
 */
function loadCore(): Promise<{ core: CarouselCore; zip: CarouselZip }> {
  loading ??= (async () => {
    const [core, zip] = await Promise.all([import("carousel-core"), import("carousel-core/zip")]);
    core.configureFonts({ baseUrl: FONT_BASE_URL, faces: falakFontFaces(FONT_BASE_URL) });
    if (!core.hasVariant(falakMalam.id)) core.registerVariant(falakMalam);
    await core.loadFonts(falakMalam.id);
    return { core, zip };
  })();
  loading.catch(() => {
    loading = null;
  });
  return loading;
}

export function useCarouselCore(): CoreState {
  const [state, setState] = useState<CoreState>({ status: "loading" });
  useEffect(() => {
    let cancelled = false;
    loadCore().then(
      ({ core, zip }) => !cancelled && setState({ status: "ready", core, zip }),
      (error: unknown) => {
        if (cancelled) return;
        const issues = (error as { issues?: string[] }).issues;
        setState({
          status: "error",
          message: issues ? "Varian kartu Falak tidak lolos pemeriksaan carousel-core." : "Mesin kartu atau fontnya gagal dimuat.",
          detail: issues ? issues.join("; ") : error instanceof Error ? error.message : String(error),
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}
