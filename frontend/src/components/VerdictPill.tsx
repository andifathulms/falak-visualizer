import { cn } from "@/lib/cn";

export type VerdictTone = "lit" | "margin" | "dark";

/**
 * A verdict is never colour alone (DESIGN.md v2 §2.5): the shape carries it too -
 * a filled disc with a check (lit), a half disc (margin), a dashed ring (dark) -
 * and the word always sits beside it.
 */
export function VerdictIcon({ tone, className }: { tone: VerdictTone; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cn("size-4 shrink-0", className)} aria-hidden="true">
      {tone === "lit" && (
        <>
          <circle cx="8" cy="8" r="7" fill="currentColor" />
          <path d="M4.8 8.2l2.1 2.1 4.3-4.4" fill="none" stroke="var(--surface-card)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {tone === "margin" && (
        <>
          <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M8 1.8a6.2 6.2 0 0 1 0 12.4z" fill="currentColor" />
        </>
      )}
      {tone === "dark" && <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="2.6 2.2" />}
    </svg>
  );
}

export function VerdictPill({ tone, children, className }: { tone: VerdictTone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-2xs font-bold",
        tone === "lit" && "bg-verdict-lit/15 text-verdict-lit",
        tone === "margin" && "bg-verdict-margin/15 text-verdict-margin",
        tone === "dark" && "bg-verdict-dark/15 text-verdict-dark",
        className,
      )}
    >
      <VerdictIcon tone={tone} className="size-3.5" />
      {children}
    </span>
  );
}
