import type { Metadata } from "next";

/**
 * /kartu: a working tool for producing TikTok card decks from the engine's own
 * output. Deliberately outside the five destinations (DESIGN.md v2 §1), the
 * sitemap and the nav, and noindex: it is for the account's maker, not for
 * someone searching for prayer times.
 */
export const metadata: Metadata = {
  title: "Buat kartu TikTok — Falak",
  description: "Kartu carousel 1080×1920 dari hitungan Falak.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
