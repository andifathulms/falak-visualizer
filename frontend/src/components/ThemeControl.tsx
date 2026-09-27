"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { applyThemeChoice, readThemeChoice, type ThemeChoice } from "@/components/ThemeToggle";
import { cn } from "@/lib/cn";

const NEXT: Record<ThemeChoice, ThemeChoice> = { system: "light", light: "dark", dark: "system" };
const LABEL: Record<ThemeChoice, string> = { system: "Tema: ikuti sistem", light: "Tema: terang", dark: "Tema: gelap" };

/**
 * One button that cycles Sistem → Terang → Gelap (DESIGN.md v2 §1.3). The
 * icon shows the CURRENT choice; the accessible name says it and what a
 * press does, since a cycling control is otherwise opaque to a screen reader.
 */
export function ThemeControl({ className }: { className?: string }) {
  const [choice, setChoice] = useState<ThemeChoice | null>(null);

  useEffect(() => {
    setChoice(readThemeChoice());
  }, []);

  function cycle() {
    const next = NEXT[choice ?? "system"];
    applyThemeChoice(next);
    setChoice(next);
  }

  const Icon = choice === "light" ? Sun : choice === "dark" ? Moon : Monitor;

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={choice === null ? "Ganti tema" : `${LABEL[choice]}. Tekan untuk ${LABEL[NEXT[choice]].toLowerCase().replace("tema: ", "")}`}
      title={choice === null ? "Ganti tema" : LABEL[choice]}
      className={cn(
        "flex size-10 items-center justify-center rounded-full text-ink-muted transition-colors duration-fast hover:bg-surface-raised hover:text-ink",
        className,
      )}
    >
      {choice !== null && <Icon className="size-[18px]" strokeWidth={2} aria-hidden="true" />}
    </button>
  );
}
