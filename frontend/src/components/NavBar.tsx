"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu as HeadlessMenu, Transition } from "@headlessui/react";
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  Compass,
  FileCode2,
  GitCompareArrows,
  History,
  Map,
  Menu as MenuIcon,
  MoonStar,
  Sun,
  X,
} from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { cn } from "@/lib/cn";
import { API_DOCS_URL } from "@/lib/api";

const PRIMARY_LINKS = [
  { href: "/converter", label: "Converter", icon: Calendar },
  { href: "/hilal-visibility", label: "Hilal Visibility", icon: MoonStar },
  { href: "/visibility-map", label: "Visibility Map", icon: Map },
  { href: "/prayer-times", label: "Prayer Times", icon: Sun },
  { href: "/qibla", label: "Qibla", icon: Compass },
];

// Multi-date/multi-method comparison tools - grouped separately from the
// single-lookup tools above since they answer a different kind of question
// ("how does this look across a year/methods") and would otherwise make the
// top-level nav grow unbounded as more analysis views get added.
const ANALYSIS_LINKS = [
  { href: "/visibility-calendar", label: "Visibility Calendar", icon: CalendarDays },
  { href: "/method-divergence", label: "Where methods differ", icon: GitCompareArrows },
  { href: "/isbat-accuracy", label: "Isbat Accuracy", icon: History },
  { href: "/hijri-archive", label: "By how much (year archive)", icon: CalendarRange },
];

// Static rather than useId: it is referenced by aria-controls on a button that
// renders before the panel exists, and there is only ever one nav on a page.
const MOBILE_MENU_ID = "main-menu";

function linkClasses(active: boolean) {
  return cn(
    "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    active
      ? "bg-gold-500/10 text-accent"
      : "text-ink-muted hover:bg-neutral-500/10 hover:text-foreground",
  );
}

export function NavBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const analysisActive = ANALYSIS_LINKS.some((link) => link.href === pathname);

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200/70 bg-[var(--background)]/80 backdrop-blur-lg dark:border-night-700/60">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
          <BrandMark className="size-7" />
          <span>Falak</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {PRIMARY_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={linkClasses(pathname === link.href)}>
              <link.icon className="size-4 shrink-0" strokeWidth={2} />
              {link.label}
            </Link>
          ))}

          <HeadlessMenu as="div" className="relative">
            <HeadlessMenu.Button className={linkClasses(analysisActive)}>
              <GitCompareArrows className="size-4 shrink-0" strokeWidth={2} />
              Analysis
              <ChevronDown className="size-3.5" strokeWidth={2} />
            </HeadlessMenu.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <HeadlessMenu.Items className="glass-card absolute right-0 z-20 mt-2 w-60 rounded-xl py-1 text-sm shadow-lg shadow-black/10 focus:outline-none dark:shadow-black/40">
                {ANALYSIS_LINKS.map((link) => {
                  const active = pathname === link.href;
                  return (
                    <HeadlessMenu.Item key={link.href}>
                      {({ active: hover }) => (
                        <Link
                          href={link.href}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2",
                            hover && "bg-gold-500/10",
                            active && "text-accent",
                          )}
                        >
                          <link.icon className="size-4 shrink-0" strokeWidth={2} />
                          {link.label}
                        </Link>
                      )}
                    </HeadlessMenu.Item>
                  );
                })}
              </HeadlessMenu.Items>
            </Transition>
          </HeadlessMenu>

          {/* Only shown when a backend is configured - the static build computes
              everything in the browser, so there is no API to document. */}
          {API_DOCS_URL !== null && (
            <a
              href={API_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClasses(false)}
              title="OpenAPI/Swagger docs for the Falak API"
            >
              <FileCode2 className="size-4 shrink-0" strokeWidth={2} />
              API Docs
            </a>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg p-2 text-ink-muted hover:bg-neutral-500/10 md:hidden"
          // "Toggle navigation" named the control but never said which way it
          // was toggled. aria-expanded carries the state, so the label can drop
          // the word toggle and just name the thing.
          aria-label="Main menu"
          aria-expanded={open}
          aria-controls={MOBILE_MENU_ID}
        >
          {open ? <X className="size-5" /> : <MenuIcon className="size-5" />}
        </button>
      </nav>

      {open && (
        <div
          id={MOBILE_MENU_ID}
          className="border-t border-neutral-200/70 px-4 py-2 md:hidden dark:border-night-700/60"
        >
          {PRIMARY_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium",
                  active
                    ? "bg-gold-500/10 text-accent"
                    : "text-ink-muted",
                )}
              >
                <link.icon className="size-4" strokeWidth={2} />
                {link.label}
              </Link>
            );
          })}

          <div className="mt-1.5 border-t border-neutral-200/70 pt-1.5 dark:border-night-700/60">
            <p className="px-3 pb-1 text-2xs font-medium uppercase tracking-wide text-ink-muted">
              Analysis
            </p>
            {ANALYSIS_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium",
                    active
                      ? "bg-gold-500/10 text-accent"
                      : "text-ink-muted",
                  )}
                >
                  <link.icon className="size-4" strokeWidth={2} />
                  {link.label}
                </Link>
              );
            })}
          </div>

          {API_DOCS_URL !== null && (
            <div className="mt-1.5 border-t border-neutral-200/70 pt-1.5 dark:border-night-700/60">
              <a
                href={API_DOCS_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-muted"
              >
                <FileCode2 className="size-4" strokeWidth={2} />
                API Docs
              </a>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
