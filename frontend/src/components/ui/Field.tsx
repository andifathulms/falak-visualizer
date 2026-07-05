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
      <span className="mb-1.5 block font-medium text-neutral-600 dark:text-neutral-400">{label}</span>
      {children}
    </label>
  );
}

export const inputClasses =
  "block w-full rounded-lg border border-neutral-300 bg-white/80 px-3 py-2.5 text-sm text-neutral-900 shadow-sm outline-none transition-colors focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 dark:border-night-600/50 dark:bg-night-800/60 dark:text-neutral-100 dark:focus:border-gold-400";
