import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/routes";

/**
 * Canonical points at the archive, not at this path: the page exists only to
 * forward old links, and search engines should consolidate onto the real one
 * rather than index a redirect. noindex for the same reason, with follow so the
 * link through still counts.
 */
export const metadata: Metadata = {
  title: "Method Divergence has moved — Falak",
  description:
    "Method Divergence is now part of the Hijri Year Archive, which shows month-by-month criterion agreement and how many days apart the criteria land.",
  alternates: { canonical: absoluteUrl("/hijri-archive") },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
