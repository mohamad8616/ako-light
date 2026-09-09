import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo/config";

/**
 * Public crawl policy. Everything is allowed — the locale architecture
 * (proxy rewrite) never blocks crawlers because unprefixed URLs render
 * normally. /api/ is internal and disallowed.
 *
 * The /search page is intentionally NOT disallowed here: it serves a
 * `noindex, follow` robots meta (see app/[locale]/search/page.tsx), which
 * crawlers must be able to read.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
