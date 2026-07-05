"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { INDONESIAN_CITIES } from "@/lib/locations";
import { Field, inputClasses } from "@/components/ui/Field";

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
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <select
            value={mode}
            onChange={(e) => handleSelect(e.target.value)}
            className={`${inputClasses} pl-9`}
          >
            {INDONESIAN_CITIES.map((city) => (
              <option key={city.name} value={city.name}>
                {city.name}
              </option>
            ))}
            <option value={CUSTOM_VALUE}>Custom coordinates…</option>
          </select>
        </div>
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
