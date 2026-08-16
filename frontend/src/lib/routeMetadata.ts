import type { Metadata } from "next";
import { ROUTES, SITE, absoluteUrl, metaDescription, type RouteKey, type RouteMeta } from "@/lib/routes";

/**
 * Build a route's metadata from the same strings the page renders.
 *
 * Nothing here is authored twice: the title is the page's heading, and the
 * description is its on-page description trimmed to a length search results
 * will not cut mid-word. A description that drifts from its page is worse than
 * none, and hand-copying is how that drift happens.
 *
 * Open Graph matters more here than it usually would. Five result pages carry a
 * "Copy link to this result" button, so the app is built around sharing
 * permalinked calculations - and every one of those links previously pasted
 * into a chat as a bare URL with no title, description or image.
 *
 * The share image is public/og-card.png, a 1200x630 card generated once by
 * scripts/og-card.source.tsx and committed. It is named explicitly because a
 * file-convention opengraph-image emits without a .png extension, and GitHub
 * Pages then serves it as application/octet-stream, which unfurlers reject.
 */
export function routeMetadata(key: RouteKey): Metadata {
  // Cast to the shared interface, not a narrower per-key literal: ROUTES is
  // `as const satisfies Record<...>` for the sake of each entry's literal
  // `path`/`title` types elsewhere, but that same literal-preservation is
  // why TS won't let a key-generic accessor read an optional field (like
  // `locale`) that not every entry sets - RouteMeta is the actual contract.
  const route = ROUTES[key] as RouteMeta;
  const url = absoluteUrl(route.path);
  const description = metaDescription(route.description);
  const title = `${route.title} — ${SITE.name}`;
  const image = absoluteUrl("/og-card.png");
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: SITE.name,
      title,
      description,
      url,
      locale: route.locale ?? "en",
      images: [{ url: image, width: 1200, height: 630, alt: `${SITE.name} share card` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
