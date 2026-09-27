"use client";

import { useEffect, useMemo, useState } from "react";
import { Sun as SunIcon } from "lucide-react";
import { ErrorBanner } from "@/components/ErrorBanner";
import { QiblaCompass } from "@/components/QiblaCompass";
import { useObservation } from "@/components/ObservationProvider";
import { useNow } from "@/components/useNow";
import { ApiError, fetchRashdulQibla, type RashdulQiblaEvent } from "@/lib/api";
import { qiblaDirection } from "@/lib/falak/qibla";
import { formatClock, zoneAbbreviation } from "@/lib/localDate";
import { compassName, computeSkyNow } from "@/lib/skyNow";
import { cn } from "@/lib/cn";

function fmt(value: number, digits = 1): string {
  return value.toFixed(digits).replace(".", ",");
}

/** Signed shortest turn from `fromDeg` to `toDeg`, -180..180 (positive = clockwise = to the right). */
function turn(fromDeg: number, toDeg: number): number {
  return ((((toDeg - fromDeg) % 360) + 540) % 360) - 180;
}

/**
 * /kiblat (DESIGN.md v2 §6): which way, how far, and how to find it with the
 * Sun instead of a compass - the engine's solar azimuth (cross-checked against
 * JPL DE440) turned into an instruction a person can follow this minute. The
 * reference is whichever needs the smaller turn: facing the Sun, or facing
 * your own shadow. Rashdul Qibla lists the two moments a year every vertical
 * shadow points straight away from the Kaaba.
 */
