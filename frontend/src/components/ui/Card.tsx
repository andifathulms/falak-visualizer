import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "glass-card rounded-2xl shadow-sm shadow-black/5 dark:shadow-black/30",
        className,
      )}
      {...props}
    />
  );
}
