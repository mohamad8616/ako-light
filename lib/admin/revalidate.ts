import { NAV_CATEGORIES_TAG } from "@/lib/cache-tags";
import { refresh, revalidatePath, updateTag } from "next/cache";

/** Every admin catalog section, as the sidebar registry spells them. */
export type AdminSection =
  | "homepage"
  | "about"
  | "s34"
  | "products"
  | "categories"
  | "designers"
  | "collections"
  | "materials"
  | "flagships"
  | "projects"
  | "fabrics"
  | "catalogue"
  | "orders"
  | "admins"
  /** The media library (Pass 13.5) — metadata rows, not a catalog table. */
  | "media";

/**
 * The public route-file pattern each section feeds, so a dashboard edit also
 * expires the public list/detail pages that render the same rows. `null` when
 * a section has no dedicated public page of its own (categories and fabrics
 * render through the products / materials routes).
 */
const PUBLIC_ROUTES: Record<AdminSection, readonly string[]> = {
  // The homepage feature slots are singleton configuration rows, not list rows:
  // the only public route file that renders them is the site's home page.
  homepage: ["/[locale]/(site)"],
  // Same shape of singleton page-content rows, one route file per page.
  about: ["/[locale]/(site)/about"],
  s34: ["/[locale]/(site)/s34"],
  products: [
    "/[locale]/(site)/products",
    "/[locale]/(site)/products/[product]",
    "/[locale]/(site)/products/[product]/[prod]",
  ],
  categories: [
    "/[locale]/(site)/products",
    "/[locale]/(site)/products/[product]",
    "/[locale]/(site)/products/[product]/[prod]",
  ],
  designers: [
    "/[locale]/(site)/designers",
    "/[locale]/(site)/designers/[slug]",
  ],
  collections: [
    "/[locale]/(site)/collections",
    "/[locale]/(site)/collections/[slug]",
  ],
  materials: [
    "/[locale]/(site)/materials",
    "/[locale]/(site)/materials/[material]",
  ],
  flagships: [
    "/[locale]/(site)/flagship",
    "/[locale]/(site)/flagship/[slug]",
  ],
  projects: [
    "/[locale]/(site)/projects",
    "/[locale]/(site)/projects/[id]",
  ],
  fabrics: [
    "/[locale]/(site)/materials",
    "/[locale]/(site)/materials/[material]",
  ],
  catalogue: ["/[locale]/(site)/catalogue"],
  // Orders are admin-only records with no public route of their own — the
  // customer-facing surfaces are the checkout callback and account pages, which
  // do not read fulfillment status.
  orders: [],
  // Owner-only user management has no public surface at all: a role change
  // affects the account's next session, never a page any visitor renders.
  admins: [],
  // The media library has no public route of its own either — it is a store the
  // catalog will REFERENCE. Until a catalog model points at a Media row, editing
  // media metadata cannot change what any visitor sees, so there is nothing to
  // expire. Add the referencing routes here when that migration lands.
  media: [],
};

/**
 * Expires the affected routes after an admin mutation.
 *
 * `revalidatePath` matches the ROUTE FILE structure, not the browser URL. The
 * route groups are part of that structure, so both `(admin)` and `(site)` must
 * be included in the patterns below. `proxy.ts` rewrites the unprefixed public
 * URL to the `fa` locale internally, while `/en/...` passes through; using the
 * route-file patterns invalidates both locale variants. `refresh()` then
 * re-renders the page the action ran on so the table reflects the change
 * immediately.
 *
 * SlugHistory recording lives in the action modules, not here: each catalog
 * update action wraps its repository write in `updateWithSlugHistory`, which is
 * what records a retired slug and keeps the entity update atomic with it.
 */
export function revalidateCatalog(
  section: AdminSection,
  options: { id?: string } = {},
): void {
  revalidatePath(`/[locale]/(admin)/admin/${section}`, "page");
  if (options.id) {
    revalidatePath(`/[locale]/(admin)/admin/${section}/[id]`, "page");
  }
  // The overview's stat cards read the same rows — keep them honest too.
  revalidatePath("/[locale]/(admin)/admin", "page");

  for (const route of PUBLIC_ROUTES[section]) {
    revalidatePath(route, "page");
  }

  // The navigation menu is cached across requests (getNavCategories) because
  // the (site) layout reads it on every public page. `revalidatePath` above
  // only expires the routes it names, and the nav appears on ALL of them, so
  // the cache tag is what makes a category rename or reorder show up straight
  // away instead of waiting out the cache window.
  if (section === "categories") {
    // `updateTag`, not `revalidateTag`: this runs inside a Server Action and the
    // admin must see the new nav immediately. updateTag expires the tag at once
    // (the next request waits for fresh data) whereas revalidateTag serves stale
    // content first and refreshes in the background — and its single-argument
    // form is deprecated in Next 16 anyway.
    updateTag(NAV_CATEGORIES_TAG);
  }

  refresh();
}
