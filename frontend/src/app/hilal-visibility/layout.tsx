import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Hilal Visibility has moved — Falak",
  description: "Hilal Visibility is now the \"Petang ini\" sweep on /hilal.",
  alternates: { canonical: absoluteUrl("/hilal") },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
