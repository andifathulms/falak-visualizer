import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/routes";

/**
 * Retired by DESIGN.md v2. Canonical points at the destination and the page
 * is noindex (follow): it exists only to forward old links.
 */
export const metadata: Metadata = {
  title: "Awal Bulan — Falak",
  description: "Hilal sekarang bagian dari Awal Bulan.",
  alternates: { canonical: absoluteUrl("/awal-bulan") },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
