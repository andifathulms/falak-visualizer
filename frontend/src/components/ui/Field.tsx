import { cn } from "@/lib/cn";
import type { LabelHTMLAttributes, ReactNode } from "react";

export function Field({
  label,
  children,
  className,
  ...props
}: { label: string; children: ReactNode } & LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("block text-sm", className)} {...props}>
      <span className="mb-1.5 block font-medium text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

// h-11 is load-bearing, not decorative: a native <input> and a <button>
// (used for the Listbox/Select triggers) don't resolve to the same height
// from identical padding alone - browser UA defaults for buttons differ
// enough to visibly misalign a row of mixed input/button controls. Fixing
// the height removes the discrepancy instead of trying to pad around it.
export const inputClasses =
  "block h-11 w-full rounded-lg border border-neutral-300 bg-white/80 px-3 py-2.5 text-sm text-neutral-900 shadow-sm outline-none transition-colors focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 dark:border-night-600/50 dark:bg-night-800/60 dark:text-neutral-100 dark:focus:border-gold-400";
