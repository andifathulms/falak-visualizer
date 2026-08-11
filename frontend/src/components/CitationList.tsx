import { ExternalLink, FileWarning } from "lucide-react";
import { CITATIONS, type CitationKey } from "@/lib/falak/citations";

/**
 * The sources behind a threshold, rendered inline under the rule it justifies.
 *
 * An entry with no primary source yet is shown as such rather than omitted.
 * Dropping it would leave the panel looking fully sourced when it is not,
 * which is the failure mode this component exists to prevent.
 */
export function CitationList({ keys }: { keys: readonly CitationKey[] }) {
  return (
    <ul className="mt-2 space-y-1.5">
      {keys.map((key) => {
        const c = CITATIONS[key];
        const unsourced = "unsourced" in c && c.unsourced;
        return (
          <li key={key} className="text-2xs leading-relaxed text-ink-muted">
            {unsourced ? (
              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                <FileWarning className="size-3 shrink-0" strokeWidth={2} />
                Citation needed
              </span>
            ) : "url" in c && c.url ? (
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-accent underline decoration-dotted underline-offset-2"
              >
                {c.label}
                <ExternalLink className="size-3 shrink-0" strokeWidth={2} />
              </a>
            ) : (
              <span className="font-medium text-foreground">{c.label}</span>
            )}{" "}
            {c.reference}
            {"note" in c && c.note ? <span className="block mt-0.5 italic">{c.note}</span> : null}
          </li>
        );
      })}
    </ul>
  );
}
