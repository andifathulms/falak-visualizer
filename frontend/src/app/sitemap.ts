import type { MetadataRoute } from "next";
import { ALL_PATHS, absoluteUrl } from "@/lib/routes";

/**
 * Generated from the same route list the pages and their metadata use, so a new
 * route cannot be added to the nav and forgotten here.
 *
 * No lastModified: this is a static export with no per-route build timestamp,
 * and a date invented at build time would claim a freshness the content does
 * not have.
 */
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  // Trailing slash to match the canonical URLs exactly: next.config sets
  // trailingSlash for the static export, so /converter/ is the canonical form
  // and a sitemap listing /converter would point at a redirect of itself.
  return ALL_PATHS.map((path) => ({
    url: absoluteUrl(path).replace(/\/?$/, "/"),
    changeFrequency: "monthly" as const,
    priority: path === "/" ? 1 : 0.8,
  }));
}
