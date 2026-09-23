/**
 * Pass 10.5 — repository tier: write operations for designers.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  createDesigner,
  deleteDesigner,
  updateDesigner,
  type DesignerWriteInput,
} from "@/lib/repositories/designers";
import { hasDatabaseUrl } from "@/tests/helpers/db";

const describeDb = describe.skipIf(!hasDatabaseUrl);

const makeDesignerInput = (overrides: Partial<DesignerWriteInput> = {}): DesignerWriteInput => ({
  slug: `test-designer-${randomUUID()}`,
  name: { en: "Test Designer", fa: "طراح تست" },
  image: "/test-designer.jpg",
  website: "https://example.com",
  bio: [{ en: "Bio paragraph 1", fa: "پاراگراف 1" }],
  sortOrder: 0,
  ...overrides,
});

describeDb("designers repository — write", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("create returns a row matching input", async () => {
    const input = makeDesignerInput();
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        createdId = await createDesigner(input, tx);
        const row = await tx.designer.findUnique({ where: { id: createdId! } });
        expect(row).not.toBeNull();
        expect(row!.slug).toBe(input.slug);
        expect(row!.name).toEqual(input.name);
        expect(row!.image).toBe(input.image);
        expect(row!.website).toBe(input.website);
        expect(row!.bio).toEqual(input.bio);
        expect(row!.sortOrder).toBe(input.sortOrder);
        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.designer.findUnique({ where: { id: createdId! } })).toBeNull();
  });

  it("create with null website stores SQL NULL", async () => {
    const input = makeDesignerInput({ website: null });
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        createdId = await createDesigner(input, tx);
        const row = await tx.designer.findUnique({ where: { id: createdId! } });
        expect(row).not.toBeNull();
        expect(row!.website).toBeNull();
        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.designer.findUnique({ where: { id: createdId! } })).toBeNull();
  });

  it("create with empty bio array works", async () => {
    const input = makeDesignerInput({ bio: [] });
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        createdId = await createDesigner(input, tx);
        const row = await tx.designer.findUnique({ where: { id: createdId! } });
        expect(row).not.toBeNull();
        expect(row!.bio).toEqual([]);
        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.designer.findUnique({ where: { id: createdId! } })).toBeNull();
  });

  it("update only changes the given fields", async () => {
    const input = makeDesignerInput();
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        createdId = await createDesigner(input, tx);

        const updatedInput = makeDesignerInput({
          slug: `updated-${randomUUID()}`,
          name: { en: "Updated Designer", fa: "طراح بروزرسانی" },
          bio: [{ en: "New bio", fa: "بایو جدید" }],
          sortOrder: 5,
        });
        await updateDesigner(createdId!, updatedInput, tx);

        const row = await tx.designer.findUnique({ where: { id: createdId! } });
        expect(row!.slug).toBe(updatedInput.slug);
        expect(row!.name).toEqual(updatedInput.name);
        expect(row!.bio).toEqual(updatedInput.bio);
        expect(row!.sortOrder).toBe(updatedInput.sortOrder);
        // Fields not in update should remain
        expect(row!.image).toBe(input.image);
        expect(row!.website).toBe(input.website);

        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.designer.findUnique({ where: { id: createdId! } })).toBeNull();
  });

  it("delete actually removes the row", async () => {
    const input = makeDesignerInput();
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        createdId = await createDesigner(input, tx);
        await deleteDesigner(createdId!, tx);
        const row = await tx.designer.findUnique({ where: { id: createdId! } });
        expect(row).toBeNull();
        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.designer.findUnique({ where: { id: createdId! } })).toBeNull();
  });
});