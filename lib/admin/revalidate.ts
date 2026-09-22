import { refresh, revalidatePath } from "next/cache";

/** Every admin catalog section, as the sidebar registry spells them. */
export type AdminSection =
  | "products"
  | "categories"
  | "designers"
  | "collections"
  | "materials"
  | "flagships"
  | "projects"
  | "fabrics"
  | "catalogue";

/**
 * The public route-file pattern each section feeds, so a dashboard edit also
 * expires the public list/detail pages that render the same rows. `null` when
 * a section has no dedicated public page of its own (categories and fabrics
 * render through the products / materials routes).
 */
const PUBLIC_ROUTES: Record<AdminSection, readonly string[]> = {
  products: [
    "/[locale]/products",
    "/[locale]/products/[product]",
    "/[locale]/products/[product]/[prod]",
  ],
  categories: [
    "/[locale]/products",
    "/[locale]/products/[product]",
    "/[locale]/products/[product]/[prod]",
  ],
  designers: ["/[locale]/designers", "/[locale]/designers/[slug]"],
  collections: ["/[locale]/collections", "/[locale]/collections/[slug]"],
  materials: ["/[locale]/materials", "/[locale]/materials/[material]"],
  flagships: ["/[locale]/flagship", "/[locale]/flagship/[slug]"],
  projects: ["/[locale]/projects", "/[locale]/projects/[id]"],
  fabrics: ["/[locale]/materials", "/[locale]/materials/[material]"],
  catalogue: ["/[locale]/catalogue"],
};

/**
 * Expires the affected routes after an admin mutation.
 *
 * `revalidatePath` matches the ROUTE FILE structure, and `proxy.ts` rewrites the
 * unprefixed `/admin/...` URL to `/fa/admin/...`, so the `/[locale]/...` patterns
 * are what actually match the cache entries — passing the browser-literal path
 * would silently invalidate nothing (the bundled revalidatePath docs call this
 * out for rewrites). `refresh()` then re-renders the page the action ran on so
 * the table reflects the change immediately.
 *
 * SlugHistory recording stays out of this module on purpose: the dashboard's
 * slug rename is a TODO for the redemption pass (see the action modules).
 */
export function revalidateCatalog(
  section: AdminSection,
  options: { id?: string } = {},
): void {
  revalidatePath(`/[locale]/admin/${section}`, "page");
  if (options.id) {
    revalidatePath(`/[locale]/admin/${section}/[id]`, "page");
  }
  // The overview's stat cards read the same rows — keep them honest too.
  revalidatePath("/[locale]/admin", "page");

  for (const route of PUBLIC_ROUTES[section]) {
    revalidatePath(route, "page");
  }

  refresh();
}
