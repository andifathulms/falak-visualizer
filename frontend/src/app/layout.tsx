import type { Metadata } from "next";
import localFont from "next/font/local";
import { MakerSignature } from "@/components/MakerSignature";
import { MotionProvider } from "@/components/MotionProvider";
import { StructuredData } from "@/components/StructuredData";
import { NavBar } from "@/components/NavBar";
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

// One family, one file. Geist Mono used to be loaded here too and was consumed
// by nothing: tailwind.config declares only `fontFamily.display`, so every
// `font-mono` in the app resolves to the default ui-monospace system stack. The
// variable was declared, preloaded at high priority, and referenced nowhere.
const geistSans = localFont({
  src: "./fonts/GeistVF.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
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
    locale: "en",
    // No images here: app/opengraph-image.tsx supplies the 1200x630 card and
    // Next attaches it to every route that does not override it. Naming one
    // explicitly would shadow the generated card with the small square icon.
  },
  twitter: {
    // large card, now that there is a 1200x630 image behind it
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: HOME_DESCRIPTION,
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
    <html lang="en">
      <body
        className={`${geistSans.variable} relative min-h-screen bg-night-sky antialiased`}
      >
        <StructuredData />
        <MotionProvider>
          {/*
            Bypass block (WCAG 2.4.1). The landmarks below already let screen
            reader users jump straight to <main>, but a sighted keyboard user
            has no landmark navigation and tabs through six nav links and the
            Analysis menu on every page load. Different audience, same
            criterion - this is not a duplicate of the landmarks.

            Visible only while focused: it is the first tab stop, and showing it
            permanently would put a control at the top of every page that nobody
            using a pointer needs.
          */}
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-[var(--card)] focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[var(--accent-solid)]"
          >
            Skip to content
          </a>
          <div className="starfield" />
          <NavBar />
          <main id="main" className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6">{children}</main>
          {/*
            One seam only: a single rule above a bottom bar carrying both the
            hisab caveat and the byline. They sit opposite each other on desktop
            and stack on mobile, deliberately never merged - one is a statement
            about what the output means, the other is a credit.
          */}
          <footer className="relative mx-auto max-w-6xl px-4 pb-10 pt-4 sm:px-6">
            <div className="flex flex-col items-center gap-5 border-t border-neutral-200/70 pt-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8 dark:border-night-700/60">
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
