import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/routes";

/**
 * Retired by DESIGN.md v2. Canonical points at the destination and the page
 * is noindex (follow): it exists only to forward old links.
 */
export const metadata: Metadata = {
  title: "Salat — Falak",
  description: "Jadwal salat sekarang ada di halaman Salat, arah kiblat di halaman Kiblat.",
  alternates: { canonical: absoluteUrl("/salat") },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
