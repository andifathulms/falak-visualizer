import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/routes";

/**
 * Everything here is public calculation with no user data and nothing behind a
 * login, so there is nothing to disallow. The file exists to point crawlers at
 * the sitemap, which they will not find otherwise.
 */
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
