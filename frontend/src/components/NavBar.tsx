"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Compass, FileCode2, Menu as MenuIcon, Moon, MoonStar, Sun, X } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { THEME_STORAGE_KEY } from "@/components/ThemeToggle";
import { cn } from "@/lib/cn";
import { API_DOCS_URL } from "@/lib/api";

/**
 * Three items, no "Analysis" dropdown (DESIGN.md §4.3, §8) - the nine old
 * single-lookup and comparison routes this dropdown used to fan out to are
 * all now sweeps or views inside these same three destinations
 * (MIGRATION.md steps 5-9). Deferred from step 4 until now deliberately -
 * see MIGRATION.md's "NavBar intentionally not touched" note - because
 * collapsing the nav down to three items only makes sense once all three
 * targets are real and every old route has a redirect stub, both of which
 * are true as of step 9.
 *
 * The theme toggle moves in here from its previous fixed-position mount
 * (see ThemeToggle.tsx's own "TEMPORARY placement" comment) - inlined
 * rather than reusing the <ThemeToggle> component, since that component's
 * fixed-position button styling doesn't fit inside a nav row; the toggle
 * logic itself (read persisted class, flip it, persist the choice) is
 * small enough not to warrant a shared abstraction between two different
 * layouts of the same three lines.
 */
const NAV_LINKS = [
  { href: "/hilal", label: "Hilal", icon: MoonStar },
  { href: "/kalender", label: "Kalender", icon: CalendarDays },
  { href: "/langit", label: "Langit", icon: Compass },
];

const MOBILE_MENU_ID = "main-menu";

// The static export sets `trailingSlash: true` (next.config.mjs), so
// `usePathname()` returns "/hilal/" while NAV_LINKS' own hrefs are
// "/hilal" - comparing them directly never matched, silently breaking
// active-link highlighting on every route. Confirmed with Playwright:
// all three links carried byte-identical styling on every page. Strip a
// trailing slash from both sides (except the root "/") before comparing.
function isActive(pathname: string | null, href: string): boolean {
  const normalize = (p: string) => (p.length > 1 ? p.replace(/\/$/, "") : p);
  return pathname !== null && normalize(pathname) === normalize(href);
}

function linkClasses(active: boolean) {
  return cn(
    "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-fast",
    active ? "bg-accent-solid/10 text-accent" : "text-ink-muted hover:bg-accent-solid/5 hover:text-ink",
  );
}

function ThemeToggleInline() {
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // Storage can be unavailable (private browsing, quota); the toggle
      // still works for the rest of this session, it just won't persist.
    }
    setIsDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex size-9 items-center justify-center rounded-lg text-ink-muted transition-colors duration-fast hover:bg-accent-solid/5 hover:text-ink"
    >
      {isDark === null ? null : isDark ? (
        <Sun className="size-4" aria-hidden="true" />
      ) : (
        <Moon className="size-4" aria-hidden="true" />
      )}
    </button>
  );
}

export function NavBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface-page/80 backdrop-blur-lg">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight text-ink">
          <BrandMark className="size-7" />
          <span>Falak</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(pathname, link.href) ? "page" : undefined}
              className={linkClasses(isActive(pathname, link.href))}
            >
              <link.icon className="size-4 shrink-0" strokeWidth={2} />
              {link.label}
            </Link>
          ))}

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

          <ThemeToggleInline />
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggleInline />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg p-2 text-ink-muted hover:bg-accent-solid/5"
            aria-label="Main menu"
            aria-expanded={open}
            aria-controls={MOBILE_MENU_ID}
          >
            {open ? <X className="size-5" /> : <MenuIcon className="size-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div id={MOBILE_MENU_ID} className="border-t border-border px-4 py-2 md:hidden">
          {NAV_LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium",
                  active ? "bg-accent-solid/10 text-accent" : "text-ink-muted",
                )}
              >
                <link.icon className="size-4" strokeWidth={2} />
                {link.label}
              </Link>
            );
          })}

          {API_DOCS_URL !== null && (
            <div className="mt-1.5 border-t border-border pt-1.5">
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
