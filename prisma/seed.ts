/**
 * Catalog/content seed.
 *
 * The static modules under lib/data/* are imported (not copied), so this script
 * can never drift from the data the site currently renders. Every row is
 * upserted on `slug`, which makes the seed safely re-runnable.
 *
 * Run it with:
 *   npx prisma db seed      (command wired up in prisma7.config.ts)
 *   npx tsx prisma/seed.ts  (direct)
 */
import "dotenv/config";

import { MaterialType, Prisma } from "@/generated/prisma/client";
import { catalogueItems } from "@/lib/data/catalogue";
import { collections } from "@/lib/data/collections";
import { designers } from "@/lib/data/designers";
import { flagshipDetails, flagships } from "@/lib/data/flagships";
import { fabrics, materials, type Material } from "@/lib/data/materials";
import { productCategories } from "@/lib/data/productCategories";
import { projects } from "@/lib/data/projects";
import { prisma } from "@/lib/db/prisma";

/** A source record that could not be mapped 1:1 onto the schema. */
interface MappingIssue {
  entity: string;
  slug: string;
  reason: string;
}

const issues: MappingIssue[] = [];

function note(entity: string, slug: string, reason: string): void {
  issues.push({ entity, slug, reason });
}

/**
 * JSON columns store `Localized` / array content verbatim. Prisma's
 * `InputJsonValue` only accepts object literals (interfaces such as
 * `Localized` have no implicit index signature), so widen once, here.
 */
const asJson = (value: unknown): Prisma.InputJsonValue =>
  value as Prisma.InputJsonValue;

/**
 * lib/data/materials.ts `type` union -> Prisma enum. `stone-composite` is the
 * only value whose Prisma name differs (hyphens are invalid in enum value
 * names; the database still stores "stone-composite").
 */
const MATERIAL_TYPES: Record<Material["type"], MaterialType> = {
  stone: MaterialType.stone,
  metal: MaterialType.metal,
  glass: MaterialType.glass,
  wood: MaterialType.wood,
  fabric: MaterialType.fabric,
  leather: MaterialType.leather,
  marble: MaterialType.marble,
  "stone-composite": MaterialType.stone_composite,
};

/** Report (and keep going past) duplicate slugs before they hit unique indexes. */
function duplicateSlugs(rows: { slug: string }[]): string[] {
  const seen = new Map<string, number>();
  for (const row of rows) seen.set(row.slug, (seen.get(row.slug) ?? 0) + 1);
  return [...seen]
    .filter(([, n]) => n > 1)
    .map(([slug, n]) => `${slug} x${n}`);
}

