import type { LucideIcon } from "lucide-react";
import { Check, CircleDashed, HelpCircle, X } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "positive" | "neutral" | "negative" | "indeterminate";

/**
 * `icon` overrides the tone's default glyph. It exists for the case where two
 * badges must be told apart without either being scored - two outcomes that are
 * both legitimately neutral, where colour would editorialise but a shared icon
 * would make them look identical.
 */
export function Badge({
  tone,
  icon,
  children,
}: {
  tone: Tone;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  const Icon =
    icon ??
    (tone === "positive"
      ? Check
      : tone === "negative"
        ? X
        : tone === "indeterminate"
          ? CircleDashed
          : HelpCircle);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-2xs font-medium",
        tone === "positive" && "bg-verdict-lit/15 text-verdict-lit",
        tone === "neutral" && "bg-ink-muted/10 text-ink-muted",
        tone === "negative" && "bg-verdict-dark/15 text-verdict-dark",
        // Not a verdict: the engine declining to give one. Deliberately reads
        // as unresolved rather than as a third outcome on the same axis.
        tone === "indeterminate" &&
          "border border-dashed border-current/40 bg-transparent text-ink-muted",
      )}
    >
      <Icon className="size-3.5" strokeWidth={2.5} />
      {children}
    </span>
  );
}
