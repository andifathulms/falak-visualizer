import { Moon, Sunset, CalendarDays } from "lucide-react";

/**
 * The three things this app assumed its reader already knew, and never said.
 *
 * Without them the entire evening-observation model is incoherent: "the evening
 * of the 29th decides the 1st" only parses if you already know that a Hijri day
 * starts at sunset and that months run 29 or 30 days. The app said neither
 * anywhere in its UI - the closest was a parenthetical inside one page
 * description.
 *
 * Deliberately not an about page or a modal. It sits inline above the controls
 * on the pages whose numbers depend on it, so a reader meets the premise before
 * the result rather than having to go looking for it afterwards.
 */
const FACTS = [
  {
    icon: Sunset,
    title: "The day changes at sunset",
    body: "A Hijri date does not begin at midnight. It begins when the Sun goes down. So a crescent sighted on the evening of the 9th means the 10th has already started — which is why every calculation here lands on a sunset, and why the date that comes out is the following Gregorian day.",
  },
  {
    icon: CalendarDays,
    title: "Months are 29 or 30 days, never fixed",
    body: "A lunar month is about 29.53 days, so it cannot be a whole number. On the 29th evening the crescent is looked for: if it is established the next day is the 1st of the new month, and if not the current month simply takes a 30th day and the question is asked again the following evening.",
  },
  {
    icon: Moon,
    title: "Conjunction is the start of the search, not the month",
    body: "Conjunction (ijtimak) is the instant the Moon passes between Earth and Sun. No crescent of the new month exists before it — but at that moment the Moon is still far too close to the Sun to be seen. The month starts when a criterion says the crescent has become established, which is always later, and how much later is exactly what the criteria disagree about.",
  },
];

export function HowMonthsWork() {
  return (
    <section
      aria-labelledby="how-months-work"
      className="rounded-xl border border-neutral-200 p-4 dark:border-night-700/60"
    >
      <h2 id="how-months-work" className="text-sm font-semibold">
        Before the numbers: how a Hijri month actually starts
      </h2>
      <dl className="mt-3 grid gap-3 sm:grid-cols-3">
        {FACTS.map((f) => (
          <div key={f.title}>
            <dt className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-accent">
              <f.icon className="size-3.5 shrink-0" strokeWidth={2} />
              {f.title}
            </dt>
            <dd className="mt-1 text-sm text-ink-muted">{f.body}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