/** "…/designers/massimo-castagna" -> "massimo-castagna" */
function designerSlugFromHref(href: string): string | null {
  const match = /\/designers\/([^/?#]+)/.exec(href);
  return match?.[1] ?? null;
}

async function seedProductCategories(): Promise<void> {
  // `sortOrder` mirrors the array order that drives category navigation.
  for (const [sortOrder, category] of productCategories.entries()) {
    await prisma.productCategory.upsert({
      where: { slug: category.slug },
      create: {
        id: category.id,
        slug: category.slug,
        i18nKey: category.i18nKey,
        name: asJson(category.name),
        sortOrder,
      },
      update: {
        i18nKey: category.i18nKey,
        name: asJson(category.name),
        sortOrder,
      },
    });
  }
}

async function seedDesigners(): Promise<void> {
  for (const [sortOrder, designer] of designers.entries()) {
    const slug = designer.slug;
    if (!slug) {
      note("Designer", designer.name.en, "missing slug");
      continue;
    }
    await prisma.designer.upsert({
      where: { slug },
      create: {
        id: slug,
        slug,
        name: asJson(designer.name),
        image: designer.image,
        website: designer.website ?? null,
        bio: asJson(designer.bio),
        sortOrder,
      },
      update: {
        name: asJson(designer.name),
        image: designer.image,
        website: designer.website ?? null,
        bio: asJson(designer.bio),
        sortOrder,
      },
    });
  }
}

async function seedCollections(): Promise<void> {
  for (const [sortOrder, collection] of collections.entries()) {
    await prisma.collection.upsert({
      where: { slug: collection.slug },
      create: {
        id: collection.id,
        slug: collection.slug,
        name: asJson(collection.name),
        year: collection.year,
        image: collection.image,
        description: asJson(collection.description),
        sortOrder,
      },
      update: {
        name: asJson(collection.name),
        year: collection.year,
        image: collection.image,
        description: asJson(collection.description),
        sortOrder,
      },
    });
  }
}

async function seedMaterials(): Promise<void> {
  for (const [sortOrder, material] of materials.entries()) {
    const type = MATERIAL_TYPES[material.type];
    if (!type) {
      note("Material", material.id, `unmapped type "${material.type}"`);
      continue;
    }
    // The source only has `id`; it is already URL-safe so it doubles as slug.
    const slug = material.id;
    await prisma.material.upsert({
      where: { slug },
      create: {
        id: material.id,
        slug,
        name: asJson(material.name),
        category: material.category,
        type,
        image: material.image,
        description: asJson(material.description),
        sortOrder,
      },
      update: {
        name: asJson(material.name),
        category: material.category,
        type,
        image: material.image,
        description: asJson(material.description),
        sortOrder,
      },
    });
  }
}

async function seedFlagships(): Promise<void> {
  for (const [sortOrder, flagship] of flagships.entries()) {
    // `detail` stays SQL NULL for flagships whose detail page is not built yet
    // (Prisma.DbNull writes NULL on both create and update).
    const detail = flagshipDetails[flagship.slug];
    await prisma.flagship.upsert({
      where: { slug: flagship.slug },
      create: {
        id: flagship.slug,
        slug: flagship.slug,
        name: asJson(flagship.name),
        city: asJson(flagship.city),
        image: flagship.image,
        detail: detail ? asJson(detail) : Prisma.DbNull,
        sortOrder,
      },
      update: {
        name: asJson(flagship.name),
        city: asJson(flagship.city),
        image: flagship.image,
        detail: detail ? asJson(detail) : Prisma.DbNull,
        sortOrder,
      },
    });
  }
}

/**
 * `Product.slug` carries a global unique index (see prisma/schema.prisma), while
 * the source data groups products per category — so the same slug appearing in
 * two categories would be a real conflict, and is reported instead of crashing.
 */
async function seedProducts(): Promise<void> {
  // Slug -> id maps. The FK columns hold the parent's `id` (id-based FK
  // convention), while the source data only ever gives us parent *slugs*, so
  // every incoming slug is resolved to the row it belongs to before it is
  // written into a `*Id` column.
  const categoryIdsBySlug = new Map(
    productCategories.map((category) => [category.slug, category.id]),
  );
  // Designer.id is the designer's slug: the static data carries no id of its
  // own, so seedDesigners() uses the slug as the row id.
  const designerIdsBySlug = new Map(
    designers.map((designer) => [designer.slug, designer.slug]),
  );

  for (const category of productCategories) {
    for (const [sortOrder, product] of category.products.entries()) {
      if (!product.slug) {
        note("Product", product.id, "missing slug");
        continue;
      }

      // The source data stores the parent category's *slug*; the FK column
      // holds ProductCategory.id (id-based FK convention).
      const categorySlug = product.category || category.slug;
      const categoryId = categoryIdsBySlug.get(categorySlug);
      if (!categoryId) {
        note(
          "Product",
          product.slug,
          `category "${categorySlug}" has no ProductCategory row (skipped: FK)`,
        );
        continue;
      }
      if (categorySlug !== category.slug) {
        note(
          "Product",
          product.slug,
          `category "${categorySlug}" differs from the module it lives in ("${category.slug}")`,
        );
      }

      // Product.designer.href ends with the Designer.slug, which is resolved to
      // the Designer.id the FK column stores.
      let designerId: string | null = null;
      const designerSlug = designerSlugFromHref(product.designer.href);
      const resolvedDesignerId = designerSlug
        ? designerIdsBySlug.get(designerSlug)
        : undefined;
      if (resolvedDesignerId) {
        designerId = resolvedDesignerId;
      } else if (designerSlug) {
        note(
          "Product",
          product.slug,
          `designer href "${product.designer.href}" matches no Designer.slug (designerId left null)`,
        );
      } else {
        note(
          "Product",
          product.slug,
          `designer href "${product.designer.href}" is not a /designers/<slug> path (designerId left null)`,
        );
      }

      const data = {
        name: asJson(product.name),
        // Note: `images` is no longer a Product column — the flat array was
        // replaced by the relational ProductImage table, seeded separately
        // below by seedProductImages() from the same source arrays.
        hoverImage: product.hoverImage,
        price: product.price,
        existsInStore: product.store.existsInStore,
        quantity: product.store.quantity,
        heroImage: product.heroImage,
        description: asJson(product.description),
        moreInfo: product.moreInfo ? asJson(product.moreInfo) : Prisma.DbNull,
        downloads: asJson(product.downloads),
        related: asJson(product.related),
        categoryId,
        designerId,
        sortOrder,
      };

      await prisma.product.upsert({
        where: { slug: product.slug },
        create: { id: product.id, slug: product.slug, ...data },
        update: data,
      });
    }
  }
}

async function seedProjects(): Promise<void> {
  // Slug -> id for the join table's product FK (id-based FK convention). The
  // project's own id doubles as its slug (see below), so it needs no mapping.
  const productIdsBySlug = new Map(
    productCategories.flatMap((category) =>
      category.products.map((product) => [product.slug, product.id]),
    ),
  );

  for (const [sortOrder, project] of projects.entries()) {
    // `Project` has no slug in the source data — it is added by this step. The
    // existing `id` values are already URL-safe (h-istra, vocla-2026, ...), so
    // they double as the route handle.
    const slug = project.id;

    const data = {
      i18nKey: project.i18nKey,
      name: asJson(project.name),
      location: project.location,
      year: project.year,
      image: project.image,
      description: asJson(project.description),
      paragraph: asJson(project.paragraph),
      moreDescription: asJson(project.moreDescription),
      credits: asJson(project.credits),
      portfolioImages: project.portfolioImages,
      sortOrder,
    };

    await prisma.project.upsert({
      where: { slug },
      create: { id: project.id, slug, ...data },
      update: data,
    });

    // Join rows are replaced wholesale so `order` always matches the source
    // array (upserting by hand would leave stale rows behind).
    await prisma.projectProduct.deleteMany({ where: { projectId: slug } });

    const seen = new Set<string>();
    const rows: { projectId: string; productId: string; order: number }[] = [];
    for (const used of project.productsUsed) {
      const productId = productIdsBySlug.get(used.slug);
      if (!productId) {
        note(
          "Project",
          slug,
          `productsUsed "${used.slug}" has no Product row (link skipped)`,
        );
        continue;
      }
      if (seen.has(used.slug)) {
        note(
          "Project",
          slug,
          `productsUsed lists "${used.slug}" more than once (deduplicated)`,
        );
        continue;
      }
      seen.add(used.slug);
      // Contiguous order: skips above must not leave gaps.
      rows.push({ projectId: slug, productId, order: rows.length });
    }
    if (rows.length > 0) await prisma.projectProduct.createMany({ data: rows });
  }
}

/** lib/data/product-categories/* `Product.images[]` → ProductImage rows.
 * Idempotent on a synthetic `{ productId, sortOrder }` unique constraint is NOT
 * available (no unique constraint covers both columns), so we delete-then-create
 * per product to keep the table in sync with the source arrays.
 */
async function seedProductImages(): Promise<void> {
  const allProducts = productCategories.flatMap((c) => c.products);

  for (const product of allProducts) {
    if (!product.slug) continue;

    // ProductImage.productId references Product.id (id-based FK convention).
    const productId = product.id;

    // Replace the whole image set for this product so the table mirrors the
    // source arrays exactly (order, count, URLs).
    await prisma.productImage.deleteMany({ where: { productId } });

    const images = product.images || [];
    if (images.length === 0) continue;

    const rows = images.map((url, idx) => ({
      id: `${product.slug}-img-${String(idx).padStart(3, "0")}`,
      productId,
      url,
      alt: product.name?.en || undefined,
      sortOrder: idx,
      isPrimary: idx === 0,
    }));

    await prisma.productImage.createMany({ data: rows });
  }
}

/** lib/data/materials.ts `fabrics[]` → FabricItem rows. Idempotent on `id`. */
async function seedFabricItems(): Promise<void> {
  for (const [sortOrder, fabric] of fabrics.entries()) {
    await prisma.fabricItem.upsert({
      where: { id: fabric.id },
      create: {
        id: fabric.id,
        name: fabric.name,
        code: fabric.code,
        category: fabric.category,
        swatchColor: fabric.swatchColor,
        sortOrder,
      },
      update: {
        name: fabric.name,
        code: fabric.code,
        category: fabric.category,
        swatchColor: fabric.swatchColor,
        sortOrder,
      },
    });
  }
}

/** lib/data/catalogue.ts `catalogueItems[]` → CatalogueItem rows. Idempotent on `id`. */
async function seedCatalogueItems(): Promise<void> {
  for (const [sortOrder, item] of catalogueItems.entries()) {
    await prisma.catalogueItem.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        title: item.title,
        href: item.href,
        coverColor: item.coverColor,
        coverTextColor: item.coverTextColor ?? null,
        sortOrder,
      },
      update: {
        title: item.title,
        href: item.href,
        coverColor: item.coverColor,
        coverTextColor: item.coverTextColor ?? null,
        sortOrder,
      },
    });
  }
}

