import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Isbat Accuracy has moved — Falak",
  description: "Isbat Accuracy is now part of Kalender.",
  alternates: { canonical: absoluteUrl("/kalender") },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
