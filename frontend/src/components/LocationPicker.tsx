"use client";

import { Fragment, useState } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronsUpDown, MapPin, Pencil } from "lucide-react";
import { INDONESIAN_CITIES } from "@/lib/locations";
import { Field, inputClasses } from "@/components/ui/Field";
import { cn } from "@/lib/cn";

const CUSTOM_VALUE = "__custom__";

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

  function handleSelect(value: string) {
    setMode(value);
    if (value !== CUSTOM_VALUE) {
      const city = INDONESIAN_CITIES.find((c) => c.name === value);
      if (city) onChange(city.lat, city.lon);
    }
  }

  return (
    <div className="space-y-3 sm:col-span-2">
      <Field label="Location">
        <Listbox value={mode} onChange={handleSelect}>
          <div className="relative">
            <Listbox.Button className={cn(inputClasses, "relative flex w-full items-center gap-2 pl-9 text-left")}>
              <MapPin className="pointer-events-none absolute left-3 size-4 text-neutral-400" />
              <span className="block truncate">
                {mode === CUSTOM_VALUE ? "Custom coordinates…" : mode}
              </span>
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

      <AnimatePresence initial={false}>
        {mode === CUSTOM_VALUE && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-2 gap-3 overflow-hidden"
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
