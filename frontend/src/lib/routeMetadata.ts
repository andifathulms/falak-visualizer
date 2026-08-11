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
 * The image is the existing 512px PWA icon. Not a purpose-made share card:
 * generating one per route needs a rendering step this build does not have, and
 * a real icon beats a missing preview.
 */
export function routeMetadata(key: RouteKey): Metadata {
  const route = ROUTES[key];
  const url = absoluteUrl(route.path);
  const description = metaDescription(route.description);
  const title = `${route.title} — ${SITE.name}`;
  const image = absoluteUrl("/icons/falak-512.png");

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
      images: [{ url: image, width: 512, height: 512, alt: `${SITE.name} icon` }],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: [image],
    },
  };
}
