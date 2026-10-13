import type { MetadataRoute } from "next";
import { siteBlocked, siteUrl } from "@/lib/seo/config";

// Evaluated per request rather than frozen at build time. A metadata route
// handler is cached by default, which would bake whichever state the flag had
// during the image build — and container builds (Liara) do not see the runtime
// environment, so the flag could never change without a code edit. Mirrors
// app/sitemap.ts, which is force-dynamic for the same class of reason.
export const dynamic = "force-dynamic";

/**
 * Public crawl policy. Everything is allowed — the locale architecture
 * (proxy rewrite) never blocks crawlers because unprefixed URLs render
 * normally. /api/ is internal and disallowed.
 *
 * The /search page is intentionally NOT disallowed here: it serves a
 * `noindex, follow` robots meta (see app/[locale]/search/page.tsx), which
 * crawlers must be able to read.
 *
 * While SITE_BLOCKED is on (site under construction) every crawler is kept
 * away from the entire site, and the Sitemap line is omitted: advertising a
 * full sitemap to a crawler that may fetch nothing is a contradiction, and
 * app/sitemap.ts returns [] while blocked for the same reason.
 */
export default function robots(): MetadataRoute.Robots {
  if (siteBlocked) {
    return {
      rules: [
        {
          userAgent: "*",
          disallow: "/",
        },
      ],
    };
  }

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
