"use client";

import { RedirectStub } from "@/components/RedirectStub";
import { buildSearch } from "@/lib/legacyRedirects";

/** Retired (migration step 9): absorbed into /hilal's "Petang ini" sweep. */
function resolveSearch(params: URLSearchParams): string {
  return buildSearch({
    d: params.get("date") ?? undefined,
    lat: params.get("lat") ?? undefined,
    lon: params.get("lon") ?? undefined,
    sweep: "petang",
  });
}

export default function HilalVisibilityRedirect() {
  return <RedirectStub targetPath="/hilal/" targetLabel="Hilal" buildSearch={resolveSearch} />;
}
