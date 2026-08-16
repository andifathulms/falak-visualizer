import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Visibility Map has moved — Falak",
  description: "The Visibility Map is now the \"Se-Indonesia\" sweep on /hilal.",
  alternates: { canonical: absoluteUrl("/hilal") },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
