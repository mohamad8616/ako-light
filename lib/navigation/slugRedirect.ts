/**
 * Route-level slug-rename redirect helper for the public catalog routes.
 *
 * Admin CRUD (Step 7) records every old slug in `slug_history`; when a public
 * route's primary slug lookup misses, the page falls back to that history and
 * permanently redirects to the entity's current URL instead of 404ing.
 *
 * This lives beside the routes rather than in `lib/repositories` on purpose:
 * the repository modules stay free of `next/*` imports so the vitest tiers can
 * import the resolution logic (`getCatalogRedirectPath`) without a Next server
 * context. Status code: `permanentRedirect()` serves **HTTP 308 (Permanent)**;
 * the App Router has no 301 emitter (a literal 301 needs `next.config.js`
 * redirects or the Proxy).
 */
import { permanentRedirect } from "next/navigation";
import { getLocalizedPath } from "@/lib/i18n/routing";
import type { CatalogModelType } from "@/lib/repositories/slug-history";
import { getCatalogRedirectPath } from "@/lib/repositories/slug-history";
import { resolveLocale } from "@/lib/seo/metadata";

export interface SlugRedirectOptions {
  /** Route locale param ("fa" | "en"). The redirect keeps the URL's language
   * tree: Persian is unprefixed, English stays under `/en`. */
  locale: string;
  /** Product routes only: the category slug segment of the requested URL. */
  categorySlug?: string;
}

/**
 * Redirects to the entity's current URL when the requested slug is a
 * *historical* one, and otherwise does nothing so the caller keeps its own
 * miss behaviour (`notFound()`, or the materials category-view fallback):
 *
 *   const collection = await getCollection(slug);
 *   if (!collection) {
 *     await redirectIfSlugRenamed("collection", slug, { locale });
 *     notFound();
 *   }
 *
 * Returns only when there is nothing to redirect (it never renders content of
 * its own), so it must be called immediately before the caller's own miss path.
 */
export async function redirectIfSlugRenamed(
  modelType: CatalogModelType,
  requestedSlug: string,
  options: SlugRedirectOptions,
): Promise<void> {
  const movedTo = await getCatalogRedirectPath(
    modelType,
    requestedSlug,
    options.categorySlug,
  );
  if (movedTo) {
    permanentRedirect(getLocalizedPath(movedTo, resolveLocale(options.locale)));
  }
}
