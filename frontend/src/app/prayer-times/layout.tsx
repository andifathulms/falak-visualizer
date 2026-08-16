import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Prayer Times has moved — Falak",
  description: "Prayer Times is now part of Langit.",
  alternates: { canonical: absoluteUrl("/langit") },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
