import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Hijri Year Archive has moved — Falak",
  description: "The Hijri Year Archive is now part of Kalender.",
  alternates: { canonical: absoluteUrl("/kalender") },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
