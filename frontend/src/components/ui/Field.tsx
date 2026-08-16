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
  "block h-11 w-full rounded-lg border border-border bg-surface-card px-3 py-2.5 text-sm text-ink shadow-sm outline-none transition-colors duration-fast focus:border-accent-solid focus:ring-2 focus:ring-accent-solid/20";
