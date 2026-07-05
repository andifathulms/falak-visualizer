import Link from "next/link";
import { HisabDisclaimer } from "@/components/HisabDisclaimer";

const TOOLS = [
  {
    href: "/converter",
    title: "Hijri ↔ Gregorian Converter",
    description: "Bidirectional date conversion using real astronomical month boundaries.",
  },
  {
    href: "/hilal-visibility",
    title: "Hilal Visibility",
    description: "Altitude, elongation, moon age and verdicts across three criteria, for any date and location.",
  },
  {
    href: "/visibility-map",
    title: "Visibility Map",
    description: "Indonesia-wide choropleth of calculated hilal visibility for a given evening.",
  },
  {
    href: "/prayer-times",
    title: "Prayer Times",
    description: "Daily fajr/sunrise/dhuhr/asr/maghrib/isha from solar position (Kemenag RI convention).",
  },
  {
    href: "/qibla",
    title: "Qibla Direction",
    description: "Great-circle bearing and distance to the Kaaba from any coordinate.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Falak</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          A deterministic, astronomically-grounded platform for Hijri calendar conversion, hilal visibility
          analysis, prayer times, and qibla direction — every output traceable to a verifiable formula, never a
          black box.
        </p>
      </div>

      <HisabDisclaimer />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="rounded-lg border border-neutral-200 p-4 transition hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
          >
            <h2 className="font-medium">{tool.title}</h2>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{tool.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
