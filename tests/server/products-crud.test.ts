/**
 * Pass 10.5 — repository tier: write operations for products.
 *
 * Tests create/update/delete against the real dev database inside rolled-back
 * transactions so the seed is never mutated.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  createProduct,
  deleteProduct,
  updateProduct,
  type ProductWriteInput,
} from "@/lib/repositories/products";
import { hasDatabaseUrl } from "@/tests/helpers/db";

const describeDb = describe.skipIf(!hasDatabaseUrl);

const makeProductInput = (overrides: Partial<ProductWriteInput> = {}): ProductWriteInput => ({
  slug: `test-product-${randomUUID()}`,
  name: { en: "Test Product", fa: "محصول تست" },
  hoverImage: "/test-hover.jpg",
  heroImage: "/test-hero.jpg",
  price: 99.99,
  existsInStore: true,
  quantity: 10,
  description: { en: "Description", fa: "توضیحات" },
  moreInfo: null,
  downloads: [],
  related: [],
  sortOrder: 0,
  categoryId: "lighting",
  designerId: null,
  images: [],
  ...overrides,
});

describeDb("products repository — write", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("create returns a row matching input", async () => {
    const input = makeProductInput();
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        createdId = await createProduct(input, tx);
        const row = await tx.product.findUnique({ where: { id: createdId! } });
        expect(row).not.toBeNull();
        expect(row!.slug).toBe(input.slug);
        expect(row!.name).toEqual(input.name);
        expect(row!.hoverImage).toBe(input.hoverImage);
        expect(row!.heroImage).toBe(input.heroImage);
        // Postgres Decimal — the raw row carries a Decimal, the mapped Product
        // carries a number (mapProductRow calls .toNumber()).
        expect(row!.price.toNumber()).toBe(input.price);
        expect(row!.existsInStore).toBe(input.existsInStore);
        expect(row!.quantity).toBe(input.quantity);
        expect(row!.description).toEqual(input.description);
        expect(row!.moreInfo).toBeNull();
        expect(row!.downloads).toEqual(input.downloads);
        expect(row!.related).toEqual(input.related);
        expect(row!.sortOrder).toBe(input.sortOrder);
        expect(row!.categoryId).toBe(input.categoryId);
        expect(row!.designerId).toBe(input.designerId);
        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.product.findUnique({ where: { id: createdId! } })).toBeNull();
  });

  it("create with images syncs product_images", async () => {
    const input = makeProductInput({
      images: [
        { url: "/img1.jpg", alt: "Image 1", isPrimary: true },
        { url: "/img2.jpg", alt: "Image 2", isPrimary: false },
      ],
    });
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        createdId = await createProduct(input, tx);
        const images = await tx.productImage.findMany({
          where: { productId: createdId! },
          orderBy: { sortOrder: "asc" },
        });
        expect(images).toHaveLength(2);
        expect(images[0].url).toBe("/img1.jpg");
        expect(images[0].isPrimary).toBe(true);
        expect(images[0].sortOrder).toBe(0);
        expect(images[1].url).toBe("/img2.jpg");
        expect(images[1].isPrimary).toBe(false);
        expect(images[1].sortOrder).toBe(1);
        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.product.findUnique({ where: { id: createdId! } })).toBeNull();
  });

  it("create with existsInStore/quantity round-trips correctly", async () => {
    const input = makeProductInput({ existsInStore: true, quantity: 42 });
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        createdId = await createProduct(input, tx);
        const row = await tx.product.findUnique({ where: { id: createdId! } });
        expect(row!.existsInStore).toBe(true);
        expect(row!.quantity).toBe(42);
        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.product.findUnique({ where: { id: createdId! } })).toBeNull();
  });

  it("update round-trips existsInStore/quantity changes", async () => {
    const input = makeProductInput({ existsInStore: true, quantity: 42 });
    const updated = { ...input, existsInStore: false, quantity: 0 };
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        createdId = await createProduct(input, tx);

        await updateProduct(createdId!, updated, tx);

        const row = await tx.product.findUnique({ where: { id: createdId! } });
        expect(row!.existsInStore).toBe(false);
        expect(row!.quantity).toBe(0);

        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.product.findUnique({ where: { id: createdId! } })).toBeNull();
  });

  it("update only changes the given fields", async () => {
    const input = makeProductInput();
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        createdId = await createProduct(input, tx);

        const updatedInput = makeProductInput({
          slug: `updated-${randomUUID()}`,
          name: { en: "Updated Product", fa: "محصول بروزرسانی" },
          price: 199.99,
          quantity: 5,
        });
        await updateProduct(createdId!, updatedInput, tx);

        const row = await tx.product.findUnique({ where: { id: createdId! } });
        expect(row!.slug).toBe(updatedInput.slug);
        expect(row!.name).toEqual(updatedInput.name);
        expect(row!.price.toNumber()).toBe(updatedInput.price);
        expect(row!.quantity).toBe(updatedInput.quantity);
        // Fields not in the update should remain from original create
        expect(row!.hoverImage).toBe(input.hoverImage);
        expect(row!.heroImage).toBe(input.heroImage);
        expect(row!.existsInStore).toBe(input.existsInStore);
        expect(row!.categoryId).toBe(input.categoryId);

        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.product.findUnique({ where: { id: createdId! } })).toBeNull();
  });

  it("update syncs images: updates existing, creates new, deletes removed", async () => {
    const input = makeProductInput({
      images: [
        { url: "/old1.jpg", alt: "Old 1", isPrimary: true },
        { url: "/old2.jpg", alt: "Old 2", isPrimary: false },
      ],
    });
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        createdId = await createProduct(input, tx);

        // Get the created image IDs
        const createdImages = await tx.productImage.findMany({
          where: { productId: createdId! },
        });
        const [img1, img2] = createdImages;

        // Update: keep img1 (modified), delete img2, add new img3
        const updatedInput = makeProductInput({
          images: [
            { id: img1.id, url: "/new1.jpg", alt: "New 1", isPrimary: false },
            { url: "/new2.jpg", alt: "New 2", isPrimary: true },
          ],
        });
        await updateProduct(createdId!, updatedInput, tx);

        const images = await tx.productImage.findMany({
          where: { productId: createdId! },
          orderBy: { sortOrder: "asc" },
        });
        expect(images).toHaveLength(2);
        expect(images[0].id).toBe(img1.id);
        expect(images[0].url).toBe("/new1.jpg");
        expect(images[0].isPrimary).toBe(false);
        expect(images[1].url).toBe("/new2.jpg");
        expect(images[1].isPrimary).toBe(true);

        // img2 should be deleted
        const deleted = await tx.productImage.findUnique({ where: { id: img2.id } });
        expect(deleted).toBeNull();

        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.product.findUnique({ where: { id: createdId! } })).toBeNull();
  });

  it("delete actually removes the row", async () => {
    const input = makeProductInput();
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        createdId = await createProduct(input, tx);
        await deleteProduct(createdId!, tx);
        const row = await tx.product.findUnique({ where: { id: createdId! } });
        expect(row).toBeNull();
        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.product.findUnique({ where: { id: createdId! } })).toBeNull();
  });

  it("delete cascades to product_images", async () => {
    const input = makeProductInput({
      images: [{ url: "/img.jpg", alt: "Image", isPrimary: true }],
    });
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        createdId = await createProduct(input, tx);
        const images = await tx.productImage.findMany({
          where: { productId: createdId! },
        });
        expect(images).toHaveLength(1);

        await deleteProduct(createdId!, tx);

        const remainingImages = await tx.productImage.findMany({
          where: { productId: createdId! },
        });
        expect(remainingImages).toHaveLength(0);

        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.product.findUnique({ where: { id: createdId! } })).toBeNull();
  });
});