"use client";

import { useMemo, useState } from "react";
import { CloseButton, Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { Check, ChevronDown, Loader2, LocateFixed, MapPin, Search } from "lucide-react";
import { useObservation } from "@/components/ObservationProvider";
import { INDONESIAN_CITIES, REGIONS } from "@/lib/locations";
import { nearestCity } from "@/lib/observation";
import { cn } from "@/lib/cn";

/**
 * Place is the one global context (DESIGN.md v2 §1.2): a chip in the header
 * that opens a panel with search, the city list grouped west to east, "Lokasi
 * saya", and exact coordinates for anyone who needs them. The state itself
 * lives in ObservationProvider (URL + localStorage); this is only its UI.
 */
export function PlaceChip() {
  const { lat, lon, matchedCity, geo, setCity, setCustomCoords, requestGeolocation } = useObservation();
  const [query, setQuery] = useState("");

  const nearest = matchedCity === null ? nearestCity(lat, lon) : null;
  const label = matchedCity ? matchedCity.name : `±${Math.round(nearest!.distanceKm)} km dari ${nearest!.city.name}`;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? INDONESIAN_CITIES.filter((c) => c.name.toLowerCase().includes(q)) : INDONESIAN_CITIES;
  }, [query]);

  return (
    <Popover className="relative min-w-0">
      <PopoverButton
        className="flex min-w-0 max-w-[11rem] items-center gap-1.5 rounded-full border border-border bg-surface-card px-3 py-2 text-sm font-semibold text-ink transition-colors duration-fast hover:border-border-strong data-[open]:border-accent-solid sm:max-w-[16rem]"
        aria-label={`Lokasi: ${label}. Ganti lokasi`}
      >
        <MapPin className="size-4 shrink-0 text-accent" strokeWidth={2.2} aria-hidden="true" />
        <span className="truncate">{label}</span>
        <ChevronDown className="size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
      </PopoverButton>

      <PopoverPanel
        anchor={{ to: "bottom end", gap: 8, padding: 12 }}
        transition
        className="z-50 flex max-h-[min(34rem,80vh)] w-[min(22rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-card border border-border bg-surface-card shadow-2xl shadow-black/20 transition duration-fast ease-out data-[closed]:translate-y-1 data-[closed]:opacity-0"
      >
        <div className="space-y-2 border-b border-border p-3">
          <CloseButton
            as="button"
            type="button"
            onClick={requestGeolocation}
            disabled={geo.locating}
            className="flex w-full items-center gap-2.5 rounded-control bg-accent-solid/10 px-3 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent-solid/15 disabled:opacity-60"
          >
            {geo.locating ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <LocateFixed className="size-4" aria-hidden="true" />
            )}
            Gunakan lokasi saya
          </CloseButton>
          <label className="flex items-center gap-2 rounded-control border border-border bg-surface-page px-3 py-2 focus-within:border-accent-solid">
            <Search className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
            <span className="sr-only">Cari kota</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari kota…"
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
            />
          </label>
          {geo.error && <p className="text-xs text-verdict-dark">{geo.error}</p>}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto py-1">
          {REGIONS.map((region) => {
            const cities = filtered.filter((c) => c.region === region);
            if (cities.length === 0) return null;
            return (
              <div key={region}>
                <p className="px-4 pb-1 pt-3 text-2xs font-bold uppercase tracking-wider text-ink-muted">{region}</p>
                {cities.map((city) => {
                  const selected = matchedCity?.name === city.name;
                  return (
                    <CloseButton
                      key={city.name}
                      as="button"
                      type="button"
                      onClick={() => {
                        setCity(city);
                        setQuery("");
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors hover:bg-surface-raised",
                        selected && "font-semibold text-accent",
                      )}
                    >
                      <Check className={cn("size-3.5 shrink-0", selected ? "opacity-100" : "opacity-0")} aria-hidden="true" />
                      {city.name}
                    </CloseButton>
                  );
                })}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-ink-muted">
              Kota tidak ditemukan. Pakai lokasi Anda atau isi koordinat di bawah.
            </p>
          )}
        </div>

        <details className="border-t border-border px-4 py-3 text-sm">
          <summary className="cursor-pointer font-semibold text-ink-muted">Koordinat tepat</summary>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="text-xs text-ink-muted">
              Lintang
              <input
                type="number"
                step="0.0001"
                min={-90}
                max={90}
                value={lat}
                onChange={(e) => e.target.value !== "" && setCustomCoords(Number(e.target.value), lon)}
                className="mt-1 w-full rounded-control border border-border bg-surface-page px-2 py-1.5 font-mono text-sm text-ink"
              />
            </label>
            <label className="text-xs text-ink-muted">
              Bujur
              <input
                type="number"
                step="0.0001"
                min={-180}
                max={180}
                value={lon}
                onChange={(e) => e.target.value !== "" && setCustomCoords(lat, Number(e.target.value))}
                className="mt-1 w-full rounded-control border border-border bg-surface-page px-2 py-1.5 font-mono text-sm text-ink"
              />
            </label>
          </div>
        </details>
      </PopoverPanel>
    </Popover>
  );
}
