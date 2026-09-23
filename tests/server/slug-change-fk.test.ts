/**
 * Repository tier — a slug rename must be a non-event for id-based FKs.
 *
 * Every catalog FK points at the parent's `id` (Pass 11C migration); `slug` is
 * only the route handle. This proves it through the SAME repository write
 * functions the admin actions call: create a category/designer/product/project
 * chain, rename all four, and show that every FK column and relation is
 * untouched while the relations resolve to the renamed rows. All writes run
 * inside one transaction that is always rolled back, so the dev database is
 * never mutated.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  createDesigner,
  updateDesigner,
  type DesignerWriteInput,
} from "@/lib/repositories/designers";
import {
  createProduct,
  updateProduct,
  type ProductWriteInput,
} from "@/lib/repositories/products";
import {
  createProductCategory,
  updateProductCategory,
  type ProductCategoryWriteInput,
} from "@/lib/repositories/product-categories";
import {
  createProject,
  updateProject,
  type ProjectWriteInput,
} from "@/lib/repositories/projects";
import { hasDatabaseUrl } from "@/tests/helpers/db";

const describeDb = describe.skipIf(!hasDatabaseUrl);

describeDb("slug renames preserve id-based FKs (repository writes)", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("renaming category, designer, product and project breaks no relationship", async () => {
    const suffix = randomUUID();
    const category: ProductCategoryWriteInput = {
      slug: `test-fk-cat-${suffix}`,
      i18nKey: `products.fk-${suffix}`,
      name: { en: "FK Category", fa: "دسته تست" },
      sortOrder: 0,
    };
    const designer: DesignerWriteInput = {
      slug: `test-fk-des-${suffix}`,
      name: { en: "FK Designer", fa: "طراح تست" },
      image: "/test-fk.jpg",
      website: null,
      bio: [],
      sortOrder: 0,
    };
    // createX sets id = slug AT CREATE TIME, so the FK ids are known upfront;
    // after the renames below, id !== slug — the exact shape the FK migration
    // had to survive.
    const product: ProductWriteInput = {
      slug: `test-fk-prod-${suffix}`,
      name: { en: "FK Product", fa: "محصول تست" },
      hoverImage: "/test-fk-hover.jpg",
      heroImage: "/test-fk-hero.jpg",
      price: 10,
      existsInStore: true,
      quantity: 3,
      description: { en: "Desc", fa: "توضیح" },
      moreInfo: null,
      downloads: [],
      related: [],
      sortOrder: 0,
      categoryId: category.slug,
      designerId: designer.slug,
      images: [{ url: "/test-fk-img.jpg", alt: null, isPrimary: true }],
    };
    const project: ProjectWriteInput = {
      slug: `test-fk-proj-${suffix}`,
      i18nKey: `projects.fk-${suffix}`,
      name: { en: "FK Project", fa: "پروژه تست" },
      location: "Test Location",
      year: "2026",
      image: "/test-fk-proj.jpg",
      description: { en: "Desc", fa: "توضیح" },
      paragraph: { en: "Para", fa: "پاراگراف" },
      moreDescription: [],
      credits: [],
      portfolioImages: [],
      sortOrder: 0,
      productIds: [product.slug],
    };

    const rollback = new Error("intentional test rollback");

    await expect(
      prisma.$transaction(
        async (tx) => {
          const catId = await createProductCategory(category, tx);
          const desId = await createDesigner(designer, tx);
          const prodId = await createProduct(product, tx);
          const projId = await createProject(project, tx);
          expect(catId).toBe(category.slug);
          expect(desId).toBe(designer.slug);
          expect(prodId).toBe(product.slug);
          expect(projId).toBe(project.slug);

          const image = await tx.productImage.findFirstOrThrow({
            where: { productId: prodId },
          });

          // Rename every entity: `id` stays put, only `slug` moves — the
          // shape that would break a slug-based FK.
          await updateProductCategory(
            catId,
            { ...category, slug: `renamed-cat-${suffix}` },
            tx,
          );
          await updateDesigner(
            desId,
            { ...designer, slug: `renamed-des-${suffix}` },
            tx,
          );
          await updateProduct(
            prodId,
            {
              ...product,
              slug: `renamed-prod-${suffix}`,
              // Carry the image id so the sync updates instead of recreating.
              images: [
                {
                  id: image.id,
                  url: image.url,
                  alt: image.alt,
                  isPrimary: image.isPrimary,
                },
              ],
            },
            tx,
          );
          await updateProject(
            projId,
            { ...project, slug: `renamed-proj-${suffix}` },
            tx,
          );

          // The FK columns did not move …
          const row = await tx.product.findUnique({
            where: { id: prodId },
            include: { category: true, designer: true },
          });
          expect(row, "product survives its own rename by id").not.toBeNull();
          expect(row!.categoryId, "category FK").toBe(catId);
          expect(row!.designerId, "designer FK").toBe(desId);

          // … and both relations resolve through id to the RENAMED parents.
          expect(row!.category.id).toBe(catId);
          expect(row!.category.slug).toBe(`renamed-cat-${suffix}`);
          expect(row!.designer!.id).toBe(desId);
          expect(row!.designer!.slug).toBe(`renamed-des-${suffix}`);

          // The product's image child survived the product's own rename
          // (its FK is productId, not productSlug).
          const images = await tx.productImage.findMany({
            where: { productId: prodId },
          });
          expect(images).toHaveLength(1);
          expect(images[0].id).toBe(image.id);

          // The project's join row survived BOTH renames.
          const links = await tx.projectProduct.findMany({
            where: { projectId: projId },
          });
          expect(links).toHaveLength(1);
          expect(links[0].productId).toBe(prodId);

          // Parent side: the renamed category still lists its product.
          const parent = await tx.productCategory.findUnique({
            where: { id: catId },
            include: { products: { select: { id: true } } },
          });
          expect(parent!.slug).toBe(`renamed-cat-${suffix}`);
          expect(parent!.products.map((p) => p.id)).toEqual([prodId]);

          throw rollback;
        },
        { maxWait: 20_000, timeout: 20_000 },
      ),
    ).rejects.toBe(rollback);

    // Nothing survived the rollback.
    expect(await prisma.product.findUnique({ where: { id: product.slug } })).toBeNull();
    expect(
      await prisma.productCategory.findUnique({ where: { id: category.slug } }),
    ).toBeNull();
    expect(await prisma.designer.findUnique({ where: { id: designer.slug } })).toBeNull();
    expect(await prisma.project.findUnique({ where: { id: project.slug } })).toBeNull();
  });
});

