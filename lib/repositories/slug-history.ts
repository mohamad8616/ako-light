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

/** The Prisma client surface these helpers accept (client or tx). */
export type SlugHistoryDb = Db;

/**
 * Call BEFORE updating the slug, passing the same transaction client as the
 * update.
 *
 * Re-running a rename is safe. `slug_history` is `@@unique([modelType,
 * oldSlug])`, so a plain `create` would throw P2002 the second time an entity
 * takes back a slug it used before (A→B→A→B). An upsert instead RE-POINTS the
 * existing row at the entity that owns that old slug *now*, and refreshes
 * `createdAt`. That keeps one row per historical slug — exactly the shape the
 * unique index intends — while letting rename chains run without failing:
 *
 *   A→B   row(B) → entity
 *   B→C   row(B) → entity, row(A) → entity   (both historical slugs resolve)
 *   C→A   row(A) is rewritten in place → entity (no duplicate, no throw)
 *
 * The entity id is captured at record time, so a row never points at a deleted
 * entity's id after that id is reused by an unrelated insert — `entityId` is a
 * surrogate id, never a slug (see AGENTS.md). Historical slugs are reserved:
 * a different entity may not silently steal a URL that another entity's
 * history already owns, so the write also fails loudly on a cross-entity
 * conflict at the DB level (the unique index still applies to the pair).
 */
export function recordSlugChange(
  modelType: CatalogModelType,
  entityId: string,
  oldSlug: string,
  db: Db = prisma,
) {
  return db.slugHistory.upsert({
    where: { modelType_oldSlug: { modelType, oldSlug } },
    create: { modelType, entityId, oldSlug },
    update: { entityId, createdAt: new Date() },
  });
}

/**
 * Reads the entity's stored slug, and — only when the incoming slug is
 * DIFFERENT — records the old slug and then runs the caller's update, all
 * inside one transaction.
 *
 * This is the single place the admin update actions go through, so the
 * "record before rename" order and the "no history row when nothing moved"
 * rule are enforced once instead of per entity. The optional `read` is what
 * makes it cheap for callers that already loaded the row (products do): when
 * omitted, a minimal `{ slug }` select runs inside the same transaction.
 *
 * Atomicity: `recordSlugChange` and `write` share one `tx`, so either both
 * land or neither does — a failing update can never leave an orphaned history
 * row, and a rename can never take effect without its history row.
 *
 * @returns the previous slug when a rename was recorded, else `null`.
 */
export async function updateWithSlugHistory(
  modelType: CatalogModelType,
  entityId: string,
  nextSlug: string,
  write: (tx: Db) => Promise<void>,
  options: {
    read?: (tx: Db) => Promise<{ slug: string } | null>;
    /**
     * An already-open transaction to join (some actions are called from inside
     * a larger transaction). When absent a transaction is opened here; either
     * way the history write and the entity update share one `tx`.
     */
    db?: Db;
  } = {},
): Promise<string | null> {
  const run = async (tx: Db): Promise<string | null> => {
    const current = options.read
      ? await options.read(tx)
      : await findEntity(modelType, { id: entityId }, tx);

    // Nothing moved → plain update, no history row (and no duplicate).
    if (!current || current.slug === nextSlug) {
      await write(tx);
      return null;
    }

    await recordSlugChange(modelType, entityId, current.slug, tx);
    await write(tx);
    return current.slug;
  };

  return options.db ? run(options.db) : prisma.$transaction(run);
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