export default function KiblatPage() {
  const { lat, lon, timeZone, matchedCity } = useObservation();
  const now = useNow(30_000);
  const qibla = useMemo(() => qiblaDirection(lat, lon), [lat, lon]);
  const zone = zoneAbbreviation(timeZone);

  const sun = useMemo(() => (now === null ? null : computeSkyNow(now, lat, lon).sun), [now, lat, lon]);
  const sunUsable = sun !== null && sun.altitudeDeg > 3;
  const guidance = useMemo(() => {
    if (!sun || !sunUsable) return null;
    const fromSun = turn(sun.azimuthDeg, qibla.bearingDeg);
    const fromShadow = turn((sun.azimuthDeg + 180) % 360, qibla.bearingDeg);
    return Math.abs(fromSun) <= Math.abs(fromShadow)
      ? { reference: "sun" as const, degrees: fromSun }
      : { reference: "shadow" as const, degrees: fromShadow };
  }, [sun, sunUsable, qibla.bearingDeg]);

  const [year, setYear] = useState<number | null>(null);
  const [events, setEvents] = useState<RashdulQiblaEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (now !== null && year === null) setYear(new Date(now / 1000).getFullYear());
  }, [now, year]);
  useEffect(() => {
    if (year === null) return;
    let cancelled = false;
    setError(null);
    Promise.all([fetchRashdulQibla({ year }), fetchRashdulQibla({ year: year + 1 })])
      .then(([a, b]) => !cancelled && setEvents([...a.events, ...b.events]))
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : String(err)));
    return () => {
      cancelled = true;
    };
  }, [year]);

  const upcoming = events && now !== null ? events.filter((e) => new Date(e.utc_time).getTime() * 1000 > now - 86_400_000_000).slice(0, 2) : [];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-2xs font-bold uppercase tracking-[0.14em] text-accent">Arah kiblat</p>
        <h1 className="mt-1 text-[1.9rem] font-extrabold leading-tight tracking-tight sm:text-4xl">{matchedCity?.name ?? "Lokasi Anda"}</h1>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <section className="card flex flex-col items-center gap-4 p-5 sm:p-7" aria-label="Kompas kiblat">
          <QiblaCompass bearingDeg={qibla.bearingDeg} sunAzimuthDeg={sunUsable && sun ? sun.azimuthDeg : null} reference={guidance?.reference ?? null} />
          <div className="text-center">
            <p className="text-5xl font-extrabold tabular-nums tracking-tight">{fmt(qibla.bearingDeg)}°</p>
            <p className="mt-1 text-ink-muted">
              dari utara sejati, ke arah {compassName(qibla.bearingDeg)} · {Math.round(qibla.distanceKm).toLocaleString("id-ID")} km ke Ka&apos;bah
            </p>
          </div>
        </section>

        <div className="space-y-5">
          <section className="card overflow-hidden" aria-label="Menemukan kiblat dengan matahari">
            <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
              <SunIcon className="size-4 text-sun" aria-hidden="true" />
              <h2 className="text-sm font-bold">Tanpa kompas: pakai matahari</h2>
              {now !== null && <span className="ml-auto text-xs text-ink-muted">pukul {formatClock(now, timeZone)} {zone}</span>}
            </div>
            <div className="p-5">
              {sun === null ? (
                <div className="h-20 animate-pulse rounded-control bg-surface-raised" />
              ) : guidance ? (
                <>
                  <p className="font-display text-2xl leading-snug">
                    {guidance.reference === "sun" ? "Hadapkan badan ke matahari" : "Membelakangi matahari, hadap ke arah bayangan Anda"}, lalu putar{" "}
                    <strong className="whitespace-nowrap font-sans font-extrabold text-accent">
                      {fmt(Math.abs(guidance.degrees), 0)}° ke {guidance.degrees >= 0 ? "kanan" : "kiri"}
                    </strong>
                    .
                  </p>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-control bg-surface-raised px-3 py-2.5">
                      <dt className="text-2xs font-semibold text-ink-muted">Azimut matahari</dt>
                      <dd className="font-bold tabular-nums">{fmt(sun.azimuthDeg)}°</dd>
                    </div>
                    <div className="rounded-control bg-surface-raised px-3 py-2.5">
                      <dt className="text-2xs font-semibold text-ink-muted">Tinggi matahari</dt>
                      <dd className="font-bold tabular-nums">{fmt(sun.altitudeDeg)}°</dd>
                    </div>
                  </dl>
                  <p className="mt-3 text-xs text-ink-muted">
                    Diperbarui tiap 30 detik; matahari bergeser sekitar 1° setiap 4 menit. Kanan = searah jarum jam dilihat dari atas.
                  </p>
                </>
              ) : (
                <p className="text-ink-muted">
                  Matahari sedang {sun.altitudeDeg < 0 ? `${fmt(-sun.altitudeDeg)}° di bawah ufuk` : "terlalu rendah"}, jadi arahnya tidak bisa
                  dipakai sebagai patokan. Cara ini bisa dipakai lagi setelah matahari terbit cukup tinggi, atau gunakan kompas dengan arah{" "}
                  {fmt(qibla.bearingDeg)}°.
                </p>
              )}
            </div>
          </section>

          <section className="card overflow-hidden" aria-label="Rashdul kiblat">
            <div className="border-b border-border px-5 py-3.5">
              <h2 className="text-sm font-bold">Rashdul Kiblat berikutnya</h2>
              <p className="mt-0.5 text-sm text-ink-muted">
                Saat matahari tepat di atas Ka&apos;bah, bayangan setiap benda tegak di mana pun matahari terlihat menunjuk persis berlawanan dengan
                arah kiblat.
              </p>
            </div>
            {error && (
              <div className="p-5">
                <ErrorBanner message="Jadwal Rashdul Kiblat tidak bisa dihitung." detail={error} />
              </div>
            )}
            <ul>
              {upcoming.map((e) => {
                const at = new Date(e.utc_time);
                const localSunUp = computeSkyNow(at.getTime() * 1000, lat, lon).sun.altitudeDeg > 0;
                return (
                  <li key={e.utc_time} className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5 last:border-b-0">
                    <div>
                      <p className="font-bold">
                        {at.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: timeZone ?? undefined })}
                      </p>
                      <p className={cn("text-xs", localSunUp ? "text-ink-muted" : "text-verdict-dark")}>
                        {localSunUp ? "Matahari terlihat dari lokasi ini" : "Matahari di bawah ufuk di lokasi ini — tidak bisa dipakai di sini"}
                      </p>
                    </div>
                    <p className="text-xl font-extrabold tabular-nums">
                      {formatClock(at.getTime() * 1000, timeZone)} <span className="text-xs font-semibold text-ink-muted">{zone}</span>
                    </p>
                  </li>
                );
              })}
            </ul>
            {upcoming.length > 0 && (
              <details className="border-t border-border px-5 py-3 text-sm">
                <summary className="cursor-pointer font-semibold text-ink-muted">Lihat perhitungan</summary>
                <p className="mt-2 text-ink-muted">
                  Waktunya adalah tengah hari matahari di meridian Ka&apos;bah pada hari deklinasi matahari paling dekat dengan lintang Ka&apos;bah
                  (21,4225° LU). Saat deklinasi tepat sama dengan lintang itu:
                </p>
                <ul className="mt-1 font-mono text-xs">
                  {upcoming.map((e) => (
                    <li key={e.declination_crossing_utc}>{e.declination_crossing_utc.replace("T", " ").slice(0, 19)} UTC</li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
