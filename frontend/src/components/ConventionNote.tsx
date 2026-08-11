import { CONVENTIONS, KEMENAG_RI } from "@/lib/falak/prayerTimes";

export const DEFAULT_CONVENTION = KEMENAG_RI.name;

export const CONVENTION_OPTIONS = Object.values(CONVENTIONS).map((c) => ({
  value: c.name,
  label: c.name,
}));

/**
 * The angles behind the times on screen, and which of them the choice actually
 * moved.
 *
 * The selector this accompanies exists because fajr and isha are not
 * observations - they are definitions, and organisations define them
 * differently. That is the same structure as the hilal criteria: a number that
 * looks astronomical but encodes a human decision. Exposing it for month starts
 * while hiding it for prayer times would have been incoherent.
 *
 * But a selector alone is a downgrade for the primary user, who arrives wanting
 * the time to pray and is now being asked to make a choice they are not placed
 * to make. So the default stays Kemenag RI, and this note answers "why would I
 * change this?" in place, including the part that matters most: dhuhr, asr and
 * maghrib barely move between conventions because the sun fixes them. Only the
 * twilight prayers are in dispute. That asymmetry is the whole lesson.
 */
export function ConventionNote({ convention }: { convention: string }) {
  const c = CONVENTIONS[convention];
  if (!c) return null;

  const isDefault = c.name === DEFAULT_CONVENTION;

  return (
    <div className="rounded-xl border border-neutral-200 px-4 py-3 text-sm dark:border-night-700/60">
      <p>
        <span className="font-semibold">{c.name}</span>{" "}
        <span className="text-ink-muted">
          — fajr at{" "}
          <span className="font-mono tabular-nums text-foreground">{c.fajrAngleDeg}°</span> below the
          horizon, isha at{" "}
          <span className="font-mono tabular-nums text-foreground">{c.ishaAngleDeg}°</span>, asr at a
          shadow length of {c.asrShadowFactor}× object height
          {c.asrShadowFactor === 1 ? " (Shafi'i)" : " (Hanafi)"}.
        </span>
      </p>
      <p className="mt-1.5 text-sm text-ink-muted">
        Asr is set by shadow length rather than by a clock because that is what can be observed
        without one: as the sun descends, every object&apos;s shadow lengthens, and asr begins when a
        shadow has grown by {c.asrShadowFactor === 1 ? "the object's own height" : "twice the object's height"}{" "}
        beyond whatever it measured at noon. The factor is the point of disagreement between schools,
        not the method.
      </p>
      <p className="mt-1.5 text-sm text-ink-muted">
        Only <span className="font-medium text-foreground">fajr</span> and{" "}
        <span className="font-medium text-foreground">isha</span> depend on this choice — they are
        defined by how far the sun has to be below the horizon, which is a convention rather than an
        observation. Sunrise, dhuhr and maghrib are fixed by the sun&apos;s position and do not move.
        {isDefault
          ? " Kemenag RI is the Indonesian standard and the default here; change it only if you are matching a schedule set by another organisation."
          : " This is not the Indonesian standard — Kemenag RI is. Use it when you are matching a schedule set by that organisation."}
      </p>
    </div>
  );
}
