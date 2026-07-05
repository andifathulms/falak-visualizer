import type { Metadata } from "next";
import localFont from "next/font/local";
import { NavBar } from "@/components/NavBar";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Falak — Hijri Calendar & Islamic Astronomy Visualizer",
  description:
    "Deterministic, auditable Hijri calendar conversion, hilal visibility, prayer times, and qibla direction.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} relative min-h-screen bg-night-sky antialiased`}
      >
        <div className="starfield" />
        <NavBar />
        <main className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6">{children}</main>
        <footer className="relative mx-auto max-w-6xl px-4 pb-10 pt-4 text-center text-xs text-neutral-400 dark:text-neutral-600 sm:px-6">
          Falak is a hisab (calculation) tool, not a substitute for official sidang isbat determination.
        </footer>
      </body>
    </html>
  );
}
