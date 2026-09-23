/**
 * Pass 10.5 — repository tier: write operations for flagships.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  createFlagship,
  deleteFlagship,
  updateFlagship,
  type FlagshipWriteInput,
} from "@/lib/repositories/flagships";
import { hasDatabaseUrl } from "@/tests/helpers/db";

const describeDb = describe.skipIf(!hasDatabaseUrl);

const makeFlagshipInput = (overrides: Partial<FlagshipWriteInput> = {}): FlagshipWriteInput => ({
  slug: `test-flagship-${randomUUID()}`,
  name: { en: "Test Flagship", fa: "شوروم تست" },
  city: { en: "Test City", fa: "شهر تست" },
  image: "/test-flagship.jpg",
  detail: null,
  sortOrder: 0,
  ...overrides,
});

const makeDetail = () => ({
  heroImage: "/hero.jpg",
  heading: { en: "Heading", fa: "سرآیند" },
  description: { en: "Description", fa: "توضیحات" },
  info: {
    name: { en: "Name", fa: "نام" },
    addressLines: [{ en: "Address 1", fa: "آدرس 1" }],
    hours: [{ label: { en: "Mon-Fri", fa: "دوش-جمعه" }, value: "9-18" }],
    appointmentNote: { en: "By appointment", fa: "با وقت" },
    phone: "+1 234 567890",
    email: "test@example.com",
  },
  video: { thumbnail: "/thumb.jpg", url: "https://example.com/video.mp4" },
  gallery: ["/gallery1.jpg", "/gallery2.jpg"],
});

describeDb("flagships repository — write", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("create returns a row matching input", async () => {
    const input = makeFlagshipInput({ detail: makeDetail() });
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        createdId = await createFlagship(input, tx);
        const row = await tx.flagship.findUnique({ where: { id: createdId! } });
        expect(row).not.toBeNull();
        expect(row!.slug).toBe(input.slug);
        expect(row!.name).toEqual(input.name);
        expect(row!.city).toEqual(input.city);
        expect(row!.image).toBe(input.image);
        expect(row!.detail).not.toBeNull();
        expect(row!.sortOrder).toBe(input.sortOrder);
        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.flagship.findUnique({ where: { id: createdId! } })).toBeNull();
  });

  it("create with null detail stores SQL NULL", async () => {
    const input = makeFlagshipInput({ detail: null });
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        createdId = await createFlagship(input, tx);
        const row = await tx.flagship.findUnique({ where: { id: createdId! } });
        expect(row).not.toBeNull();
        expect(row!.detail).toBeNull();
        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.flagship.findUnique({ where: { id: createdId! } })).toBeNull();
  });

  it("update only changes the given fields", async () => {
    const input = makeFlagshipInput({ detail: makeDetail() });
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        createdId = await createFlagship(input, tx);

        const updatedInput = makeFlagshipInput({
          slug: `updated-${randomUUID()}`,
          name: { en: "Updated Flagship", fa: "شوروم بروزرسانی" },
          detail: null,
          sortOrder: 5,
        });
        await updateFlagship(createdId!, updatedInput, tx);

        const row = await tx.flagship.findUnique({ where: { id: createdId! } });
        expect(row!.slug).toBe(updatedInput.slug);
        expect(row!.name).toEqual(updatedInput.name);
        expect(row!.detail).toBeNull();
        expect(row!.sortOrder).toBe(updatedInput.sortOrder);
        // Fields not in update should remain
        expect(row!.city).toEqual(input.city);
        expect(row!.image).toBe(input.image);

        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.flagship.findUnique({ where: { id: createdId! } })).toBeNull();
  });

  it("delete actually removes the row", async () => {
    const input = makeFlagshipInput();
    let createdId: string;

    await expect(
      prisma.$transaction(async (tx) => {
        createdId = await createFlagship(input, tx);
        await deleteFlagship(createdId!, tx);
        const row = await tx.flagship.findUnique({ where: { id: createdId! } });
        expect(row).toBeNull();
        throw new Error("intentional test rollback");
      },
      { maxWait: 20_000, timeout: 20_000 }),
    ).rejects.toThrow("intentional test rollback");

    expect(await prisma.flagship.findUnique({ where: { id: createdId! } })).toBeNull();
  });
});