"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatLongDate, shiftIsoDate, todayIsoIn } from "@/lib/localDate";
import { cn } from "@/lib/cn";

/**
 * A day control owned by the page that needs it (DESIGN.md v2 §1.2): step a
 * day either way, jump back to today, or open the native date picker by
 * tapping the date itself.
 */
export function DateStepper({
  value,
  onChange,
  timeZone,
  className,
}: {
  value: string;
  onChange: (dateIso: string) => void;
  timeZone: string | null;
  className?: string;
}) {
  const today = todayIsoIn(timeZone);
  const isToday = value === today;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <button
        type="button"
        onClick={() => onChange(shiftIsoDate(value, -1))}
        className="flex size-10 items-center justify-center rounded-full border border-border bg-surface-card text-ink-muted transition-colors hover:text-ink"
        aria-label="Hari sebelumnya"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>
      <label className="relative flex h-10 min-w-0 cursor-pointer items-center rounded-full border border-border bg-surface-card px-4 text-sm font-semibold text-ink hover:border-border-strong focus-within:border-accent-solid">
        <span className="truncate">{formatLongDate(value)}</span>
        <input
          type="date"
          value={value}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Pilih tanggal"
        />
      </label>
      <button
        type="button"
        onClick={() => onChange(shiftIsoDate(value, 1))}
        className="flex size-10 items-center justify-center rounded-full border border-border bg-surface-card text-ink-muted transition-colors hover:text-ink"
        aria-label="Hari berikutnya"
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
      {!isToday && (
        <button
          type="button"
          onClick={() => onChange(today)}
          className="ml-1 h-10 rounded-full px-3 text-sm font-semibold text-accent hover:bg-accent-solid/10"
        >
          Hari ini
        </button>
      )}
    </div>
  );
}
