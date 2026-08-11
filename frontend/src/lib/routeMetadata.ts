import type { Metadata } from "next";
import { ROUTES, SITE, absoluteUrl, metaDescription, type RouteKey } from "@/lib/routes";

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
 * The share image comes from app/opengraph-image.tsx, which next/og renders to
 * a 1200x630 PNG during the static export and Next attaches to every route.
 * Nothing here names an image, because naming one would shadow it.
 */
export function routeMetadata(key: RouteKey): Metadata {
  const route = ROUTES[key];
  const url = absoluteUrl(route.path);
  const description = metaDescription(route.description);
  const title = `${route.title} — ${SITE.name}`;
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
      locale: "en",
      // Image intentionally omitted - app/opengraph-image.tsx provides the
      // 1200x630 card for every route. Setting one here would replace it.
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
