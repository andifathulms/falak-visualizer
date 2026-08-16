import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/routes";

/**
 * Retired (migration step 9). Canonical points at /kalender, not at this
 * path: the page exists only to forward old links, and search engines
 * should consolidate onto the real one rather than index a redirect.
 * noindex for the same reason, with follow so the link through still
 * counts.
 */
export const metadata: Metadata = {
  title: "Converter has moved — Falak",
  description: "The Hijri ↔ Gregorian Converter is now part of Kalender.",
  alternates: { canonical: absoluteUrl("/kalender") },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
