"use client";

import { RedirectStub } from "@/components/RedirectStub";
import { hijriYearToGregorianDate, buildSearch } from "@/lib/legacyRedirects";
import { DEFAULT_CITY } from "@/lib/locations";

/**
 * Retired (migration step 9): absorbed into /kalender, which sets its
 * comparison against sidang isbat records next to the three criteria
 * rather than in a separate page. Old links carried no lat/lon (isbat
 * accuracy was always evaluated for Jakarta), so this converts against
 * DEFAULT_CITY same as the old page's fixed evaluation point.
 */
function resolveSearch(params: URLSearchParams): string {
  const hijriYear = params.get("hijri_year");
  if (!hijriYear) return "";
  const d = hijriYearToGregorianDate(Number(hijriYear), DEFAULT_CITY.lat, DEFAULT_CITY.lon);
  return buildSearch({ d: d ?? undefined });
}

export default function IsbatAccuracyRedirect() {
  return <RedirectStub targetPath="/kalender/" targetLabel="Kalender" buildSearch={resolveSearch} />;
}
