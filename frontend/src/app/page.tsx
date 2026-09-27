"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, Compass } from "lucide-react";
import { ErrorBanner } from "@/components/ErrorBanner";
import { HisabDisclaimer } from "@/components/HisabDisclaimer";
import { useObservation } from "@/components/ObservationProvider";
import { SkyNow } from "@/components/sky/SkyNow";
import { useNow } from "@/components/useNow";
import { VerdictIcon, VerdictPill } from "@/components/VerdictPill";
import { CRITERIA, CRITERIA_ORDER } from "@/lib/criteria";
import { qiblaDirection } from "@/lib/falak/qibla";
import { daysBetween, formatPlainDate, parsePlainDate, type PlainDate } from "@/lib/falak/time";
import { hijriMonthArabic, hijriMonthName, toArabicDigits } from "@/lib/hijriNames";
import { formatClock, formatLongDate, todayIsoIn, zoneAbbreviation } from "@/lib/localDate";
import { hijriToday, monthOutlook, nextHijriMonth, nextKeyMonth, type MonthOutlook } from "@/lib/monthOutlook";
import { formatCountdown, nextPrayer, PRAYER_LABEL, PRAYER_ORDER, scheduleFor } from "@/lib/prayerSchedule";
import { compassName, computeSkyNow, moonPhaseName } from "@/lib/skyNow";
import { cn } from "@/lib/cn";

/**
 * / - Hari ini (DESIGN.md v2 §6). What today looks like and what comes next:
 * the live sky, today's Hijri date, the next prayer, the next month start per
 * criterion, the countdown to Ramadan/Syawal/Zulhijah, and the qibla - every
 * number computed in the browser for the place in the header.
 *
 * Everything time-dependent waits for `now` (useNow is null until mounted), so
 * the prerendered HTML never contains a time or date that was true only at
 * build time.
 */
function shortDate(date: PlainDate): string {
  return formatLongDate(formatPlainDate(date), { weekday: undefined, month: "short", year: undefined });
}

function weekdayShort(date: PlainDate): string {
  return formatLongDate(formatPlainDate(date), { weekday: "short", day: undefined, month: undefined, year: undefined });
}

