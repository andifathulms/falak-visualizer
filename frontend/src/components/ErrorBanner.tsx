"use client";

import { motion } from "framer-motion";
import { CircleAlert } from "lucide-react";

export function ErrorBanner({ message }: { message: string }) {
  return (
    // role="alert" is assertive by definition: unlike a result, a failure
    // should interrupt, because the user is about to wait for output that is
    // never going to arrive. No native element announces its own appearance.
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      // No dedicated "error" hue in the maghrib palette (DESIGN.md §3.1) -
      // reusing verdict-dark (the cool, "not established" tone) rather than
      // introducing a fourth colour family for a state that is, in this
      // app's own terms, "the calculation could not establish an answer".
      className="flex items-start gap-2.5 rounded-xl border border-verdict-dark/30 bg-verdict-dark/[0.07] px-4 py-3 text-sm text-verdict-dark"
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={2} />
      {message}
    </motion.div>
  );
}
