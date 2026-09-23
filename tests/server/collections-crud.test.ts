/**
 * Pass 10.5 — repository tier: write operations for collections.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  createCollection,
  deleteCollection,
  updateCollection,
  type CollectionWriteInput,
} from "@/lib/repositories/collections";
import { hasDatabaseUrl } from "@/tests/helpers/db";

const describeDb = describe.skipIf(!hasDatabaseUrl);

const makeCollectionInput = (overrides: Partial<CollectionWriteInput> = {}): CollectionWriteInput => ({
  slug: `test-collection-${randomUUID()}`,
  name: { en: "Test Collection", fa: "مجموعه تست" },
  year: "2026",
  image: "/test-collection.jpg",
  description: {
    p1: { en: "Paragraph 1", fa: "پاراگراف 1" },
    p2: { en: "Paragraph 2", fa: "پاراگراف 2" },
    p3: { en: "Paragraph 3", fa: "پاراگراف 3" },
  },
  sortOrder: 0,
  ...overrides,
});

describeDb("collections repository — write", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("create returns a row matching input", async () => {
    const input = makeCollectionInput();
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        createdId = await createCollection(input, tx);
        const row = await tx.collection.findUnique({ where: { id: createdId! } });
        expect(row).not.toBeNull();
        expect(row!.slug).toBe(input.slug);
        expect(row!.name).toEqual(input.name);
        expect(row!.year).toBe(input.year);
        expect(row!.image).toBe(input.image);
        expect(row!.description).toEqual(input.description);
        expect(row!.sortOrder).toBe(input.sortOrder);
        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.collection.findUnique({ where: { id: createdId! } })).toBeNull();
  });

  it("update only changes the given fields", async () => {
    const input = makeCollectionInput();
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        createdId = await createCollection(input, tx);

        const updatedInput = makeCollectionInput({
          slug: `updated-${randomUUID()}`,
          name: { en: "Updated Collection", fa: "مجموعه بروزرسانی" },
          year: "2027",
          sortOrder: 5,
        });
        await updateCollection(createdId!, updatedInput, tx);

        const row = await tx.collection.findUnique({ where: { id: createdId! } });
        expect(row!.slug).toBe(updatedInput.slug);
        expect(row!.name).toEqual(updatedInput.name);
        expect(row!.year).toBe(updatedInput.year);
        expect(row!.sortOrder).toBe(updatedInput.sortOrder);
        // Fields not in update should remain
        expect(row!.image).toBe(input.image);
        expect(row!.description).toEqual(input.description);

        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.collection.findUnique({ where: { id: createdId! } })).toBeNull();
  });

  it("delete actually removes the row", async () => {
    const input = makeCollectionInput();
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        createdId = await createCollection(input, tx);
        await deleteCollection(createdId!, tx);
        const row = await tx.collection.findUnique({ where: { id: createdId! } });
        expect(row).toBeNull();
        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.collection.findUnique({ where: { id: createdId! } })).toBeNull();
  });
});