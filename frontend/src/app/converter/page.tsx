"use client";

import { RedirectStub } from "@/components/RedirectStub";
import { hijriYearToGregorianDate, buildSearch } from "@/lib/legacyRedirects";
import { hijriToGregorian } from "@/lib/falak/converter";
import { formatPlainDate } from "@/lib/falak/time";
import { DEFAULT_CITY } from "@/lib/locations";

/**
 * Retired (migration step 9): the converter's one job - "what Gregorian
 * date is Hijri day X" - is now just one view of /kalender, which already
 * shows the whole month's boundary next to it instead of a single date in
 * isolation.
 *
 * The old converter never took a location (it always computed against
 * Jakarta internally), so this stub does the same: hijri_year/month/day
 * convert via DEFAULT_CITY, never forwarding a lat/lon the old page never
 * had.
 */
function resolveSearch(params: URLSearchParams): string {
  const direction = params.get("direction");
  const date = params.get("date");
  const hijriYear = params.get("hijri_year");
  const hijriMonth = params.get("hijri_month");
  const hijriDay = params.get("hijri_day");

  if (direction === "hijri_to_gregorian" && hijriYear && hijriMonth && hijriDay) {
    try {
      const d = formatPlainDate(
        hijriToGregorian(Number(hijriYear), Number(hijriMonth), Number(hijriDay), DEFAULT_CITY.lat, DEFAULT_CITY.lon),
      );
      return buildSearch({ d });
    } catch {
      return "";
    }
  }
  if (date) return buildSearch({ d: date });
  if (hijriYear) {
    const d = hijriYearToGregorianDate(Number(hijriYear), DEFAULT_CITY.lat, DEFAULT_CITY.lon);
    return buildSearch({ d: d ?? undefined });
  }
  return "";
}

export default function ConverterRedirect() {
  return <RedirectStub targetPath="/kalender/" targetLabel="Kalender" buildSearch={resolveSearch} />;
}
