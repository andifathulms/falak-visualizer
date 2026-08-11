"use client";

import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

export function PageHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex items-start gap-3"
    >
      <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold-400/20 to-moon-500/20 text-accent">
        <Icon className="size-5" strokeWidth={1.8} />
      </div>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-ink-muted">{description}</p>
      </div>
    </motion.div>
  );
}
