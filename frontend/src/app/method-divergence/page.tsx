"use client";

import { RedirectStub } from "@/components/RedirectStub";
import { hijriYearToGregorianDate, legacyLatLon, buildSearch } from "@/lib/legacyRedirects";

/**
 * Retired (migration step 9, re-pointed): previously redirected to
 * /hijri-archive, which is itself now retired in favour of /kalender - same
 * translation as /hijri-archive's own stub, since the two pages always took
 * the same shape of input.
 */
function resolveSearch(params: URLSearchParams): string {
  const { lat, lon } = legacyLatLon(params);
  const hijriYear = params.get("hijri_year");
  const d = hijriYear ? hijriYearToGregorianDate(Number(hijriYear), lat, lon) : null;
  return buildSearch({
    d: d ?? undefined,
    lat: params.get("lat") ?? undefined,
    lon: params.get("lon") ?? undefined,
  });
}

export default function MethodDivergenceRedirect() {
  return <RedirectStub targetPath="/kalender/" targetLabel="Kalender" buildSearch={resolveSearch} />;
}
