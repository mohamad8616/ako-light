/**
 * Pass 10.5 — repository tier: write operations for materials.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  createMaterial,
  deleteMaterial,
  updateMaterial,
  type MaterialWriteInput,
} from "@/lib/repositories/materials";
import { hasDatabaseUrl } from "@/tests/helpers/db";

const describeDb = describe.skipIf(!hasDatabaseUrl);

const makeMaterialInput = (overrides: Partial<MaterialWriteInput> = {}): MaterialWriteInput => ({
  slug: `test-material-${randomUUID()}`,
  name: { en: "Test Material", fa: "ماده تست" },
  category: "Stone",
  type: "stone",
  image: "/test-material.jpg",
  description: { en: "Description", fa: "توضیحات" },
  sortOrder: 0,
  ...overrides,
});

describeDb("materials repository — write", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("create returns a row matching input", async () => {
    const input = makeMaterialInput();
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        createdId = await createMaterial(input, tx);
        const row = await tx.material.findUnique({ where: { id: createdId! } });
        expect(row).not.toBeNull();
        expect(row!.slug).toBe(input.slug);
        expect(row!.name).toEqual(input.name);
        expect(row!.category).toBe(input.category);
        expect(row!.type).toBe("stone");
        expect(row!.image).toBe(input.image);
        expect(row!.description).toEqual(input.description);
        expect(row!.sortOrder).toBe(input.sortOrder);
        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.material.findUnique({ where: { id: createdId! } })).toBeNull();
  });

  it("create accepts all valid types including stone-composite", async () => {
    for (const type of ["stone", "metal", "glass", "wood", "fabric", "leather", "marble", "stone-composite"] as const) {
      const input = makeMaterialInput({ type });
      let createdId: string;

      await expect(
        prisma.$transaction(async (tx) => {
          createdId = await createMaterial(input, tx);
          const row = await tx.material.findUnique({ where: { id: createdId! } });
          expect(row).not.toBeNull();
          expect(row!.type).toBe(type === "stone-composite" ? "stone_composite" : type);
          throw new Error("intentional test rollback");
        },
      { maxWait: 20_000, timeout: 20_000 }),
      ).rejects.toThrow("intentional test rollback");

      expect(await prisma.material.findUnique({ where: { id: createdId! } })).toBeNull();
    }
  });

  it("update only changes the given fields", async () => {
    const input = makeMaterialInput();
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        createdId = await createMaterial(input, tx);

        const updatedInput = makeMaterialInput({
          slug: `updated-${randomUUID()}`,
          name: { en: "Updated Material", fa: "ماده بروزرسانی" },
          type: "metal",
          sortOrder: 5,
        });
        await updateMaterial(createdId!, updatedInput, tx);

        const row = await tx.material.findUnique({ where: { id: createdId! } });
        expect(row!.slug).toBe(updatedInput.slug);
        expect(row!.name).toEqual(updatedInput.name);
        expect(row!.type).toBe("metal");
        expect(row!.sortOrder).toBe(updatedInput.sortOrder);
        // Fields not in update should remain
        expect(row!.category).toBe(input.category);
        expect(row!.image).toBe(input.image);

        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.material.findUnique({ where: { id: createdId! } })).toBeNull();
  });

  it("delete actually removes the row", async () => {
    const input = makeMaterialInput();
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        createdId = await createMaterial(input, tx);
        await deleteMaterial(createdId!, tx);
        const row = await tx.material.findUnique({ where: { id: createdId! } });
        expect(row).toBeNull();
        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.material.findUnique({ where: { id: createdId! } })).toBeNull();
  });
});