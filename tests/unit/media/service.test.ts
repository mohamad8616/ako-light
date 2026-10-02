/**
 * Pass 13.5 Step 9 — media service (lib/media/service.ts).
 *
 * This is where the two-system consistency problem lives, so these tests are
 * the important ones. An upload spans Blob + Postgres and the two cannot be
 * committed together; the orderings and compensations in the service are what
 * keep a failure from leaving the system inconsistent. Each is pinned here:
 *
 *   upload  → Blob first, then DB. A DB failure deletes the object just stored.
 *   delete  → reference check first, then DB, then Blob (best-effort). A Blob
 *             failure is swallowed; a REFERENCED asset is refused outright.
 *
 * Hermetic: the storage provider, the repository and the reference check are
 * mocked, so the suite NEVER depends on the live Vercel Blob service or the
 * database.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const provider = vi.hoisted(() => ({
  name: "fake",
  upload: vi.fn(),
  delete: vi.fn(),
  getUrl: vi.fn(() => null),
}));

const repo = vi.hoisted(() => ({
  createMedia: vi.fn(),
  deleteMedia: vi.fn(),
  updateMediaMetadata: vi.fn(),
  // Re-exported by the service, so the mock must provide them.
  getMedia: vi.fn(),
  getMediaByStorageKey: vi.fn(),
  countMedia: vi.fn(),
  listMedia: vi.fn(),
  listMediaPage: vi.fn(),
  DEFAULT_MEDIA_PAGE_SIZE: 50,
}));

/** The reference check the delete guard consults. */
const references = vi.hoisted(() => ({ findMediaReferences: vi.fn() }));

vi.mock("@/lib/media/storage", () => ({
  getStorageProvider: () => provider,
  DEFAULT_STORAGE_PROVIDER: "vercel-blob",
}));

vi.mock("@/lib/repositories/media", () => repo);

vi.mock("@/lib/repositories/media-references", () => ({
  findMediaReferences: references.findMediaReferences,
  UNCHECKABLE_REFERENCE_AREAS: [],
}));

import { Prisma } from "@/generated/prisma/client";
import { MediaError, removeMedia, updateMediaInfo, uploadMedia } from "@/lib/media/service";
import { StorageNotConfiguredError } from "@/lib/media/types";

/** The key the fake provider reports back (as if a random suffix was added). */
const STORED_KEY = "media/products/9-hero.png-abc123";
const STORED_URL = "https://store.public.blob.vercel-storage.com/media/products/9-hero.png-abc123";

function bytes(prefix: number[], filler = 40): ArrayBuffer {
  const out = new Uint8Array(prefix.length + filler);
  out.set(prefix, 0);
  return out.buffer;
}
const str = (value: string) => [...value].map((c) => c.charCodeAt(0));
const PNG = () => bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const uploadInput = (overrides: Partial<Parameters<typeof uploadMedia>[0]> = {}) => ({
  filename: "Hero.PNG",
  declaredMimeType: "image/png",
  bytes: PNG(),
  folder: "products",
  ...overrides,
});

/** Prisma's "record required but not found". */
const p2025 = () =>
  new Prisma.PrismaClientKnownRequestError("not found", {
    code: "P2025",
    clientVersion: "7.10.0",
  });

describe("uploadMedia", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    provider.upload.mockResolvedValue({ key: STORED_KEY, url: STORED_URL });
    provider.delete.mockResolvedValue(undefined);
    repo.createMedia.mockResolvedValue({ id: "m1", storageKey: STORED_KEY });
  });

  it("stores the bytes, then persists the STORED key and the sniffed type", async () => {
    const row = await uploadMedia(uploadInput());

    expect(row).toEqual({ id: "m1", storageKey: STORED_KEY });
    expect(provider.upload).toHaveBeenCalledTimes(1);

    const upload = provider.upload.mock.calls[0][0];
    // The SNIFFED type, never the client's claim.
    expect(upload.contentType).toBe("image/png");
    // Disambiguated so two admins uploading "hero.png" cannot collide.
    expect(upload.addRandomSuffix).toBe(true);
    expect(upload.key).toMatch(/^media\/products\/\d+-hero\.png$/);

    // The provider's SUFFIXED key is what gets persisted — not the requested one.
    expect(repo.createMedia.mock.calls[0][0]).toMatchObject({
      storageKey: STORED_KEY,
      url: STORED_URL,
      mimeType: "image/png",
      filename: "Hero.PNG",
    });
  });

  it("does not touch storage at all when validation fails", async () => {
    await expect(
      uploadMedia(uploadInput({ bytes: bytes(str("#!/bin/sh")) })),
    ).rejects.toMatchObject({ code: "notImage" });

    expect(provider.upload).not.toHaveBeenCalled();
    expect(repo.createMedia).not.toHaveBeenCalled();
  });

  it("maps a transport failure to storageFailed and persists nothing", async () => {
    provider.upload.mockRejectedValue(new Error("blob is down"));

    await expect(uploadMedia(uploadInput())).rejects.toMatchObject({
      code: "storageFailed",
    });
    expect(repo.createMedia).not.toHaveBeenCalled();
    expect(provider.delete).not.toHaveBeenCalled();
  });

  it("maps missing credentials to storageNotConfigured", async () => {
    provider.upload.mockRejectedValue(new StorageNotConfiguredError());

    await expect(uploadMedia(uploadInput())).rejects.toMatchObject({
      code: "storageNotConfigured",
    });
  });

  describe("failure handling — DB creation fails after a successful Blob upload", () => {
    it("deletes the object it just stored, and rethrows the ORIGINAL error", async () => {
      const dbError = new Error("unique constraint");
      repo.createMedia.mockRejectedValue(dbError);

      await expect(uploadMedia(uploadInput())).rejects.toBe(dbError);

      // The orphan guard: the object must not survive a failed create.
      expect(provider.delete).toHaveBeenCalledWith([STORED_KEY]);
    });

    it("still rethrows the original error when the cleanup ALSO fails", async () => {
      const dbError = new Error("unique constraint");
      repo.createMedia.mockRejectedValue(dbError);
      provider.delete.mockRejectedValue(new Error("blob is down"));

      // The caller must see the failure it can act on, not the cleanup's.
      await expect(uploadMedia(uploadInput())).rejects.toBe(dbError);
    });
  });
});

