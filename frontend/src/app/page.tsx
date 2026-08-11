"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, Check, Compass, Map, MoonStar, Sun } from "lucide-react";
import { HisabDisclaimer } from "@/components/HisabDisclaimer";
import { Card } from "@/components/ui/Card";
import { BrandMark } from "@/components/BrandMark";
import { SampleResult } from "@/components/SampleResult";

// Each description leads with the question the tool answers, in words that
// assume no prior vocabulary, and only then names what it computes. The
// previous copy did the reverse - it opened on "bidirectional conversion",
// "choropleth", "great-circle bearing" - which reads as a spec sheet to anyone
// who is not already inside the subject.
const TOOLS = [
  {
    href: "/converter",
    title: "Hijri ↔ Gregorian Converter",
    description:
      "What was this date in the other calendar? Converts either way, using real astronomical month boundaries rather than a fixed arithmetic table.",
    icon: Calendar,
  },
  {
    href: "/hilal-visibility",
    title: "Hilal Visibility",
    description:
      "Can the new crescent be seen from here tonight? Gives the altitude, elongation and moon age, then the verdict from three different criteria.",
    icon: MoonStar,
  },
  {
    href: "/visibility-map",
    title: "Visibility Map",
    description:
      "Where in Indonesia is the crescent visible on a given evening? A shaded map of the whole country for one date.",
    icon: Map,
  },
  {
    href: "/prayer-times",
    title: "Prayer Times",
    description:
      "When are today's prayers here? Fajr through isha, worked out from the sun's position (Kemenag RI convention).",
    icon: Sun,
  },
  {
    href: "/qibla",
    title: "Qibla Direction",
    description:
      "Which way is the Kaaba from here? The compass bearing to face, and how far away Mecca is.",
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
        {/* Two columns from lg up: the argument on the left, the evidence for it
            on the right. Below lg the sample panel drops under the buttons
            rather than being hidden, since on a phone it is the fastest way to
            see what the app produces. */}
        <div className="relative grid items-center gap-8 lg:grid-cols-[1.15fr_minmax(0,0.85fr)] lg:gap-10">
          <div className="flex flex-col items-start gap-5">
            {/* The eyebrow states the category, because nothing else on the page
                can. A first-time visitor needs "what kind of thing is this" before
                any claim about how it is built will mean anything to them. */}
            <div className="inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-gold-500/10 px-3 py-1 text-2xs font-medium text-accent">
              <BrandMark className="size-4" />
              Islamic calendar &amp; astronomy calculator · Indonesia
            </div>
            <h1 className="max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
              Hijri dates and prayer times, with the{" "}
              <span className="text-gradient-accent">
                astronomy shown
              </span>
              .
            </h1>
            {/* Specialist terms are glossed inline on first use. The visitor who
                already knows them loses nothing; the one who does not can still
                follow the sentence, which was not true before. */}
            <p className="max-w-xl text-md text-ink-muted">
              Falak works out when each Hijri month begins, whether the hilal — the young crescent moon — is
              visible from where you are, when to pray, and which way the Kaaba lies. Every answer opens up to
              show the altitude, elongation and timings it came from.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/hilal-visibility"
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-gold-400 to-gold-600 px-5 py-2.5 text-sm font-medium text-night-950 shadow-md shadow-gold-500/20 transition-all hover:shadow-lg hover:shadow-gold-500/30"
              >
                Check tonight&apos;s hilal
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/converter"
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-neutral-500/10 dark:border-night-600/60"
              >
                Convert a date
              </Link>
            </div>
            {/* The three things a stranger wants to know before clicking, and
                which the page previously never answered: what it costs, whether
                they have to sign up, and where their location data goes. */}
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
              {["Free to use", "No account needed", "Calculated in your browser"].map((fact) => (
                <li key={fact} className="flex items-center gap-1.5">
                  <Check className="size-3.5 shrink-0 text-verdict-positive" strokeWidth={2.5} />
                  {fact}
                </li>
              ))}
            </ul>
          </div>

          <SampleResult />
        </div>
      </motion.section>

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
                <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-gold-400/20 to-moon-500/20 text-accent transition-transform group-hover:scale-110">
                  <tool.icon className="size-5" strokeWidth={1.8} />
                </div>
                <h2 className="text-md font-semibold">{tool.title}</h2>
                <p className="mt-1 text-sm text-ink-muted">{tool.description}</p>
                <div className="mt-3 flex items-center gap-1 text-sm font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
                  Open <ArrowRight className="size-3.5" />
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* Below the grid, not above it: on a page with no computed output there
          is nothing yet to caution, and leading with the alert made the loudest
          element on the landing view one the visitor could not yet parse. */}
      <HisabDisclaimer variant="compact" />
    </div>
  );
}
