"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Compass as CompassIcon, MapPin, Search, SunMedium } from "lucide-react";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LocationPicker } from "@/components/LocationPicker";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { ApiError, fetchQibla, fetchRashdulQibla, QiblaResult, RashdulQiblaResult } from "@/lib/api";
import { DEFAULT_CITY } from "@/lib/locations";
import { resolveTimeZone } from "@/lib/timezone";
import { readQueryParams, writeQueryParams } from "@/lib/permalink";

function CompassDial({ bearingDeg }: { bearingDeg: number }) {
  const size = 240;
  const center = size / 2;
  const radius = size / 2 - 16;

  const ticks = Array.from({ length: 36 }, (_, i) => i * 10);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Qibla bearing ${bearingDeg.toFixed(1)} degrees`}>
      <defs>
        <radialGradient id="dial-face" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.06" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="needle-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8c164" />
          <stop offset="100%" stopColor="#4fb3a6" />
        </linearGradient>
      </defs>

      <circle cx={center} cy={center} r={radius} fill="url(#dial-face)" className="text-ink-muted" />
      <circle cx={center} cy={center} r={radius} className="fill-none stroke-neutral-300 dark:stroke-night-600" strokeWidth={1.5} />

      {ticks.map((deg) => {
        const isCardinal = deg % 90 === 0;
        const len = isCardinal ? 10 : deg % 30 === 0 ? 7 : 4;
        const rad = (deg * Math.PI) / 180;
        const x1 = center + (radius - len) * Math.sin(rad);
        const y1 = center - (radius - len) * Math.cos(rad);
        const x2 = center + radius * Math.sin(rad);
        const y2 = center - radius * Math.cos(rad);
        return (
          <line
            key={deg}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            className={isCardinal ? "stroke-neutral-400 dark:stroke-neutral-500" : "stroke-neutral-300 dark:stroke-night-600"}
            strokeWidth={isCardinal ? 1.5 : 1}
          />
        );
      })}

      {["N", "E", "S", "W"].map((label, i) => {
        const angle = (i * 90 * Math.PI) / 180;
        const x = center + (radius - 22) * Math.sin(angle);
        const y = center - (radius - 22) * Math.cos(angle) + 4;
        return (
          <text
            key={label}
            x={x}
            y={y}
            textAnchor="middle"
            className={label === "N" ? "fill-gold-500 text-sm font-semibold" : "fill-neutral-500 text-xs dark:fill-neutral-400"}
          >
            {label}
          </text>
        );
      })}

      <motion.g
        initial={{ rotate: 0 }}
        animate={{ rotate: bearingDeg }}
        transition={{ type: "spring", stiffness: 60, damping: 12 }}
        style={{ transformOrigin: `${center}px ${center}px` }}
      >
        <line x1={center} y1={center} x2={center} y2={center - radius + 20} stroke="url(#needle-gradient)" strokeWidth={3.5} strokeLinecap="round" />
        <polygon
          points={`${center - 6},${center - radius + 30} ${center + 6},${center - radius + 30} ${center},${center - radius + 14}`}
          fill="url(#needle-gradient)"
        />
        <circle cx={center} cy={center - radius + 20} r={3} className="fill-moon-500" />
      </motion.g>

      <circle cx={center} cy={center} r={4} className="fill-neutral-900 dark:fill-neutral-100" />
    </svg>
  );
}

function formatRashdulTime(iso: string, timeZone: string | null) {
  return new Date(iso).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timeZone ?? "UTC",
  });
}

export default function QiblaPage() {
  const [lat, setLat] = useState(DEFAULT_CITY.lat);
  const [lon, setLon] = useState(DEFAULT_CITY.lon);
  const [result, setResult] = useState<QiblaResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [year, setYear] = useState(() => new Date().getFullYear());
  const [rashdul, setRashdul] = useState<RashdulQiblaResult | null>(null);
  const [rashdulError, setRashdulError] = useState<string | null>(null);
  const [rashdulLoading, setRashdulLoading] = useState(false);

  async function loadRashdul(e?: React.FormEvent) {
    e?.preventDefault();
    setRashdulLoading(true);
    setRashdulError(null);
    try {
      const r = await fetchRashdulQibla({ year });
      setRashdul(r);
    } catch (err) {
      setRashdulError(err instanceof ApiError ? err.message : "The calculation failed unexpectedly.");
    } finally {
      setRashdulLoading(false);
    }
  }

  async function compute(la: number, lo: number) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetchQibla({ lat: la, lon: lo });
      setResult(r);
      writeQueryParams({ lat: la, lon: lo });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The calculation failed unexpectedly.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRashdul();
    const params = readQueryParams();
    const qLat = params.get("lat");
    const qLon = params.get("lon");
    if (qLat && qLon) {
      setLat(Number(qLat));
      setLon(Number(qLon));
      compute(Number(qLat), Number(qLon));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await compute(lat, lon);
  }

  const timeZone = resolveTimeZone(lat, lon);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={CompassIcon}
        title="Qibla Direction"
        description="Great-circle bearing and distance to the Kaaba (21.4225°N, 39.8262°E) from any coordinate."
      />

      <Card className="p-5">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-3">
          <LocationPicker lat={lat} lon={lon} onChange={(newLat, newLon) => { setLat(newLat); setLon(newLon); }} />
          <Button type="submit" loading={loading} className="w-full">
            {!loading && <Search className="size-4" />}
            {loading ? "Computing…" : "Compute"}
          </Button>
        </form>
      </Card>

      {error && <ErrorBanner message={error} />}

      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="flex flex-col items-center gap-6 p-6 sm:flex-row sm:justify-around">
            <CompassDial bearingDeg={result.bearing_deg} />
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="flex items-center gap-1.5 text-ink-muted">
                  <CompassIcon className="size-3.5" /> Bearing (from true north)
                </dt>
                <dd className="text-2xl font-semibold font-mono">{result.bearing_deg.toFixed(2)}°</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-ink-muted">
                  <MapPin className="size-3.5" /> Distance to Mecca
                </dt>
                <dd className="text-2xl font-semibold font-mono">{result.distance_km.toFixed(1)} km</dd>
              </div>
            </dl>
          </Card>
          <div className="mt-4">
            <CopyLinkButton />
          </div>
        </motion.div>
      )}

      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <SunMedium className="size-4 text-gold-500" strokeWidth={2} />
          <h2 className="text-md font-semibold">Sun Calibration (Rashdul Qibla)</h2>
        </div>
        <p className="mb-4 text-sm text-ink-muted">
          Twice a year the Sun sits directly over the Kaaba. At that exact moment, anywhere the Sun is up, a vertical
          object&apos;s shadow points exactly opposite the qibla direction — no compass needed. Times below are shown
          in the local time zone for the location selected above.
        </p>

        <form onSubmit={loadRashdul} className="mb-4 flex items-end gap-3">
          <div className="w-32">
            <label className="mb-1.5 block text-2xs font-medium text-ink-muted">Year</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="h-11 w-full rounded-lg border border-neutral-300 bg-transparent px-3 text-sm dark:border-night-600/50"
            />
          </div>
          <Button type="submit" loading={rashdulLoading}>
            {!rashdulLoading && <Search className="size-4" />}
            {rashdulLoading ? "Loading…" : "Load"}
          </Button>
        </form>

        {rashdulError && <ErrorBanner message={rashdulError} />}

        {rashdul && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {rashdul.events.map((event) => (
              <div key={event.direction} className="rounded-xl border border-neutral-200 p-3.5 dark:border-night-700/60">
                <div className="text-2xs font-medium uppercase tracking-wide text-ink-muted">
                  {event.direction === "ascending" ? "Late May" : "Mid July"}
                </div>
                <div className="mt-1 font-mono text-lg">{formatRashdulTime(event.utc_time, timeZone)}</div>
                <div className="mt-1 text-sm text-ink-muted">
                  {timeZone ?? "UTC"}
                  {!timeZone && " (time zone lookup failed)"}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
