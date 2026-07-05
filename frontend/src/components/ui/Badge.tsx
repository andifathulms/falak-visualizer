import { cn } from "@/lib/cn";
import { Check, HelpCircle, X } from "lucide-react";

type Tone = "positive" | "neutral" | "negative";

export function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const Icon = tone === "positive" ? Check : tone === "negative" ? X : HelpCircle;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        tone === "positive" &&
          "bg-moon-500/15 text-moon-600 dark:bg-moon-500/20 dark:text-moon-400",
        tone === "neutral" && "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400",
        tone === "negative" && "bg-red-500/10 text-red-600 dark:text-red-400",
      )}
    >
      <Icon className="size-3.5" strokeWidth={2.5} />
      {children}
    </span>
  );
}
