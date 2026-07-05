"use client";

import { motion } from "framer-motion";
import { CircleAlert } from "lucide-react";

export function ErrorBanner({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2.5 rounded-xl border border-red-300/50 bg-red-500/[0.07] px-4 py-3 text-sm text-red-700 dark:border-red-800/50 dark:text-red-300"
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={2} />
      {message}
    </motion.div>
  );
}
