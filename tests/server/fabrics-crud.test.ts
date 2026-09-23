/**
 * Pass 10.5 — repository tier: write operations for fabrics.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  createFabricItem,
  deleteFabricItem,
  updateFabricItem,
  type FabricItemWriteInput,
} from "@/lib/repositories/fabrics";
import { hasDatabaseUrl } from "@/tests/helpers/db";

const describeDb = describe.skipIf(!hasDatabaseUrl);

const makeFabricInput = (overrides: Partial<FabricItemWriteInput> = {}): FabricItemWriteInput => ({
  id: `test-fabric-${randomUUID()}`,
  name: "Test Fabric",
  code: "01",
  category: "Fabrics",
  swatchColor: "#726A50",
  sortOrder: 0,
  ...overrides,
});

describeDb("fabrics repository — write", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("create returns a row matching input", async () => {
    const input = makeFabricInput();
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        createdId = await createFabricItem(input, tx);
        const row = await tx.fabricItem.findUnique({ where: { id: createdId! } });
        expect(row).not.toBeNull();
        expect(row!.id).toBe(input.id);
        expect(row!.name).toBe(input.name);
        expect(row!.code).toBe(input.code);
        expect(row!.category).toBe(input.category);
        expect(row!.swatchColor).toBe(input.swatchColor);
        expect(row!.sortOrder).toBe(input.sortOrder);
        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.fabricItem.findUnique({ where: { id: createdId! } })).toBeNull();
  });

  it("update only changes the given fields", async () => {
    const input = makeFabricInput();
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        createdId = await createFabricItem(input, tx);

        const updatedInput = makeFabricInput({
          id: `updated-${randomUUID()}`,
          name: "Updated Fabric",
          code: "02",
          swatchColor: "#FF0000",
          sortOrder: 5,
        });
        await updateFabricItem(createdId!, updatedInput, tx);

        const row = await tx.fabricItem.findUnique({ where: { id: createdId! } });
        expect(row!.name).toBe(updatedInput.name);
        expect(row!.code).toBe(updatedInput.code);
        expect(row!.swatchColor).toBe(updatedInput.swatchColor);
        expect(row!.sortOrder).toBe(updatedInput.sortOrder);
        // Fields not in update should remain (id is not updated in updateFabricItem)
        expect(row!.id).toBe(input.id);
        expect(row!.category).toBe(input.category);

        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.fabricItem.findUnique({ where: { id: createdId! } })).toBeNull();
  });

  it("delete actually removes the row", async () => {
    const input = makeFabricInput();
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        createdId = await createFabricItem(input, tx);
        await deleteFabricItem(createdId!, tx);
        const row = await tx.fabricItem.findUnique({ where: { id: createdId! } });
        expect(row).toBeNull();
        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.fabricItem.findUnique({ where: { id: createdId! } })).toBeNull();
  });
});