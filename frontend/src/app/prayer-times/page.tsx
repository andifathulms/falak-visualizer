"use client";

import { RedirectStub } from "@/components/RedirectStub";
import { buildSearch } from "@/lib/legacyRedirects";

/** Retired (migration step 9): absorbed into /langit's daily/monthly readout. */
function resolveSearch(params: URLSearchParams): string {
  return buildSearch({
    d: params.get("date") ?? undefined,
    lat: params.get("lat") ?? undefined,
    lon: params.get("lon") ?? undefined,
    convention: params.get("convention") ?? undefined,
  });
}

export default function PrayerTimesRedirect() {
  return <RedirectStub targetPath="/langit/" targetLabel="Langit" buildSearch={resolveSearch} />;
}
