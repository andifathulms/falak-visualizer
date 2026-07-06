"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Calendar, CalendarDays, Compass, GitCompareArrows, History, Map, Menu, MoonStar, Sun, X } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/converter", label: "Converter", icon: Calendar },
  { href: "/hilal-visibility", label: "Hilal Visibility", icon: MoonStar },
  { href: "/visibility-map", label: "Visibility Map", icon: Map },
  { href: "/visibility-calendar", label: "Visibility Calendar", icon: CalendarDays },
  { href: "/method-divergence", label: "Method Divergence", icon: GitCompareArrows },
  { href: "/isbat-accuracy", label: "Isbat Accuracy", icon: History },
  { href: "/prayer-times", label: "Prayer Times", icon: Sun },
  { href: "/qibla", label: "Qibla", icon: Compass },
];

export function NavBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200/70 bg-[var(--background)]/80 backdrop-blur-lg dark:border-night-700/60">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
          <BrandMark className="size-7" />
          <span>Falak</span>
        </Link>

        <div className="relative hidden min-w-0 flex-1 justify-end md:flex">
          <div className="flex items-center gap-1 overflow-x-auto scroll-smooth pr-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-gold-500/10 text-gold-600 dark:text-gold-400"
                      : "text-neutral-600 hover:bg-neutral-500/10 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100",
                  )}
                >
                  <link.icon className="size-4 shrink-0" strokeWidth={2} />
                  {link.label}
                </Link>
              );
            })}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[var(--background)] to-transparent" />
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-500/10 md:hidden dark:text-neutral-300"
          aria-label="Toggle navigation"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-neutral-200/70 px-4 py-2 md:hidden dark:border-night-700/60">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium",
                  active
                    ? "bg-gold-500/10 text-gold-600 dark:text-gold-400"
                    : "text-neutral-600 dark:text-neutral-400",
                )}
              >
                <link.icon className="size-4" strokeWidth={2} />
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
