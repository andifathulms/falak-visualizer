import { TriangleAlert } from "lucide-react";

const HEADLINE = "Hisab only, not an official determination.";

const BODY = (
  <>
    This is a calculation (hisab) result, not rukyat (observation). Official start of
    Ramadhan/Syawal/Dzulhijjah in Indonesia is determined by Kemenag&apos;s sidang isbat, which may
    incorporate observation reports this tool cannot. Method disagreement is expected and shown
    deliberately.
  </>
);

/**
 * The religious-sensitivity framing required near any month-start output.
 *
 * Two variants, because the same words do different work in different places.
 *
 * `full` is the default and is what every results page gets, unchanged: the
 * alert styling and the complete text, sitting next to a verdict the reader is
 * about to act on. That placement is the requirement and it is not weakened
 * here.
 *
 * `compact` exists for the landing page, which has no output at all. There, the
 * full alert was the second element on the page - the loudest thing a
 * first-time visitor saw was a warning triangle and four sentences containing
 * six untranslated terms, before they had learned what the tool does or seen
 * anything to be cautioned about. It read as a legal notice or a fault. The
 * compact variant keeps the headline visible and puts the full text one click
 * away in a native <details>, so nothing is removed and no JavaScript is
 * needed - only the urgency is dialled back to match a page where there is
 * nothing yet to caution.
 */
export function HisabDisclaimer({ variant = "full" }: { variant?: "full" | "compact" }) {
  if (variant === "compact") {
    return (
      <details className="group rounded-xl border border-gold-500/25 bg-gold-500/[0.05] px-4 py-3 text-sm text-ink-muted">
        <summary className="flex cursor-pointer list-none items-center gap-2.5 [&::-webkit-details-marker]:hidden">
          <TriangleAlert className="size-4 shrink-0 text-accent" strokeWidth={2} />
          <span>
            <strong className="font-semibold text-foreground">{HEADLINE}</strong>{" "}
            <span className="whitespace-nowrap underline decoration-dotted underline-offset-2">
              What this means
            </span>
          </span>
        </summary>
        <p className="mt-2.5 pl-[26px]">{BODY}</p>
      </details>
    );
  }

  return (
    // Body text here is foreground, not ink-muted: on a results page this sits
    // beside a verdict and is meant to read at full weight, which is what the
    // original neutral-700/300 pair was doing before it was tokenised.
    <div className="flex gap-3 rounded-xl border border-gold-500/30 bg-gold-500/[0.07] px-4 py-3.5 text-sm text-foreground">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={2} />
      <p>
        <strong className="font-semibold text-foreground">{HEADLINE}</strong> {BODY}
      </p>
    </div>
  );
}
