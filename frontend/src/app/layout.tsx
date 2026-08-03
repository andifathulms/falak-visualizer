import type { Metadata } from "next";
import localFont from "next/font/local";
import { MakerSignature } from "@/components/MakerSignature";
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
  // Stated explicitly because Next emits the auto-generated manifest link
  // without the basePath: on a project Pages site that resolves to the origin
  // root and 404s, so Chrome never reads the manifest and never offers to
  // install the app. Everything else about the failure is silent.
  manifest: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/manifest.webmanifest`,
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
        {/*
          One seam only: a single rule above a bottom bar carrying both the
          hisab caveat and the byline. They sit opposite each other on desktop
          and stack on mobile, deliberately never merged - one is a statement
          about what the output means, the other is a credit.
        */}
        <footer className="relative mx-auto max-w-6xl px-4 pb-10 pt-4 sm:px-6">
          <div className="flex flex-col items-center gap-5 border-t border-neutral-200/70 pt-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8 dark:border-night-700/60">
            <p className="max-w-md text-center text-xs text-neutral-400 dark:text-neutral-600 sm:text-left">
              Falak is a hisab (calculation) tool, not a substitute for official sidang isbat
              determination.
            </p>
            <MakerSignature />
          </div>
        </footer>
      </body>
    </html>
  );
}
