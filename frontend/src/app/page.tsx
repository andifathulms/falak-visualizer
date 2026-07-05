"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, Compass, Map, MoonStar, Sun } from "lucide-react";
import { HisabDisclaimer } from "@/components/HisabDisclaimer";
import { Card } from "@/components/ui/Card";
import { BrandMark } from "@/components/BrandMark";

const TOOLS = [
  {
    href: "/converter",
    title: "Hijri ↔ Gregorian Converter",
    description: "Bidirectional date conversion using real astronomical month boundaries.",
    icon: Calendar,
  },
  {
    href: "/hilal-visibility",
    title: "Hilal Visibility",
    description: "Altitude, elongation, moon age and verdicts across three criteria, for any date and location.",
    icon: MoonStar,
  },
  {
    href: "/visibility-map",
    title: "Visibility Map",
    description: "Indonesia-wide choropleth of calculated hilal visibility for a given evening.",
    icon: Map,
  },
  {
    href: "/prayer-times",
    title: "Prayer Times",
    description: "Daily fajr/sunrise/dhuhr/asr/maghrib/isha from solar position (Kemenag RI convention).",
    icon: Sun,
  },
  {
    href: "/qibla",
    title: "Qibla Direction",
    description: "Great-circle bearing and distance to the Kaaba from any coordinate.",
    icon: Compass,
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function HomePage() {
  return (
    <div className="space-y-10">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative overflow-hidden rounded-3xl border border-neutral-200/70 px-6 py-12 dark:border-night-700/60 dark:bg-gradient-to-br dark:from-night-850 dark:to-night-900 sm:px-12 sm:py-16"
      >
        <div className="relative flex flex-col items-start gap-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-gold-500/10 px-3 py-1 text-xs font-medium text-gold-600 dark:text-gold-400">
            <BrandMark className="size-4" />
            Deterministic astronomy engine, not a black box
          </div>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            See <span className="bg-gradient-to-r from-gold-400 to-moon-500 bg-clip-text text-transparent">why</span>{" "}
            a Hijri month starts when it does.
          </h1>
          <p className="max-w-xl text-base text-neutral-600 dark:text-neutral-400">
            Falak computes Hijri dates, hilal visibility, prayer times, and qibla direction from real solar and
            lunar position formulas — every output traceable to a verifiable calculation, never a black box.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/hilal-visibility"
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-gold-400 to-gold-600 px-5 py-2.5 text-sm font-medium text-night-950 shadow-md shadow-gold-500/20 transition-all hover:shadow-lg hover:shadow-gold-500/30"
            >
              Check hilal visibility
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/converter"
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-neutral-500/10 dark:border-night-600/60"
            >
              Convert a date
            </Link>
          </div>
        </div>
      </motion.section>

      <HisabDisclaimer />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        {TOOLS.map((tool) => (
          <motion.div key={tool.href} variants={item}>
            <Link href={tool.href} className="block h-full">
              <Card className="group h-full p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-gold-500/40 hover:shadow-lg hover:shadow-gold-500/5">
                <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-gold-400/20 to-moon-500/20 text-gold-600 transition-transform group-hover:scale-110 dark:text-gold-400">
                  <tool.icon className="size-5" strokeWidth={1.8} />
                </div>
                <h2 className="font-medium">{tool.title}</h2>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{tool.description}</p>
                <div className="mt-3 flex items-center gap-1 text-sm font-medium text-gold-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-gold-400">
                  Open <ArrowRight className="size-3.5" />
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
