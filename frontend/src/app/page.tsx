"use client";

import Link from "next/link";
import { HisabDisclaimer } from "@/components/HisabDisclaimer";
import { ErrorBanner } from "@/components/ErrorBanner";
import { HorizonInstrument } from "@/components/HorizonInstrument";
import { useObservation } from "@/components/ObservationProvider";
import { useHilalVisibility } from "@/components/useHilalVisibility";
import { useFirstEntranceAnimation } from "@/components/useFirstEntranceAnimation";
import { isVisible } from "@/lib/verdict";
import { horizonReadingFromObservation } from "@/lib/instrumentGeometry";

/**
 * / - the live instrument (DESIGN.md §6 "/" - home): "Kill the hero-and-
 * feature-grid entirely. The home page is the instrument, live, for the
 * user's place, tonight, computed on load with a sensible default location
 * before geolocation resolves." No feature cards, no CTAs pretending to be
 * a landing page - the three links below are plain text, per DESIGN.md's
 * own mockup for this page.
 *
 * Shares its data fetch (useHilalVisibility) with PetangIni (/hilal) -
 * both need the exact same live, single-evening computation, extracted
 * once there were two real call sites (migration step 8). Also the first
 * page most sessions will mount a HorizonInstrument on, so this is where
 * useFirstEntranceAnimation's once-per-session orchestrated reveal (§3.3)
 * actually gets exercised - though the hook itself is shared with
 * PetangIni precisely because home isn't always first (a permalink can
 * land a visitor on /hilal directly).
 */
function formatDegreesMinutes(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const degrees = Math.floor(abs);
  const minutes = Math.round((abs - degrees) * 60);
  return `${sign}${degrees}°${minutes.toString().padStart(2, "0")}'`;
}

export default function HomePage() {
  const { lat, lon, dateIso, matchedCity } = useObservation();
  const { obs, error } = useHilalVisibility(dateIso, lat, lon);
  const animateEntrance = useFirstEntranceAnimation();

  const placeName = matchedCity?.name ?? `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
  const headlineUndecided = obs?.margins?.mabims_2021?.verdict === "indeterminate";
  const headlineVisible = obs ? !headlineUndecided && isVisible(obs.criteria.mabims_2021) : false;

  return (
    <div lang="id" className="space-y-6">
      <h1 className="sr-only">Falak</h1>

      {error && <ErrorBanner message={error} />}

      {obs && (
        <>
          <div className="-mx-4 sm:mx-0">
            <HorizonInstrument
              reading={horizonReadingFromObservation(obs)}
              verdictSentence={`Malam ini di ${placeName}, hilal ${
                headlineVisible ? "kemungkinan terlihat" : "belum terpenuhi"
              }, berada ${formatDegreesMinutes(obs.moon_altitude_deg)} di atas ufuk saat matahari terbenam.`}
              animateEntrance={animateEntrance}
            />
          </div>

          <p className="font-display text-xl">
            Malam ini di {placeName}, hilal berada{" "}
            <strong className={headlineVisible ? "text-verdict-lit" : undefined}>
              {formatDegreesMinutes(obs.moon_altitude_deg)}
            </strong>{" "}
            di atas ufuk saat matahari terbenam.
          </p>

          <nav aria-label="Selanjutnya" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link href="/hilal" className="text-accent underline underline-offset-2 hover:no-underline">
              Lihat perhitungan lengkap
            </Link>
            <Link href="/kalender" className="text-accent underline underline-offset-2 hover:no-underline">
              Kalender
            </Link>
            <Link href="/langit" className="text-accent underline underline-offset-2 hover:no-underline">
              Langit
            </Link>
          </nav>
        </>
      )}

      <HisabDisclaimer />
    </div>
  );
}
