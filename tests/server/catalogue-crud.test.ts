/**
 * Pass 10.5 — repository tier: write operations for catalogue.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  createCatalogueItem,
  deleteCatalogueItem,
  updateCatalogueItem,
  type CatalogueItemWriteInput,
} from "@/lib/repositories/catalogue";
import { hasDatabaseUrl } from "@/tests/helpers/db";

const describeDb = describe.skipIf(!hasDatabaseUrl);

const makeCatalogueInput = (overrides: Partial<CatalogueItemWriteInput> = {}): CatalogueItemWriteInput => ({
  id: `test-catalogue-${randomUUID()}`,
  title: "Test Catalogue",
  href: "https://example.com/catalogue.pdf",
  coverColor: "#3a3530",
  coverTextColor: "#232323",
  sortOrder: 0,
  ...overrides,
});

describeDb("catalogue repository — write", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("create returns a row matching input", async () => {
    const input = makeCatalogueInput();
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        createdId = await createCatalogueItem(input, tx);
        const row = await tx.catalogueItem.findUnique({ where: { id: createdId! } });
        expect(row).not.toBeNull();
        expect(row!.id).toBe(input.id);
        expect(row!.title).toBe(input.title);
        expect(row!.href).toBe(input.href);
        expect(row!.coverColor).toBe(input.coverColor);
        expect(row!.coverTextColor).toBe(input.coverTextColor);
        expect(row!.sortOrder).toBe(input.sortOrder);
        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.catalogueItem.findUnique({ where: { id: createdId! } })).toBeNull();
  });

  it("create with null coverTextColor stores SQL NULL", async () => {
    const input = makeCatalogueInput({ coverTextColor: null });
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        createdId = await createCatalogueItem(input, tx);
        const row = await tx.catalogueItem.findUnique({ where: { id: createdId! } });
        expect(row).not.toBeNull();
        expect(row!.coverTextColor).toBeNull();
        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.catalogueItem.findUnique({ where: { id: createdId! } })).toBeNull();
  });

  it("create accepts # href", async () => {
    const input = makeCatalogueInput({ href: "#" });
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        createdId = await createCatalogueItem(input, tx);
        const row = await tx.catalogueItem.findUnique({ where: { id: createdId! } });
        expect(row).not.toBeNull();
        expect(row!.href).toBe("#");
        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.catalogueItem.findUnique({ where: { id: createdId! } })).toBeNull();
  });

  it("create accepts relative href", async () => {
    const input = makeCatalogueInput({ href: "/catalogue/test.pdf" });
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        createdId = await createCatalogueItem(input, tx);
        const row = await tx.catalogueItem.findUnique({ where: { id: createdId! } });
        expect(row).not.toBeNull();
        expect(row!.href).toBe("/catalogue/test.pdf");
        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.catalogueItem.findUnique({ where: { id: createdId! } })).toBeNull();
  });

  it("update only changes the given fields", async () => {
    const input = makeCatalogueInput();
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        createdId = await createCatalogueItem(input, tx);

        const updatedInput = makeCatalogueInput({
          id: `updated-${randomUUID()}`,
          title: "Updated Catalogue",
          coverColor: "#FF0000",
          coverTextColor: "#FFFFFF",
          sortOrder: 5,
        });
        await updateCatalogueItem(createdId!, updatedInput, tx);

        const row = await tx.catalogueItem.findUnique({ where: { id: createdId! } });
        expect(row!.title).toBe(updatedInput.title);
        expect(row!.coverColor).toBe(updatedInput.coverColor);
        expect(row!.coverTextColor).toBe(updatedInput.coverTextColor);
        expect(row!.sortOrder).toBe(updatedInput.sortOrder);
        // Fields not in update should remain (id is not updated)
        expect(row!.id).toBe(input.id);
        expect(row!.href).toBe(input.href);

        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.catalogueItem.findUnique({ where: { id: createdId! } })).toBeNull();
  });

  it("delete actually removes the row", async () => {
    const input = makeCatalogueInput();
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        createdId = await createCatalogueItem(input, tx);
        await deleteCatalogueItem(createdId!, tx);
        const row = await tx.catalogueItem.findUnique({ where: { id: createdId! } });
        expect(row).toBeNull();
        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.catalogueItem.findUnique({ where: { id: createdId! } })).toBeNull();
  });
});