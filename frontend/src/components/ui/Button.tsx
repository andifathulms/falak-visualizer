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
        "relative inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" &&
          "bg-gradient-to-b from-gold-400 to-gold-600 text-night-950 shadow-md shadow-gold-500/20 hover:shadow-lg hover:shadow-gold-500/30 hover:brightness-105 active:scale-[0.98]",
        variant === "ghost" &&
          "border border-night-600/30 bg-transparent text-foreground hover:bg-night-500/10 active:scale-[0.98]",
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
