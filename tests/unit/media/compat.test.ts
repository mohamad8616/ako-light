/**
 * The compatibility boundary between the catalog's URL-string image fields and
 * the Media foundation.
 *
 * WHY THIS FILE EXISTS
 *
 * The catalog models (`Product.heroImage`, `Designer.image`, `Project.image`, …)
 * store a BARE URL STRING and are NOT migrated to `Media`. So two things
 * coexist:
 *
 *   catalog — an admin upload writes an object under `media/…` and puts the
 *             returned URL straight into a catalog column. Cleanup is
 *             URL-based, through `deleteStorageUrls(removedUrls(before, after))`.
 *   media   — the same upload also records a `Media` row, and cleanup there is
 *             BY KEY (`removeMedia`).
 *
 * Coexistence is safe only while a specific set of facts holds. They are
 * asserted here rather than described in a comment, because the failure mode is
 * silent and destructive: if a catalog field ever holds a URL that a `Media` row
 * owns, the URL sweep would delete the object out from under that row, leaving a
 * dangling reference that nothing reports. (And if the sweep cannot recognise
 * our own URLs at all, it deletes nothing and orphans accumulate — which is
 * exactly what happened when the app moved off Vercel Blob.)
 *
 * These are pure checks — no database, no network, no storage credentials.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { imageRefSchema } from "@/lib/admin/schemas/common";
import { storageKeyFromUrl } from "@/lib/admin/storage-cleanup";
import { IMAGE_EXTENSIONS, MAX_UPLOAD_BYTES } from "@/lib/admin/image-sniff";
import {
  buildStorageKey,
  MAX_UPLOAD_BYTES as MEDIA_MAX_UPLOAD_BYTES,
  MEDIA_KEY_PREFIX,
} from "@/lib/media/validation";

/**
 * A Liara public URL in the bucket-subdomain shape the app writes.
 *
 * Deliberately a literal: this test exists to notice if the URL layout changes,
 * so importing a helper to build it would defeat the point.
 */
const MEDIA_URL =
  "https://homeform-media.storage.iran.liara.site/media/products/1-hero.png";

// `storageKeyFromUrl` decides ownership from the CONFIGURED endpoint + bucket,
// so pin them to match the URL above rather than depending on whatever the
// developer's `.env` happens to hold.
beforeAll(() => {
  process.env.LIARA_ENDPOINT = "https://storage.iran.liara.site";
  process.env.LIARA_BUCKET_NAME = "homeform-media";
  process.env.LIARA_ACCESS_KEY = "test-access-key";
  process.env.LIARA_SECRET_KEY = "test-secret-key";
});

describe("media output is a drop-in for the existing image fields", () => {
  it("a Media URL satisfies the catalog image schema unchanged", () => {
    // The whole reason the catalog models need no migration yet: the media
    // service returns a plain URL string, which is exactly what every existing
    // image column already validates against.
    expect(imageRefSchema.safeParse(MEDIA_URL).success).toBe(true);
  });

  it("a storage key is never an absolute URL or a traversal", () => {
    const key = buildStorageKey({
      folder: "products",
      baseName: "../../etc/passwd",
      extension: "png",
      now: 1,
    });
    expect(key.startsWith("/")).toBe(false);
    expect(key).not.toContain("..");
    expect(key).not.toMatch(/^https?:/);
  });
});

describe("the URL sweep recognises exactly our own objects", () => {
  it("media keys live under media/", () => {
    for (const folder of ["products", "designers", "uploads", undefined]) {
      const key = buildStorageKey({
        folder,
        baseName: "hero",
        extension: "png",
        now: 1,
      });
      expect(key.startsWith(`${MEDIA_KEY_PREFIX}/`)).toBe(true);
    }
  });

  it("round-trips a stored URL back to its key", () => {
    expect(storageKeyFromUrl(MEDIA_URL)).toBe("media/products/1-hero.png");
  });

  it("ignores a foreign host, so nothing outside our bucket is ever deleted", () => {
    // Includes the Vercel Blob host the app used to write to: those objects are
    // no longer ours to manage, and treating them as ours is what would make the
    // sweep call a provider that no longer knows them.
    expect(
      storageKeyFromUrl(
        "https://store.public.blob.vercel-storage.com/media/products/1-hero.png",
      ),
    ).toBeNull();
    expect(storageKeyFromUrl("/images/seed/hero.jpg")).toBeNull();
  });
});

describe("the media path does not weaken the legacy validation", () => {
  it("accepts exactly the same image types", () => {
    expect(Object.keys(IMAGE_EXTENSIONS).sort()).toEqual([
      "image/avif",
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
  });

  it("enforces the same 5 MB ceiling", () => {
    // The media validator RE-EXPORTS the legacy constant rather than declaring
    // its own, so the two cannot drift apart.
    expect(MEDIA_MAX_UPLOAD_BYTES).toBe(MAX_UPLOAD_BYTES);
    expect(MAX_UPLOAD_BYTES).toBe(5 * 1024 * 1024);
  });
});