describe("removeMedia", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    provider.delete.mockResolvedValue(undefined);
    repo.deleteMedia.mockResolvedValue({ id: "m1", storageKey: STORED_KEY });
    // The guard reads the row first (it needs the url to check references).
    repo.getMedia.mockResolvedValue({
      id: "m1",
      url: STORED_URL,
      storageKey: STORED_KEY,
    });
    references.findMediaReferences.mockResolvedValue([]);
  });

  it("deletes the ROW first and the object second", async () => {
    const order: string[] = [];
    repo.deleteMedia.mockImplementation(async () => {
      order.push("db");
      return { id: "m1", storageKey: STORED_KEY };
    });
    provider.delete.mockImplementation(async () => {
      order.push("blob");
    });

    await removeMedia("m1");

    // Order is load-bearing: the reverse would risk a row pointing at a file
    // that no longer exists.
    expect(order).toEqual(["db", "blob"]);
    expect(provider.delete).toHaveBeenCalledWith([STORED_KEY]);
  });

  it("checks references by BOTH id and url before deleting anything", async () => {
    await removeMedia("m1");

    // Pass 13.5C: the id covers the real foreign keys (product.heroMediaId,
    // productImage.mediaId, siteSettings.logoMediaId, …) and the url covers the
    // legacy columns that predate them. Passing only one would leave a whole
    // probe family unrun — which is how a referenced asset gets deleted.
    expect(references.findMediaReferences).toHaveBeenCalledWith({
      id: "m1",
      url: STORED_URL,
    });
  });

  it("refuses to delete a REFERENCED asset, touching neither the row nor the object", async () => {
    references.findMediaReferences.mockResolvedValue([
      { area: "product.heroImage", count: 2 },
    ]);

    await expect(removeMedia("m1")).rejects.toMatchObject({ code: "inUse" });

    // The whole point of the guard: nothing is removed, so the live site keeps
    // working and the admin can go and unlink the asset first.
    expect(repo.deleteMedia).not.toHaveBeenCalled();
    expect(provider.delete).not.toHaveBeenCalled();
  });

  it("reports an unknown id as notFound and never touches storage", async () => {
    repo.getMedia.mockResolvedValue(null);

    await expect(removeMedia("nope")).rejects.toMatchObject({ code: "notFound" });
    expect(references.findMediaReferences).not.toHaveBeenCalled();
    expect(repo.deleteMedia).not.toHaveBeenCalled();
    expect(provider.delete).not.toHaveBeenCalled();
  });

  it("still reports notFound when the row vanishes between the check and the delete", async () => {
    // The pre-read succeeded, so the guard ran — but the delete then hit P2025.
    repo.deleteMedia.mockRejectedValue(p2025());

    await expect(removeMedia("m1")).rejects.toMatchObject({ code: "notFound" });
    expect(provider.delete).not.toHaveBeenCalled();
  });

  it("does NOT throw when the object delete fails — an orphan file is acceptable", async () => {
    provider.delete.mockRejectedValue(new Error("blob is down"));

    await expect(removeMedia("m1")).resolves.toBeUndefined();
    // The row really was removed; only the object is left behind.
    expect(repo.deleteMedia).toHaveBeenCalledTimes(1);
  });

  it("rethrows a non-P2025 database error unchanged", async () => {
    const dbError = new Error("connection reset");
    repo.deleteMedia.mockRejectedValue(dbError);

    await expect(removeMedia("m1")).rejects.toBe(dbError);
    expect(provider.delete).not.toHaveBeenCalled();
  });
});

describe("updateMediaInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repo.updateMediaMetadata.mockResolvedValue({ id: "m1" });
  });

  it("passes the patch through and returns the row", async () => {
    await expect(updateMediaInfo("m1", { alt: "A chair" })).resolves.toEqual({ id: "m1" });
    expect(repo.updateMediaMetadata).toHaveBeenCalledWith("m1", { alt: "A chair" });
  });

  it("performs no storage operation (metadata only)", async () => {
    await updateMediaInfo("m1", { title: "Hero" });
    expect(provider.upload).not.toHaveBeenCalled();
    expect(provider.delete).not.toHaveBeenCalled();
  });

  it("reports a missing row as notFound", async () => {
    repo.updateMediaMetadata.mockRejectedValue(p2025());

    await expect(updateMediaInfo("nope", { alt: "x" })).rejects.toMatchObject({
      code: "notFound",
    });
  });
});

describe("MediaError", () => {
  it("carries the code and keeps a cause when one is supplied", () => {
    const cause = new Error("underlying");
    const error = new MediaError("storageFailed", "boom", { cause });

    expect(error.code).toBe("storageFailed");
    expect(error.name).toBe("MediaError");
    expect(error.cause).toBe(cause);
    expect(error).toBeInstanceOf(Error);
  });
});
