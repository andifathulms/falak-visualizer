import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: "primary" | "ghost";
}

export function Button({ className, loading, variant = "primary", children, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "relative inline-flex h-11 items-center justify-center gap-2 rounded-control px-4 text-sm font-semibold transition-all duration-fast disabled:cursor-not-allowed disabled:opacity-60",
        // Solid fill: gradients are reserved for sky drawings (DESIGN.md v2 §3.1).
        variant === "primary" &&
          "bg-accent-solid text-accent-on-solid hover:brightness-110 active:scale-[0.98]",
        variant === "ghost" &&
          "border border-border bg-surface-card text-ink hover:bg-surface-raised active:scale-[0.98]",
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}
