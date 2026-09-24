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
 * SlugHistory recording stays out of this module on purpose: the dashboard's
 * slug rename is a TODO for the redemption pass (see the action modules).
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

  refresh();
}
