"use client";

import { Fragment, useEffect, useState } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { Check, ChevronsUpDown, Loader2, LocateFixed, MapPin, Pencil } from "lucide-react";
import { INDONESIAN_CITIES } from "@/lib/locations";
import { cn } from "@/lib/cn";
import { useObservation } from "@/components/ObservationProvider";

const CUSTOM_VALUE = "__custom__";

/**
 * The persistent place+date bar (DESIGN.md §4.3), rendered once in the root
 * layout below the nav. Copy is Indonesian per DESIGN.md §7's decided
 * language direction - wrapped in its own lang="id" rather than flipping
 * the document's <html lang>, since most of the app's existing page
 * content is still English until steps 5-8 rewrite it (see MIGRATION.md's
 * note on this component).
 *
 * Transitional note: mounting this here makes it appear on every route
 * immediately, INCLUDING the nine still-live pre-migration pages, each of
 * which still has its own separate LocationPicker-based form for now. That
 * overlap is expected mid-migration, not a design intent - those forms are
 * deleted as each page is absorbed into /hilal, /kalender, /langit
 * (DESIGN.md §9.5-§9.7), at which point this bar becomes their only place
 * and date input, per §4.3: "Delete every per-page location form and every
 * submit button that only existed to gate a calculation."
 */
export function ContextBar() {
  const { lat, lon, dateIso, matchedCity, hijri, geo, setCity, setCustomCoords, setDate, requestGeolocation } =
    useObservation();

  const [customMode, setCustomMode] = useState(matchedCity === null);
  useEffect(() => {
    setCustomMode(matchedCity === null);
  }, [matchedCity]);

  function handleSelect(value: string) {
    if (value === CUSTOM_VALUE) {
      setCustomMode(true);
      return;
    }
    const city = INDONESIAN_CITIES.find((c) => c.name === value);
    if (city) setCity(city);
  }

  const buttonLabel = matchedCity ? matchedCity.name : `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;

  const formattedGregorian = new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(
    new Date(`${dateIso}T00:00:00`),
  );

  return (
    <div lang="id" className="border-b border-border bg-surface-card/60">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 text-sm sm:px-6">
        <div className="relative flex items-center gap-2">
          <Listbox value={matchedCity ? matchedCity.name : CUSTOM_VALUE} onChange={handleSelect}>
            <div className="relative">
              <Listbox.Button className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 font-medium text-ink transition-colors hover:bg-accent-solid/10">
                <MapPin className="size-4 text-ink-muted" aria-hidden="true" />
                <span>{buttonLabel}</span>
                <ChevronsUpDown className="size-3.5 text-ink-muted" aria-hidden="true" />
              </Listbox.Button>
              <Transition
                as={Fragment}
                leave="transition ease-in duration-fast"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Listbox.Options className="glass-card absolute z-30 mt-2 max-h-64 w-56 overflow-auto rounded-xl py-1 text-sm shadow-lg shadow-black/10 focus:outline-none dark:shadow-black/40">
                  {INDONESIAN_CITIES.map((city) => (
                    <Listbox.Option
                      key={city.name}
                      value={city.name}
                      className={({ active, selected }) =>
                        cn(
                          "flex cursor-pointer items-center gap-2 px-3 py-2",
                          active && "bg-accent-solid/10",
                          selected && "text-accent",
                        )
                      }
                    >
                      {({ selected }) => (
                        <>
                          <Check className={cn("size-3.5", selected ? "opacity-100" : "opacity-0")} />
                          {city.name}
                        </>
                      )}
                    </Listbox.Option>
                  ))}
                  <div className="my-1 border-t border-border" />
                  <Listbox.Option
                    value={CUSTOM_VALUE}
                    className={({ active, selected }) =>
                      cn(
                        "flex cursor-pointer items-center gap-2 px-3 py-2",
                        active && "bg-accent-solid/10",
                        selected && "text-accent",
                      )
                    }
                  >
                    {({ selected }) => (
                      <>
                        <Pencil className={cn("size-3.5", selected ? "opacity-100" : "opacity-0")} />
                        Koordinat kustom…
                      </>
                    )}
                  </Listbox.Option>
                </Listbox.Options>
              </Transition>
            </div>
          </Listbox>

          <button
            type="button"
            onClick={requestGeolocation}
            disabled={geo.locating}
            title="Gunakan lokasi saya"
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-ink-muted transition-colors hover:text-accent disabled:opacity-60"
          >
            {geo.locating ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <LocateFixed className="size-4" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">Lokasi saya</span>
          </button>

          {geo.error && <p className="text-xs text-verdict-negative">{geo.error}</p>}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateIso}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="rounded-lg bg-transparent px-2 py-1.5 font-mono text-sm text-ink"
            aria-label="Tanggal"
          />
          <span className="text-ink-muted">·</span>
          <span className="text-ink" title={formattedGregorian}>
            {hijri.error ? (
              <span className="text-verdict-negative">Tanggal di luar rentang efemeris</span>
            ) : (
              `${hijri.label} H`
            )}
          </span>
        </div>

        {customMode && (
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <label className="flex items-center gap-1">
              Lat
              <input
                type="number"
                step="0.0001"
                value={lat}
                onChange={(e) => setCustomCoords(Number(e.target.value), lon)}
                className="w-20 rounded-md border border-border bg-transparent px-1.5 py-1 font-mono"
              />
            </label>
            <label className="flex items-center gap-1">
              Lon
              <input
                type="number"
                step="0.0001"
                value={lon}
                onChange={(e) => setCustomCoords(lat, Number(e.target.value))}
                className="w-20 rounded-md border border-border bg-transparent px-1.5 py-1 font-mono"
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
