"use client";

import { RedirectStub } from "@/components/RedirectStub";
import { buildSearch } from "@/lib/legacyRedirects";

/** Retired (migration step 9): absorbed into compass strip + bearing readout. */
function resolveSearch(params: URLSearchParams): string {
  return buildSearch({
    lat: params.get("lat") ?? undefined,
    lon: params.get("lon") ?? undefined,
  });
}

export default function QiblaRedirect() {
  return <RedirectStub targetPath="/kiblat/" targetLabel="Kiblat" buildSearch={resolveSearch} />;
}
