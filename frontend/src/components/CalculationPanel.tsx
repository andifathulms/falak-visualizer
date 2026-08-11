"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Calculator } from "lucide-react";

export function CalculationPanel({ rows }: { rows: Array<[string, string | number]> }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200 dark:border-night-700/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-500/5 dark:text-neutral-300"
      >
        <span className="flex items-center gap-2">
          <Calculator className="size-4 text-moon-500" strokeWidth={2} />
          {open ? "Hide calculation" : "Show calculation"}
        </span>
        <ChevronDown
          className="size-4 text-ink-muted transition-transform duration-300"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 border-t border-neutral-200 px-4 py-3 text-sm sm:grid-cols-2 dark:border-night-700/60">
              {rows.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 sm:justify-start">
                  <dt className="text-ink-muted">{label}</dt>
                  <dd className="font-mono text-neutral-900 dark:text-neutral-100">{value}</dd>
                </div>
              ))}
            </dl>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
