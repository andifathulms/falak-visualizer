"use client";

import { RedirectStub } from "@/components/RedirectStub";
import { hijriYearToGregorianDate, legacyLatLon, buildSearch } from "@/lib/legacyRedirects";

/** Retired (migration step 9): absorbed into /kalender. */
function resolveSearch(params: URLSearchParams): string {
  const { lat, lon } = legacyLatLon(params);
  const year = params.get("year");
  const d = year ? hijriYearToGregorianDate(Number(year), lat, lon) : null;
  return buildSearch({
    d: d ?? undefined,
    lat: params.get("lat") ?? undefined,
    lon: params.get("lon") ?? undefined,
  });
}

export default function HijriArchiveRedirect() {
  return <RedirectStub targetPath="/kalender/" targetLabel="Kalender" buildSearch={resolveSearch} />;
}