async function main(): Promise<void> {
  const startedAt = Date.now();
  const allProducts = productCategories.flatMap((c) => c.products);

  // Pre-flight duplicate check: a duplicated slug would be silently overwritten
  // by the upsert (and break the unique index), so surface it explicitly.
  const dupSources: [string, { slug: string }[]][] = [
    ["ProductCategory", productCategories],
    ["Product", allProducts],
    ["Designer", designers],
    ["Collection", collections],
    ["Material", materials.map((m) => ({ slug: m.id }))],
    ["Flagship", flagships],
    ["Project", projects.map((p) => ({ slug: p.id }))],
  ];
  for (const [entity, rows] of dupSources) {
    for (const dup of duplicateSlugs(rows)) {
      note(entity, dup.split(" ")[0], `duplicate slug in source data (${dup})`);
    }
  }

  // Order matters: FKs point at categories/designers/products.
  await seedProductCategories();
  await seedDesigners();
  await seedProducts();
  await seedProductImages();   // depends on products (productId = product.slug)
  await seedCollections();
  await seedMaterials();
  await seedFabricItems();
  await seedCatalogueItems();
  await seedFlagships();
  await seedProjects();

  const counts: [string, () => Promise<number>][] = [
    ["product_category", () => prisma.productCategory.count()],
    ["designer", () => prisma.designer.count()],
    ["product", () => prisma.product.count()],
    ["product_image", () => prisma.productImage.count()],
    ["collection", () => prisma.collection.count()],
    ["material", () => prisma.material.count()],
    ["fabric_item", () => prisma.fabricItem.count()],
    ["catalogue_item", () => prisma.catalogueItem.count()],
    ["flagship", () => prisma.flagship.count()],
    ["project", () => prisma.project.count()],
    ["project_product", () => prisma.projectProduct.count()],
  ];

  console.log("\n=== Catalog seed summary ===");
  console.log(
    `source arrays: ${productCategories.length} categories, ${allProducts.length} products, ` +
      `${collections.length} collections, ${designers.length} designers, ` +
      `${materials.length} materials, ${fabrics.length} fabrics, ` +
      `${catalogueItems.length} catalogue items, ${flagships.length} flagships, ` +
      `${projects.length} projects (${Object.keys(flagshipDetails).length} with detail content)`,
  );
  console.log("rows in database:");
  for (const [table, count] of counts) {
    console.log(`  ${table.padEnd(18)} ${await count()}`);
  }

  if (issues.length === 0) {
    console.log("\nunmapped records: none — every source record mapped cleanly.");
  } else {
    console.log(`\nunmapped records (${issues.length}):`);
    for (const issue of issues) {
      console.log(`  [${issue.entity}] ${issue.slug}: ${issue.reason}`);
    }
  }
  console.log(`\nseed finished in ${Date.now() - startedAt}ms.`);
}

main()
  .catch((error: unknown) => {
    console.error("[seed] failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
