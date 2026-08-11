import { ALL_PATHS, ROUTES, SITE, absoluteUrl } from "@/lib/routes";

/**
 * JSON-LD describing what this site is and what it contains.
 *
 * Search engines otherwise have to infer the nature of the app from prose. This
 * states it: a free, browser-only calculation tool, with its sections named.
 *
 * Everything is derived from lib/routes.ts, the same source the page headings
 * and the metadata already use, so a route cannot appear here with a name it
 * does not have on screen.
 *
 * Claims kept to ones that are demonstrably true: it is free, it needs no
 * account, and it runs in a browser. No ratings, no author markup, nothing that
 * would be an invented signal - structured data that overstates is worse than
 * none, and search engines penalise exactly that.
 */
export function StructuredData() {
  const graph = [
    {
      "@type": "WebApplication",
      "@id": `${absoluteUrl("/")}#app`,
      name: SITE.name,
      alternateName: `${SITE.name} — ${SITE.tagline}`,
      url: absoluteUrl("/"),
      applicationCategory: "ReferenceApplication",
      operatingSystem: "Any (web browser)",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "IDR" },
      inLanguage: "en",
      description:
        "Hijri calendar conversion, hilal visibility, prayer times and qibla direction, computed from solar and lunar position and shown with the numbers behind every verdict.",
      featureList: Object.values(ROUTES).map((r) => r.title),
    },
    {
      "@type": "WebSite",
      "@id": `${absoluteUrl("/")}#site`,
      name: SITE.name,
      url: absoluteUrl("/"),
      inLanguage: "en",
      hasPart: Object.values(ROUTES).map((r) => ({
        "@type": "WebPage",
        name: r.title,
        url: absoluteUrl(r.path).replace(/\/?$/, "/"),
        description: r.description,
      })),
    },
  ];

  return (
    <script
      type="application/ld+json"
      // Serialised rather than templated: the descriptions contain quotes and
      // em dashes, and JSON.stringify is the only thing that escapes them
      // correctly. The content is entirely our own, never user input.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }),
      }}
    />
  );
}

/** Route count, exported so a test can assert the graph stays in step. */
export const STRUCTURED_ROUTE_COUNT = ALL_PATHS.length;
