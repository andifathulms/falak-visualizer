"use client";

import { RedirectStub } from "@/components/RedirectStub";
import { hijriYearToGregorianDate, legacyLatLon, buildSearch } from "@/lib/legacyRedirects";

/** Retired (migration step 9): absorbed into /hilal's "Setahun" sweep. */
function resolveSearch(params: URLSearchParams): string {
  const { lat, lon } = legacyLatLon(params);
  const hijriYear = params.get("hijri_year");
  const d = hijriYear ? hijriYearToGregorianDate(Number(hijriYear), lat, lon) : null;
  return buildSearch({
    d: d ?? undefined,
    sweep: "setahun",
    method: params.get("method") ?? undefined,
    lat: params.get("lat") ?? undefined,
    lon: params.get("lon") ?? undefined,
  });
}

export default function VisibilityCalendarRedirect() {
  return <RedirectStub targetPath="/hilal/" targetLabel="Hilal" buildSearch={resolveSearch} />;
}
