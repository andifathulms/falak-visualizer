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
        "relative inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-all duration-fast disabled:cursor-not-allowed disabled:opacity-60",
        // Solid fill, not a gradient: DESIGN.md §3.1 confines the app to one
        // gradient total (the sky behind HorizonInstrument).
        variant === "primary" &&
          "bg-accent-solid text-accent-on-solid shadow-md shadow-accent-solid/20 hover:brightness-105 active:scale-[0.98]",
        variant === "ghost" &&
          "border border-border bg-transparent text-ink hover:bg-accent-solid/10 active:scale-[0.98]",
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
