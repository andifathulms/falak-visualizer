import { cn } from "@/lib/cn";
import { Check, CircleDashed, HelpCircle, X } from "lucide-react";

type Tone = "positive" | "neutral" | "negative" | "indeterminate";

export function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const Icon =
    tone === "positive"
      ? Check
      : tone === "negative"
        ? X
        : tone === "indeterminate"
          ? CircleDashed
          : HelpCircle;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-2xs font-medium",
        tone === "positive" &&
          "bg-moon-500/15 text-verdict-positive dark:bg-moon-500/20",
        tone === "neutral" && "bg-neutral-500/10 text-ink-muted",
        tone === "negative" && "bg-red-500/10 text-verdict-negative",
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
