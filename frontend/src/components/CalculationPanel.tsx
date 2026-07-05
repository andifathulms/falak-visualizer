"use client";

import { useState } from "react";

export function CalculationPanel({ rows }: { rows: Array<[string, string | number]> }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3 rounded-md border border-neutral-200 dark:border-neutral-800">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-2 text-left text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-900"
      >
        {open ? "Hide calculation" : "Show calculation"}
      </button>
      {open && (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 border-t border-neutral-200 px-4 py-3 text-sm sm:grid-cols-2 dark:border-neutral-800">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 sm:justify-start">
              <dt className="text-neutral-500 dark:text-neutral-400">{label}</dt>
              <dd className="font-mono text-neutral-900 dark:text-neutral-100">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
