/**
 * Pass 10.5 — repository tier: write operations for projects.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  createProject,
  deleteProject,
  updateProject,
  type ProjectWriteInput,
} from "@/lib/repositories/projects";
import { hasDatabaseUrl } from "@/tests/helpers/db";

const describeDb = describe.skipIf(!hasDatabaseUrl);

const makeProjectInput = (overrides: Partial<ProjectWriteInput> = {}): ProjectWriteInput => ({
  slug: `test-project-${randomUUID()}`,
  i18nKey: `projects.test-${randomUUID()}`,
  name: { en: "Test Project", fa: "پروژه تست" },
  location: "Test Location",
  year: "2026",
  image: "/test-project.jpg",
  description: { en: "Description", fa: "توضیحات" },
  paragraph: { en: "Paragraph", fa: "پاراگراف" },
  moreDescription: [{ en: "More 1", fa: "بیشتر 1" }],
  credits: [{ en: "Credit 1", fa: "اعتبار 1" }],
  portfolioImages: ["/portfolio1.jpg"],
  sortOrder: 0,
  productIds: [],
  ...overrides,
});

describeDb("projects repository — write", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("create returns a row matching input", async () => {
    const input = makeProjectInput();
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        createdId = await createProject(input, tx);
        const row = await tx.project.findUnique({ where: { id: createdId! } });
        expect(row).not.toBeNull();
        expect(row!.slug).toBe(input.slug);
        expect(row!.i18nKey).toBe(input.i18nKey);
        expect(row!.name).toEqual(input.name);
        expect(row!.location).toBe(input.location);
        expect(row!.year).toBe(input.year);
        expect(row!.image).toBe(input.image);
        expect(row!.description).toEqual(input.description);
        expect(row!.paragraph).toEqual(input.paragraph);
        expect(row!.moreDescription).toEqual(input.moreDescription);
        expect(row!.credits).toEqual(input.credits);
        expect(row!.portfolioImages).toEqual(input.portfolioImages);
        expect(row!.sortOrder).toBe(input.sortOrder);
        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.project.findUnique({ where: { id: createdId! } })).toBeNull();
  });

  it("create with productIds syncs project_product join table", async () => {
    const productId = `test-product-for-project-${randomUUID()}`;
    const input = makeProjectInput({ productIds: [productId] });
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        // The fixture product joins the transaction, so the rollback removes
        // it too — nothing is ever committed outside the test.
        await tx.product.create({
          data: {
            id: productId,
            slug: productId,
            name: { en: "Test Product", fa: "محصول تست" },
            hoverImage: "/test.jpg",
            price: 100,
            heroImage: "/test.jpg",
            description: { en: "Desc", fa: "توضیح" },
            downloads: [],
            related: [],
            categoryId: "lighting",
          },
        });

        createdId = await createProject(input, tx);
        const links = await tx.projectProduct.findMany({
          where: { projectId: createdId! },
          orderBy: { order: "asc" },
        });
        expect(links).toHaveLength(1);
        expect(links[0].productId).toBe(productId);
        expect(links[0].order).toBe(0);
        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.project.findUnique({ where: { id: createdId! } })).toBeNull();
    expect(await prisma.product.findUnique({ where: { id: productId } })).toBeNull();
  });

  it("update only changes the given fields", async () => {
    const input = makeProjectInput();
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        createdId = await createProject(input, tx);

        const updatedInput = makeProjectInput({
          slug: `updated-${randomUUID()}`,
          name: { en: "Updated Project", fa: "پروژه بروزرسانی" },
          year: "2027",
          sortOrder: 5,
          // Not part of this edit: carry the original key through, because
          // updateProject writes every field of its WriteInput (the factory
          // would otherwise mint a fresh uuid i18nKey here).
          i18nKey: input.i18nKey,
        });
        await updateProject(createdId!, updatedInput, tx);

        const row = await tx.project.findUnique({ where: { id: createdId! } });
        expect(row!.slug).toBe(updatedInput.slug);
        expect(row!.name).toEqual(updatedInput.name);
        expect(row!.year).toBe(updatedInput.year);
        expect(row!.sortOrder).toBe(updatedInput.sortOrder);
        // Fields not in update should remain
        expect(row!.i18nKey).toBe(input.i18nKey);
        expect(row!.location).toBe(input.location);
        expect(row!.image).toBe(input.image);

        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.project.findUnique({ where: { id: createdId! } })).toBeNull();
  });

  it("update with productIds replaces the join table", async () => {
    const productId1 = `test-product-1-${randomUUID()}`;
    const productId2 = `test-product-2-${randomUUID()}`;
    const input = makeProjectInput({ productIds: [productId1] });
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        // Fixtures join the transaction, so the rollback cleans them up too.
        for (const pid of [productId1, productId2]) {
          await tx.product.create({
            data: {
              id: pid,
              slug: pid,
              name: { en: "Test Product", fa: "محصول تست" },
              hoverImage: "/test.jpg",
              price: 100,
              heroImage: "/test.jpg",
              description: { en: "Desc", fa: "توضیح" },
              downloads: [],
              related: [],
              categoryId: "lighting",
            },
          });
        }

        createdId = await createProject(input, tx);

        // Update with different product list
        const updatedInput = makeProjectInput({ productIds: [productId2] });
        await updateProject(createdId!, updatedInput, tx);

        const links = await tx.projectProduct.findMany({
          where: { projectId: createdId! },
          orderBy: { order: "asc" },
        });
        expect(links).toHaveLength(1);
        expect(links[0].productId).toBe(productId2);

        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.project.findUnique({ where: { id: createdId! } })).toBeNull();
    expect(await prisma.product.findUnique({ where: { id: productId1 } })).toBeNull();
    expect(await prisma.product.findUnique({ where: { id: productId2 } })).toBeNull();
  });

  it("delete actually removes the row", async () => {
    const input = makeProjectInput();
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        createdId = await createProject(input, tx);
        await deleteProject(createdId!, tx);
        const row = await tx.project.findUnique({ where: { id: createdId! } });
        expect(row).toBeNull();
        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.project.findUnique({ where: { id: createdId! } })).toBeNull();
  });

  it("delete cascades to project_product", async () => {
    const productId = `test-product-cascade-${randomUUID()}`;
    const input = makeProjectInput({ productIds: [productId] });
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        // The fixture product joins the transaction, so the rollback removes
        // it too — nothing is ever committed outside the test.
        await tx.product.create({
          data: {
            id: productId,
            slug: productId,
            name: { en: "Test Product", fa: "محصول تست" },
            hoverImage: "/test.jpg",
            price: 100,
            heroImage: "/test.jpg",
            description: { en: "Desc", fa: "توضیح" },
            downloads: [],
            related: [],
            categoryId: "lighting",
          },
        });

        createdId = await createProject(input, tx);
        const links = await tx.projectProduct.findMany({
          where: { projectId: createdId! },
        });
        expect(links).toHaveLength(1);

        await deleteProject(createdId!, tx);

        const remainingLinks = await tx.projectProduct.findMany({
          where: { projectId: createdId! },
        });
        expect(remainingLinks).toHaveLength(0);

        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.project.findUnique({ where: { id: createdId! } })).toBeNull();
    expect(await prisma.product.findUnique({ where: { id: productId } })).toBeNull();
  });
});