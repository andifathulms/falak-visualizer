"use client";

import { motion } from "framer-motion";
import { CircleAlert } from "lucide-react";

/**
 * An explicit failure state (CLAUDE.md: no silent fallback). `message` is what
 * the reader needs - what happened and what to do, in Indonesian. `detail` is
 * the engine's own technical message, kept one tap away for anyone checking
 * the calculation rather than shown in place of an explanation.
 */
export function ErrorBanner({ message, detail }: { message: string; detail?: string }) {
  return (
    // role="alert": a failure should interrupt - the reader is otherwise
    // waiting for output that is never going to arrive.
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      // No separate "error" hue: verdict-dark is this app's colour for "the
      // calculation could not establish an answer".
      className="flex items-start gap-3 rounded-card border border-verdict-dark/30 bg-verdict-dark/[0.08] px-4 py-3.5 text-sm text-ink"
    >
      <CircleAlert className="mt-0.5 size-[18px] shrink-0 text-verdict-dark" strokeWidth={2} aria-hidden="true" />
      <div className="min-w-0 space-y-1">
        <p>{message}</p>
        {detail && (
          <details className="text-xs text-ink-muted">
            <summary className="cursor-pointer underline decoration-dotted underline-offset-2">Detail teknis</summary>
            <p className="mt-1 break-words font-mono">{detail}</p>
          </details>
        )}
      </div>
    </motion.div>
  );
}
