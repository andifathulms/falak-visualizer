import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { MakerSignature } from "@/components/MakerSignature";
import { MotionProvider } from "@/components/MotionProvider";
import { StructuredData } from "@/components/StructuredData";
import { NavBar } from "@/components/NavBar";
import { noFlashThemeScript } from "@/components/ThemeToggle";
import { ObservationProvider } from "@/components/ObservationProvider";
import { ContextBar } from "@/components/ContextBar";
import { SITE, absoluteUrl } from "@/lib/routes";
import "./globals.css";

/**
 * The home page's description, kept here beside the metadata that uses it
 * because the landing page has no PageHeader to source it from - its equivalent
 * copy is the hero lead, which is marked up as part of the hero rather than as
 * a reusable string.
 */
const HOME_DESCRIPTION =
  "Work out when each Hijri month begins, whether the hilal is visible from where you are, when to pray, and which way the Kaaba lies — with the altitude, elongation and timings behind every answer.";

/**
 * Four families, four roles (DESIGN.md v2 §3.2), all self-hosted via
 * next/font/local - no network font request.
 *
 * - Plus Jakarta Sans (variable 400-800): the interface and the answer numerals.
 * - Newsreader: the reading voice - verdict sentences, Belajar prose.
 * - IBM Plex Mono: raw engine values inside "Lihat perhitungan" only.
 * - Amiri, Arabic subset only: Hijri month names in Arabic script. Not
 *   preloaded - it is decorative, and it is the heaviest file.
 */
const plusJakarta = localFont({
  src: "./fonts/PlusJakartaSans-Variable.woff2",
  variable: "--font-sans",
  weight: "400 800",
  style: "normal",
  display: "swap",
});

const newsreader = localFont({
  src: "./fonts/Newsreader-Variable.woff2",
  variable: "--font-display",
  weight: "200 800",
  style: "normal",
  display: "swap",
});

const plexMono = localFont({
  src: [
    { path: "./fonts/IBMPlexMono-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/IBMPlexMono-SemiBold.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-plex-mono",
  display: "swap",
});

const amiri = localFont({
  src: "./fonts/Amiri-Regular-Arabic.woff2",
  variable: "--font-arab",
  weight: "400",
  style: "normal",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  // Origin only, WITHOUT the basePath. Next already prefixes basePath onto
  // file-convention assets like opengraph-image, so including it here produced
  // /falak-visualizer/falak-visualizer/opengraph-image. Canonicals are
  // unaffected because absoluteUrl() builds them as complete strings.
  metadataBase: new URL(SITE.origin),
  title: {
    // Routes supply their own full title; this is the fallback and the home page.
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s`,
  },
  description: HOME_DESCRIPTION,
  alternates: { canonical: absoluteUrl("/") },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: HOME_DESCRIPTION,
    url: absoluteUrl("/"),
    locale: "id_ID",
    images: [
      {
        url: absoluteUrl("/og-card.png"),
        width: 1200,
        height: 630,
        alt: `${SITE.name} share card`,
      },
    ],
  },
  twitter: {
    // large card, now that there is a 1200x630 image behind it
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: HOME_DESCRIPTION,
    images: [absoluteUrl("/og-card.png")],
  },
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
    <html
      lang="id"
      suppressHydrationWarning
      className={`${plusJakarta.variable} ${newsreader.variable} ${plexMono.variable} ${amiri.variable}`}
    >
      {/*
        The font variable classes live on <html>, not <body>: Tailwind's
        Preflight sets `font-family: var(--font-sans), ...` on the html
        selector itself, and a CSS custom property is only visible to the
        element that defines it and that element's descendants - defining it
        one level down on <body> would leave <html>'s own font-family
        unresolved. (The previous single-Geist-family setup had this same
        placement, which is one reason on top of `font-display` never being
        applied anywhere that it was silently inert - see the comment above.)
      */}
      <body className="relative min-h-screen bg-surface-page antialiased">
        {/* strategy="beforeInteractive": must run before first paint, or the
            wrong theme flashes - see components/ThemeToggle.tsx. Next inlines
            beforeInteractive scripts into <head> regardless of where the
            component sits in the tree; only valid in the root layout. */}
        <Script id="theme-init" strategy="beforeInteractive">
          {noFlashThemeScript}
        </Script>
        <StructuredData />
        <MotionProvider>
          {/*
            Bypass block (WCAG 2.4.1). The landmarks below already let screen
            reader users jump straight to <main>, but a sighted keyboard user
            has no landmark navigation and tabs through every nav link on
            every page load. Different audience, same criterion - this is
            not a duplicate of the landmarks.

            Visible only while focused: it is the first tab stop, and showing it
            permanently would put a control at the top of every page that nobody
            using a pointer needs.
          */}
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-[var(--surface-card)] focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[var(--accent-solid)]"
          >
            Skip to content
          </a>
          <NavBar />
          {/*
            DESIGN.md §4.3/§9.4: place and date, persistent across every
            route. Scoped to ContextBar + main (not NavBar, which doesn't
            read it) - see ContextBar.tsx for the transitional note on why
            this coexists with each old page's own location form for now.
          */}
          <ObservationProvider>
            <ContextBar />
            <main id="main" className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6">{children}</main>
          </ObservationProvider>
          {/*
            One seam only: a single rule above a bottom bar carrying both the
            hisab caveat and the byline. They sit opposite each other on desktop
            and stack on mobile, deliberately never merged - one is a statement
            about what the output means, the other is a credit.
          */}
          <footer className="relative mx-auto max-w-6xl px-4 pb-10 pt-4 sm:px-6">
            <div className="flex flex-col items-center gap-5 border-t border-border pt-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
              <p className="max-w-md text-center text-sm text-ink-muted sm:text-left">
                Falak is a hisab (calculation) tool, not a substitute for official sidang isbat
                determination.
              </p>
              <MakerSignature />
            </div>
          </footer>
        </MotionProvider>
      </body>
    </html>
  );
}
