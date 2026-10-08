/**
 * Admin storage cleanup (lib/admin/storage-cleanup.ts).
 *
 * Hermetic: the storage provider and the Prisma client are both mocked, so
 * nothing here reaches Liara or the database.
 *
 * This module REPLACED one that deleted through `del()` from `@vercel/blob` and
 * only matched `*.blob.vercel-storage.com` — which meant that once the app moved
 * to Liara it deleted NOTHING and orphaned objects piled up silently. The cases
 * below pin the behaviour that failure exposed: ownership is decided by the
 * CONFIGURED endpoint + bucket, and BOTH URL shapes Liara serves are understood.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.hoisted: the vi.mock factories below are hoisted above these declarations,
// so a plain `const` would still be in its temporal dead zone when they run.
const { deleteMock, findManyMock } = vi.hoisted(() => ({
  // Typed parameters without an unused binding, so `mock.calls[0][0]` is
  // still the key array the assertions read.
  deleteMock: vi.fn<(keys: readonly string[]) => Promise<void>>(async () => {}),
  findManyMock: vi.fn(async () => [] as { storageKey: string }[]),
}));

vi.mock("@/lib/media/storage", () => ({
  storageProvider: { delete: deleteMock },
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: { media: { findMany: findManyMock } },
}));

import {
  deleteStorageUrls,
  removedUrls,
  storageKeyFromUrl,
} from "@/lib/admin/storage-cleanup";

const ENDPOINT = "https://storage.iran.liara.site";
const BUCKET = "homeform-media";

/** The bucket-subdomain shape, which is what the app now writes. */
const SUBDOMAIN = `https://${BUCKET}.storage.iran.liara.site`;
/** The path-style shape, which Liara also serves. */
const PATH_STYLE = `${ENDPOINT}/${BUCKET}`;

beforeEach(() => {
  vi.clearAllMocks();
  findManyMock.mockResolvedValue([]);
  process.env.LIARA_ENDPOINT = ENDPOINT;
  process.env.LIARA_BUCKET_NAME = BUCKET;
  process.env.LIARA_ACCESS_KEY = "access-key";
  process.env.LIARA_SECRET_KEY = "secret-key";
});

describe("storageKeyFromUrl", () => {
  it("reads the key out of a bucket-subdomain URL", () => {
    expect(storageKeyFromUrl(`${SUBDOMAIN}/media/library/1-hero.png`)).toBe(
      "media/library/1-hero.png",
    );
  });

  it("reads the key out of a path-style URL", () => {
    expect(storageKeyFromUrl(`${PATH_STYLE}/media/library/1-hero.png`)).toBe(
      "media/library/1-hero.png",
    );
  });

  it("decodes percent-escapes back into the stored key", () => {
    expect(storageKeyFromUrl(`${SUBDOMAIN}/media/library/my%20file.png`)).toBe(
      "media/library/my file.png",
    );
  });

  it("ignores a foreign host — including the old Vercel Blob host", () => {
    // The regression this module exists for: a Vercel URL is NOT ours any more.
    expect(
      storageKeyFromUrl(
        "https://store.public.blob.vercel-storage.com/media/a.png",
      ),
    ).toBeNull();
    expect(storageKeyFromUrl("https://example.com/media/a.png")).toBeNull();
  });

  it("ignores a path-style URL naming a DIFFERENT bucket", () => {
    expect(storageKeyFromUrl(`${ENDPOINT}/other-bucket/media/a.png`)).toBeNull();
  });

  it("refuses a key outside the media/ namespace", () => {
    // Guards against an admin form edit deleting non-app content that happens
    // to live in the same bucket.
    expect(storageKeyFromUrl(`${SUBDOMAIN}/admin/products/a.png`)).toBeNull();
  });

  it("returns null for anything unparseable", () => {
    expect(storageKeyFromUrl(null)).toBeNull();
    expect(storageKeyFromUrl(undefined)).toBeNull();
    expect(storageKeyFromUrl("")).toBeNull();
    expect(storageKeyFromUrl("#")).toBeNull();
    expect(storageKeyFromUrl("/media/a.png")).toBeNull();
  });

  it("returns null when the provider is not configured", () => {
    delete process.env.LIARA_ENDPOINT;
    expect(storageKeyFromUrl(`${SUBDOMAIN}/media/a.png`)).toBeNull();
  });
});

describe("removedUrls", () => {
  it("reports only the entries dropped, ignoring order", () => {
    expect(
      removedUrls(["a", "b", "c"], ["c", "a"]),
    ).toEqual(["b"]);
  });

  it("treats an empty/blank entry as absent, not as a removal", () => {
    expect(removedUrls(["", null, "a"], ["a"])).toEqual([]);
  });
});

describe("deleteStorageUrls", () => {
  it("deletes the parsed keys through the provider", async () => {
    await deleteStorageUrls([
      `${SUBDOMAIN}/media/library/a.png`,
      `${PATH_STYLE}/media/library/b.png`,
      `${SUBDOMAIN}/media/library/a.png`,
    ]);

    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(deleteMock.mock.calls[0][0]).toEqual([
      "media/library/a.png",
      "media/library/b.png",
    ]);
  });

  it("never touches the provider when nothing is ours", async () => {
    await deleteStorageUrls([
      "https://store.public.blob.vercel-storage.com/media/a.png",
      "https://example.com/b.png",
    ]);

    expect(deleteMock).not.toHaveBeenCalled();
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("does not delete a key a Media row still owns", async () => {
    findManyMock.mockResolvedValue([{ storageKey: "media/library/a.png" }]);

    await deleteStorageUrls([
      `${SUBDOMAIN}/media/library/a.png`,
      `${SUBDOMAIN}/media/library/b.png`,
    ]);

    expect(deleteMock.mock.calls[0][0]).toEqual(["media/library/b.png"]);
  });

  it("fails CLOSED when the ownership check throws", async () => {
    findManyMock.mockRejectedValue(new Error("db down"));

    await deleteStorageUrls([`${SUBDOMAIN}/media/library/a.png`]);

    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("swallows a provider failure — cleanup is best-effort", async () => {
    deleteMock.mockRejectedValueOnce(new Error("storage down"));

    await expect(
      deleteStorageUrls([`${SUBDOMAIN}/media/library/a.png`]),
    ).resolves.toBeUndefined();
  });
});
