"use client";

import { Fragment, useState } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronsUpDown, Loader2, LocateFixed, MapPin, Pencil } from "lucide-react";
import { INDONESIAN_CITIES } from "@/lib/locations";
import { Field, inputClasses } from "@/components/ui/Field";
import { cn } from "@/lib/cn";

const CUSTOM_VALUE = "__custom__";
const GPS_VALUE = "__gps__";

export function LocationPicker({
  lat,
  lon,
  onChange,
}: {
  lat: number;
  lon: number;
  onChange: (lat: number, lon: number) => void;
}) {
  const matchedCity = INDONESIAN_CITIES.find((c) => c.lat === lat && c.lon === lon);
  const [mode, setMode] = useState<string>(matchedCity ? matchedCity.name : CUSTOM_VALUE);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  function handleSelect(value: string) {
    setGeoError(null);
    setMode(value);
    if (value !== CUSTOM_VALUE) {
      const city = INDONESIAN_CITIES.find((c) => c.name === value);
      if (city) onChange(city.lat, city.lon);
    }
  }

  function useMyLocation() {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setGeoError("Geolocation isn't supported by this browser.");
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange(position.coords.latitude, position.coords.longitude);
        setMode(GPS_VALUE);
        setLocating(false);
      },
      (err) => {
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied - allow it in your browser settings, or pick a city instead."
            : "Couldn't get your location. Pick a city instead.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  }

  const buttonLabel =
    mode === CUSTOM_VALUE ? "Custom coordinates…" : mode === GPS_VALUE ? "My current location" : mode;

  return (
    <div className="sm:col-span-2">
      <div className="relative">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Field label="Location">
              <Listbox value={mode} onChange={handleSelect}>
                <div className="relative">
                  <Listbox.Button
                    className={cn(inputClasses, "relative flex w-full items-center gap-2 pl-9 text-left")}
                  >
                    <MapPin className="pointer-events-none absolute left-3 size-4 text-neutral-400" />
                    <span className="block truncate">{buttonLabel}</span>
                    <ChevronsUpDown className="ml-auto size-4 shrink-0 text-neutral-400" />
                  </Listbox.Button>
                  <Transition
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <Listbox.Options className="glass-card absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-xl py-1 text-sm shadow-lg shadow-black/10 focus:outline-none dark:shadow-black/40">
                      {INDONESIAN_CITIES.map((city) => (
                        <Listbox.Option
                          key={city.name}
                          value={city.name}
                          className={({ active, selected }) =>
                            cn(
                              "flex cursor-pointer items-center gap-2 px-3 py-2",
                              active && "bg-gold-500/10",
                              selected && "text-gold-600 dark:text-gold-400",
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
                      <div className="my-1 border-t border-neutral-200 dark:border-night-700/60" />
                      <Listbox.Option
                        value={CUSTOM_VALUE}
                        className={({ active, selected }) =>
                          cn(
                            "flex cursor-pointer items-center gap-2 px-3 py-2",
                            active && "bg-gold-500/10",
                            selected && "text-gold-600 dark:text-gold-400",
                          )
                        }
                      >
                        {({ selected }) => (
                          <>
                            <Pencil className={cn("size-3.5", selected ? "opacity-100" : "opacity-0")} />
                            Custom coordinates…
                          </>
                        )}
                      </Listbox.Option>
                    </Listbox.Options>
                  </Transition>
                </div>
              </Listbox>
            </Field>
          </div>

          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            title="Use my current location"
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-lg border border-neutral-300 px-3 text-sm font-medium text-neutral-600 transition-colors hover:border-gold-500/50 hover:text-gold-600 disabled:opacity-60 dark:border-night-600/50 dark:text-neutral-400 dark:hover:text-gold-400"
          >
            {locating ? <Loader2 className="size-4 animate-spin" /> : <LocateFixed className="size-4" />}
            <span className="hidden sm:inline">My location</span>
          </button>
        </div>

        {/* Absolutely positioned so this caption's height never affects sibling
            grid cells (e.g. the submit button) via items-end alignment. */}
        {(geoError || (mode === GPS_VALUE && !geoError)) && (
          <p
            className={cn(
              "absolute left-0 top-full mt-1.5 text-xs",
              geoError ? "text-red-500 dark:text-red-400" : "text-neutral-500 dark:text-neutral-400",
            )}
          >
            {geoError ?? `Using your device location: ${lat.toFixed(4)}, ${lon.toFixed(4)}`}
          </p>
        )}
      </div>

      <AnimatePresence initial={false}>
        {mode === CUSTOM_VALUE && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 grid grid-cols-2 gap-3 overflow-hidden"
          >
            <Field label="Latitude">
              <input
                type="number"
                step="0.0001"
                value={lat}
                onChange={(e) => onChange(Number(e.target.value), lon)}
                className={inputClasses}
              />
            </Field>
            <Field label="Longitude">
              <input
                type="number"
                step="0.0001"
                value={lon}
                onChange={(e) => onChange(lat, Number(e.target.value))}
                className={inputClasses}
              />
            </Field>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
