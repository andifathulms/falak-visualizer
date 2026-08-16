import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/routes";

/**
 * Re-pointed (migration step 9): this used to redirect to /hijri-archive,
 * which is itself now retired. Canonical points straight at /kalender so
 * a two-hop redirect chain never exists even transiently.
 */
export const metadata: Metadata = {
  title: "Method Divergence has moved — Falak",
  description: "Method Divergence is now part of Kalender.",
  alternates: { canonical: absoluteUrl("/kalender") },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
