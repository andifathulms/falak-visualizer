"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Clock3, Compass, FileCode2, MoonStar, Sunrise, type LucideIcon } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { PlaceChip } from "@/components/PlaceChip";
import { ThemeControl } from "@/components/ThemeControl";
import { cn } from "@/lib/cn";
import { API_DOCS_URL } from "@/lib/api";

/**
 * Five destinations named after what people ask (DESIGN.md v2 §4.1), daily
 * ones first. Desktop: tabs in the header. Phones: a fixed bottom tab bar
 * within thumb reach, and a slim header carrying only the brand, the place
 * chip and the theme control (§4.2).
 */
export const NAV_LINKS: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/", label: "Hari ini", icon: Sunrise },
  { href: "/salat", label: "Salat", icon: Clock3 },
  { href: "/kiblat", label: "Kiblat", icon: Compass },
  { href: "/awal-bulan", label: "Awal Bulan", icon: MoonStar },
  { href: "/kalender", label: "Kalender", icon: CalendarDays },
];

// The static export sets `trailingSlash: true`, so usePathname() returns
// "/salat/" while the hrefs above are "/salat". Normalise both sides.
function isActive(pathname: string | null, href: string): boolean {
  const normalize = (p: string) => (p.length > 1 ? p.replace(/\/$/, "") : p);
  return pathname !== null && normalize(pathname) === normalize(href);
}

export function NavBar() {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/70 bg-surface-page/85 backdrop-blur-xl">
        <nav aria-label="Utama" className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="mr-2 flex shrink-0 items-center gap-2 text-[17px] font-extrabold tracking-tight text-ink">
            <BrandMark className="size-7" />
            <span>Falak</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition-colors duration-fast",
                    active ? "bg-accent-solid/15 text-accent" : "text-ink-muted hover:bg-surface-raised hover:text-ink",
                  )}
                >
                  <link.icon className="size-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="ml-auto flex min-w-0 items-center gap-1">
            <PlaceChip />
            {API_DOCS_URL !== null && (
              <a
                href={API_DOCS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden size-10 items-center justify-center rounded-full text-ink-muted hover:bg-surface-raised hover:text-ink lg:flex"
                title="Dokumentasi API"
              >
                <FileCode2 className="size-[18px]" aria-hidden="true" />
                <span className="sr-only">Dokumentasi API</span>
              </a>
            )}
            <ThemeControl />
          </div>
        </nav>
      </header>

      {/* Bottom tab bar (phones). pb uses the safe-area inset so the labels
          clear the home indicator on notched devices. */}
      <nav
        aria-label="Utama (seluler)"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-surface-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {NAV_LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-1 px-1 pb-2 pt-2 text-[11px] font-semibold leading-none transition-colors duration-fast",
                    active ? "text-accent" : "text-ink-muted",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-fast",
                      active && "bg-accent-solid/15",
                    )}
                  >
                    <link.icon className="size-[20px]" strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
                  </span>
                  <span className="whitespace-nowrap">{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
