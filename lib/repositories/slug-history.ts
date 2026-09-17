/**
 * Slug rename redirect history (`slug_history`).
 *
 * Admin CRUD (Step 7) calls {@link recordSlugChange} *before* mutating a
 * slug, then public dynamic routes call {@link getCatalogRedirectPath} when
 * their primary slug lookup returns `null`, so an inbound link to a renamed
 * URL permanently redirects to the current one instead of 404ing.
 *
 * Status code: the App Router's `permanentRedirect()` — the function the
 * routes call with this helper's result — serves an **HTTP 308 (Permanent)**
 * in a server-rendered route; Next has no 301 emitter (a literal 301 would
 * require `next.config.js` redirects or the Proxy). 308 is a permanent,
 * method-preserving redirect, which is the SEO-correct behaviour here.
 */
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

export type CatalogModelType =
  | "product" | "productCategory" | "collection" | "designer"
  | "material" | "flagship" | "project";
type Db = Prisma.TransactionClient;

/**
 * Call BEFORE updating the slug, passing the same transaction client as the
 * update. A conflicting historical owner fails rather than stealing its URL.
 * Step 7 must also reserve historical slugs and invalidate affected page caches.
 */
export function recordSlugChange(
  modelType: CatalogModelType,
  entityId: string,
  oldSlug: string,
  db: Db = prisma,
) {
  return db.slugHistory.create({ data: { modelType, entityId, oldSlug } });
}

async function findEntity(modelType: CatalogModelType, where: { id: string } | { slug: string }, db: Db) {
  const select = { id: true, slug: true };
  switch (modelType) {
    case "product": return db.product.findUnique({ where, select });
    case "productCategory": return db.productCategory.findUnique({ where, select });
    case "collection": return db.collection.findUnique({ where, select });
    case "designer": return db.designer.findUnique({ where, select });
    case "material": return db.material.findUnique({ where, select });
    case "flagship": return db.flagship.findUnique({ where, select });
    case "project": return db.project.findUnique({ where, select });
  }
}

async function resolveEntity(modelType: CatalogModelType, slug: string, db: Db) {
  // A current route always wins over history. Deleted entities remain 404s.
  const current = await findEntity(modelType, { slug }, db);
  if (current) return current;
  const history = await db.slugHistory.findUnique({
    where: { modelType_oldSlug: { modelType, oldSlug: slug } },
  });
  return history ? findEntity(modelType, { id: history.entityId }, db) : null;
}

const paths = {
  productCategory: "products", collection: "collections", designer: "designers",
  material: "materials", flagship: "flagship", project: "projects",
} as const;

/** Resolve directly to the latest URL (no history chains or self redirects).
 * Product detail routes also validate historical category ownership by id.
 *
 * Returns `null` when nothing moved (the caller then keeps its existing
 * behaviour: `notFound()`, or the materials category-view fallback).
 */
export async function getCatalogRedirectPath(
  modelType: CatalogModelType,
  requestedSlug: string,
  categorySlug?: string,
  db: Db = prisma,
): Promise<string | null> {
  const entity = await resolveEntity(modelType, requestedSlug, db);
  if (!entity) return null;
  if (modelType === "product") {
    if (!categorySlug) return null;
    const product = await db.product.findUnique({
      where: { id: entity.id },
      select: { slug: true, categoryId: true, category: { select: { slug: true } } },
    });
    const category = await resolveEntity("productCategory", categorySlug, db);
    if (!product || category?.id !== product.categoryId) return null;
    if (product.slug === requestedSlug && product.category.slug === categorySlug) return null;
    return `/products/${encodeURIComponent(product.category.slug)}/${encodeURIComponent(product.slug)}`;
  }
  if (entity.slug === requestedSlug) return null;
  return `/${paths[modelType]}/${encodeURIComponent(entity.slug)}`;
}

/** Proxy entry point: only catalog detail paths incur database work. */
export async function getCatalogPathRedirect(path: string): Promise<string | null> {
  const parts = path.split("/").filter(Boolean);
  let decoded: string[];
  try { decoded = parts.map(decodeURIComponent); } catch { return null; }
  const [section, slug, product] = decoded;
  if (section === "products" && decoded.length === 3) {
    return getCatalogRedirectPath("product", product, slug);
  }
  if (decoded.length !== 2) return null;
  const entry = Object.entries(paths).find(([, prefix]) => prefix === section);
  return entry ? getCatalogRedirectPath(entry[0] as Exclude<CatalogModelType, "product">, slug) : null;
}