export default function HariIniPage() {
  const { lat, lon, timeZone, matchedCity } = useObservation();
  const now = useNow(30_000);
  const placeName = matchedCity?.name ?? "lokasi Anda";
  const todayIso = now === null ? null : todayIsoIn(timeZone);

  const data = useMemo(() => {
    if (now === null || todayIso === null) return null;
    const today = parsePlainDate(todayIso);
    const sky = computeSkyNow(now, lat, lon);
    let schedule: ReturnType<typeof scheduleFor> | null = null;
    let scheduleError: string | null = null;
    try {
      schedule = scheduleFor(today, lat, lon);
    } catch (error) {
      scheduleError = error instanceof Error ? error.message : String(error);
    }
    const hijri = hijriToday(today, lat, lon);
    let upcoming: MonthOutlook | null = null;
    let key: MonthOutlook | null = null;
    if ("date" in hijri) {
      const [ny, nm] = nextHijriMonth(hijri.date.year, hijri.date.month);
      upcoming = monthOutlook(ny, nm, lat, lon);
      const [ky, km] = nextKeyMonth(hijri.date);
      key = ky === ny && km === nm ? upcoming : monthOutlook(ky, km, lat, lon);
    }
    return { today, sky, schedule, scheduleError, hijri, upcoming, key };
    // Recompute when the minute changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now === null ? null : Math.floor(now / 60_000_000), todayIso, lat, lon]);

  const qibla = useMemo(() => qiblaDirection(lat, lon), [lat, lon]);
  const zone = zoneAbbreviation(timeZone);

  return (
    <div className="space-y-5 sm:space-y-6">
      <h1 className="sr-only">Falak — hari ini di {placeName}</h1>

      {/* Hero: the sky right now. Full-bleed on phones. */}
      <section className="-mx-4 overflow-hidden bg-sky-zenith sm:mx-0 sm:rounded-panel" aria-label="Langit sekarang">
        <div className="relative">
          {data ? (
            <>
              <div className="hidden sm:block">
                <SkyNow sky={data.sky} placeName={placeName} />
              </div>
              <div className="sm:hidden">
                <SkyNow sky={data.sky} placeName={placeName} width={400} />
              </div>
            </>
          ) : (
            <div className="aspect-[400/300] w-full animate-pulse bg-sky-high/40 sm:aspect-[720/300]" />
          )}
          <div className="pointer-events-none absolute left-4 top-3 hidden sm:left-6 sm:top-5 sm:block">
            <p className="text-2xs font-bold uppercase tracking-[0.14em] text-sky-ink-muted">Langit sekarang</p>
            <p className="mt-0.5 text-sm font-semibold text-sky-ink sm:text-md">
              {placeName}
              {now !== null && (
                <span className="font-normal text-sky-ink-muted">
                  {" "}
                  · {formatClock(now, timeZone)} {zone}
                </span>
              )}
            </p>
            {data && <p className="text-xs text-sky-ink-muted sm:text-sm">{moonPhaseName(data.sky.moon.elongationLongitudeDeg)}</p>}
          </div>
        </div>
        <div className="px-4 pb-3.5 text-sky-ink-muted sm:hidden">
          <p className="text-2xs font-bold uppercase tracking-[0.14em]">
            Langit sekarang{now !== null && ` · ${formatClock(now, timeZone)} ${zone}`}
          </p>
          {data && <p className="text-sm text-sky-ink">{moonPhaseName(data.sky.moon.elongationLongitudeDeg)}</p>}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr] lg:gap-6">
        <div className="space-y-5">
          {/* Today's date, Hijri first. */}
          <section className="card p-5 sm:p-6" aria-label="Tanggal hari ini">
            {data && "date" in data.hijri ? (
              <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
                <div>
                  <p className="text-2xs font-bold uppercase tracking-[0.14em] text-accent">Hari ini</p>
                  <p className="mt-1 font-display text-[2.1rem] leading-tight sm:text-[2.6rem]">
                    {data.hijri.date.day} {hijriMonthName(data.hijri.date.month)}{" "}
                    <span className="whitespace-nowrap">{data.hijri.date.year} H</span>
                  </p>
                  <p className="mt-1 text-ink-muted">{todayIso && formatLongDate(todayIso)}</p>
                </div>
                <p lang="ar" dir="rtl" className="font-arab text-[1.7rem] leading-none text-moon">
                  {toArabicDigits(data.hijri.date.day)} {hijriMonthArabic(data.hijri.date.month)} {toArabicDigits(data.hijri.date.year)}
                </p>
              </div>
            ) : data && "error" in data.hijri ? (
              <ErrorBanner message="Tanggal Hijriah hari ini tidak bisa dihitung untuk lokasi ini." detail={data.hijri.error} />
            ) : (
              <div className="h-24 animate-pulse rounded-control bg-surface-raised" />
            )}
          </section>

          {/* Next prayer. */}
          <section className="card overflow-hidden" aria-label="Salat berikutnya">
            {data?.schedule && now !== null ? (
              (() => {
                const next = nextPrayer(data.schedule.today, data.schedule.tomorrow, now);
                return (
                  <>
                    <div className="flex flex-wrap items-end justify-between gap-3 p-5 sm:p-6">
                      <div>
                        <p className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-muted">Salat berikutnya</p>
                        {next ? (
                          <p className="mt-1 text-[2rem] font-extrabold leading-none tracking-tight sm:text-[2.4rem]">
                            {PRAYER_LABEL[next.key]}{" "}
                            <span className="tabular-nums text-accent">{formatClock(next.instant, timeZone)}</span>
                          </p>
                        ) : (
                          <p className="mt-1 text-lg">—</p>
                        )}
                      </div>
                      {next && (
                        <p className="rounded-full bg-accent-solid/15 px-3 py-1.5 text-sm font-bold text-accent" aria-live="polite">
                          {formatCountdown(now, next.instant)} lagi
                        </p>
                      )}
                    </div>
                    <ol className="grid grid-cols-3 border-t border-border sm:grid-cols-6">
                      {PRAYER_ORDER.map((key) => {
                        const t = data.schedule!.today[key];
                        const past = t !== null && t <= now;
                        const isNext = next && !next.tomorrow && next.key === key;
                        return (
                          <li
                            key={key}
                            className={cn(
                              "border-b border-r border-border px-3 py-3 text-center last:border-r-0 sm:border-b-0 [&:nth-child(3)]:border-r-0 sm:[&:nth-child(3)]:border-r",
                              isNext && "bg-accent-solid/10",
                            )}
                          >
                            <span className={cn("block text-2xs font-semibold", isNext ? "text-accent" : "text-ink-muted")}>{PRAYER_LABEL[key]}</span>
                            <span className={cn("block text-md font-bold tabular-nums", past && "text-ink-muted", isNext && "text-accent")}>
                              {formatClock(t, timeZone)}
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                    <Link href="/salat" className="flex items-center justify-between px-5 py-3 text-sm font-semibold text-accent hover:bg-surface-raised sm:px-6">
                      Jadwal lengkap &amp; sebulan <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </>
                );
              })()
            ) : data?.scheduleError ? (
              <div className="p-5">
                <ErrorBanner message="Jadwal salat tidak bisa dihitung untuk lokasi dan tanggal ini." detail={data.scheduleError} />
              </div>
            ) : (
              <div className="h-40 animate-pulse bg-surface-raised" />
            )}
          </section>
        </div>

        <div className="space-y-5">
          {data?.upcoming && <MonthCard outlook={data.upcoming} today={data.today} label="Awal bulan berikutnya" />}

          {data?.key && data.key !== data.upcoming && <CountdownCard outlook={data.key} today={data.today} />}

          <HisabDisclaimer />

          <Link href="/kiblat" className="card flex items-center gap-4 p-5 transition-colors hover:border-border-strong">
            <span className="relative flex size-14 shrink-0 items-center justify-center rounded-full bg-surface-raised">
              <Compass className="absolute size-6 text-ink-muted/30" aria-hidden="true" />
              <svg viewBox="0 0 40 40" className="size-12" aria-hidden="true" style={{ transform: `rotate(${qibla.bearingDeg}deg)` }}>
                <path d="M20 5 L24 20 L20 18 L16 20 Z" fill="var(--verdict-lit)" />
                <circle cx="20" cy="20" r="2.4" fill="var(--text-body)" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-2xs font-bold uppercase tracking-[0.14em] text-ink-muted">Arah kiblat</span>
              <span className="block text-xl font-extrabold tabular-nums">{qibla.bearingDeg.toFixed(1).replace(".", ",")}°</span>
              <span className="block text-sm text-ink-muted">
                dari utara, ke arah {compassName(qibla.bearingDeg)} · {Math.round(qibla.distanceKm).toLocaleString("id-ID")} km
              </span>
            </span>
            <ArrowRight className="size-4 text-accent" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function MonthCard({ outlook, today, label }: { outlook: MonthOutlook; today: PlainDate; label: string }) {
  const mabims = outlook.starts.mabims_2021;
  const name = `${hijriMonthName(outlook.hijriMonth)} ${outlook.hijriYear}`;
  return (
    <section className="card overflow-hidden" aria-label={label}>
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <p className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-muted">{label}</p>
          {outlook.unanimous ? (
            <VerdictPill tone="lit">Ketiga kriteria sepakat</VerdictPill>
          ) : (
            <VerdictPill tone="margin">Kriteria berbeda</VerdictPill>
          )}
        </div>
        <p className="mt-2 font-display text-2xl leading-tight">
          1 {name}
          {mabims && <span className="block text-lg text-ink-muted">{formatLongDate(formatPlainDate(mabims))}</span>}
        </p>
        {mabims && (
          <p className="mt-1 text-sm text-ink-muted">
            {(() => {
              const d = daysBetween(today, mabims);
              return d > 0 ? `${d} hari lagi menurut MABIMS 2021` : d === 0 ? "Hari ini, menurut MABIMS 2021" : null;
            })()}
          </p>
        )}
      </div>
      <ul className="grid grid-cols-3 border-t border-border">
        {CRITERIA_ORDER.map((method) => {
          const start = outlook.starts[method];
          const differs = start && mabims && daysBetween(mabims, start) !== 0;
          return (
            <li key={method} className="border-r border-border px-3 py-3 last:border-r-0 sm:px-4">
              <span className="block truncate text-2xs font-semibold text-ink-muted">{CRITERIA[method].name}</span>
              <span className={cn("flex items-center gap-1 text-sm font-bold", differs ? "text-verdict-margin" : "text-ink")}>
                {differs && <VerdictIcon tone="margin" className="size-3.5" />}
                {start ? (
                  <span className="whitespace-nowrap">
                    <span className="hidden sm:inline">{weekdayShort(start)}, </span>
                    {shortDate(start)}
                  </span>
                ) : (
                  "—"
                )}
              </span>
            </li>
          );
        })}
      </ul>
      <Link
        href={`/awal-bulan?bulan=${outlook.hijriYear}-${outlook.hijriMonth}`}
        className="flex items-center justify-between border-t border-border px-5 py-3 text-sm font-semibold text-accent hover:bg-surface-raised sm:px-6"
      >
        Lihat langit petang penentu <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </section>
  );
}

function CountdownCard({ outlook, today }: { outlook: MonthOutlook; today: PlainDate }) {
  const start = outlook.starts.mabims_2021;
  const event =
    outlook.hijriMonth === 9 ? "Awal puasa" : outlook.hijriMonth === 10 ? "Idulfitri" : "Awal Zulhijah";
  const days = start ? daysBetween(today, start) : null;
  return (
    <Link
      href={`/awal-bulan?bulan=${outlook.hijriYear}-${outlook.hijriMonth}`}
      className="relative block overflow-hidden rounded-card bg-sky-high p-5 text-sky-ink transition-transform duration-fast hover:-translate-y-0.5 sm:p-6"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_100%_0%,rgb(224_135_90/0.45),transparent_60%)]" />
      <div className="relative flex items-end justify-between gap-4">
        <div>
          <p className="text-2xs font-bold uppercase tracking-[0.14em] text-sky-ink-muted">
            Menuju {hijriMonthName(outlook.hijriMonth)} {outlook.hijriYear}
          </p>
          <p className="mt-1 text-sm">
            {event} · perkiraan hisab {start ? formatLongDate(formatPlainDate(start)) : "—"}
          </p>
          {!outlook.unanimous && <p className="mt-1 text-xs text-sky-margin">Kriteria berbeda — lihat alasannya</p>}
        </div>
        {days !== null && days >= 0 && (
          <p className="text-right">
            <span className="block text-[2.6rem] font-extrabold leading-none tabular-nums text-sky-lit">{days}</span>
            <span className="text-xs text-sky-ink-muted">hari</span>
          </p>
        )}
      </div>
    </Link>
  );
}
