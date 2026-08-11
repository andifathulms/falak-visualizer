import { Moon, Sunset, CalendarDays } from "lucide-react";

/**
 * The three things this app assumed its reader already knew, and never said.
 *
 * Without them the evening-observation model is incoherent: "the evening of the
 * 29th decides the 1st" only parses if you know a Hijri day starts at sunset and
 * that months run 29 or 30 days.
 *
 * Kept deliberately short. The first version of this ran four to six lines per
 * card and pushed the actual tool off the first screen, which is a bad trade:
 * an explanation nobody scrolls past is worse than a shorter one they read.
 * Each card is now one sentence of what, one of why it matters. The fuller
 * treatment lives where it is actually needed - the derivation trace on the
 * converter walks the same logic with real numbers attached.
 *
 * Titles are short enough to sit on one line at every breakpoint, and the grid
 * uses subgrid so the body copy still aligns across cards if one of them ever
 * does wrap. Without that, a two-line heading pushes only its own paragraph
 * down and the row reads as ragged.
 */
const FACTS = [
  {
    icon: Sunset,
    title: "Days change at sunset",
    body: "A Hijri date begins when the Sun goes down, not at midnight. That is why every calculation here lands on a sunset, and why the date it returns is the following Gregorian day.",
  },
  {
    icon: CalendarDays,
    title: "Months are 29 or 30 days",
    body: "A lunar month is about 29.53 days, so it cannot be fixed. The crescent is looked for on the 29th evening; if it is not established, the month simply takes a 30th day.",
  },
  {
    icon: Moon,
    title: "Conjunction starts the search",
    body: "Ijtimak is when the Moon passes the Sun — no crescent exists before it, but none is visible yet either. How long after it a month begins is exactly what the criteria disagree about.",
  },
];

export function HowMonthsWork() {
  return (
    <section
      aria-labelledby="how-months-work"
      className="rounded-xl border border-neutral-200 p-4 dark:border-night-700/60"
    >
      <h2 id="how-months-work" className="text-2xs font-semibold uppercase tracking-wide text-ink-muted">
        How a Hijri month starts
      </h2>
      <dl className="mt-2.5 grid gap-x-6 gap-y-3 sm:grid-cols-3 sm:grid-rows-[auto_auto]">
        {FACTS.map((f) => (
          // Each card spans both rows of the parent and inherits its tracks, so
          // every title sits in the first row and every body starts on the
          // second - aligned regardless of how tall any one title turns out.
          <div key={f.title} className="sm:row-span-2 sm:grid sm:grid-rows-subgrid sm:gap-0">
            <dt className="flex items-center gap-1.5 text-sm font-semibold">
              <f.icon className="size-3.5 shrink-0 text-accent" strokeWidth={2} />
              {f.title}
            </dt>
            <dd className="mt-1 text-sm text-ink-muted">{f.body}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
