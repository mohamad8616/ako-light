/**
 * Pass 13.5 Step 7 — the compatibility boundary between the legacy
 * URL-string image fields and the new Media foundation.
 *
 * WHY THIS FILE EXISTS
 *
 * The catalog models (`Product.heroImage`, `Designer.image`, `Project.image`, …)
 * store a BARE URL STRING and are NOT migrated to `Media` in this pass. So for
 * now two image systems coexist:
 *
 *   legacy — `lib/admin/actions/upload.ts` writes an object under `admin/…`
 *            and puts the returned URL straight into a catalog column. Cleanup
 *            is URL-based (`deleteBlobUrls(removedUrls(before, after))`).
 *   media  — `lib/media/service.ts` writes under `media/…`, records a `Media`
 *            row, and cleans up BY KEY (`removeMedia`).
 *
 * Coexistence is safe only while a specific set of facts holds. They are
 * asserted here rather than described in a comment, because the failure mode is
 * silent and destructive: if a catalog field ever holds a URL that a `Media` row
 * owns, the legacy URL-sweep will delete the object out from under that row,
 * leaving a dangling reference that nothing reports.
 *
 * These are pure checks — no database, no network, no storage credentials.
 */
import { describe, expect, it } from "vitest";
import { imageRefSchema } from "@/lib/admin/schemas/common";
import { isBlobUrl } from "@/lib/admin/blob";
import { IMAGE_EXTENSIONS, MAX_UPLOAD_BYTES } from "@/lib/admin/image-sniff";
import {
  buildStorageKey,
  MAX_UPLOAD_BYTES as MEDIA_MAX_UPLOAD_BYTES,
  MEDIA_KEY_PREFIX,
} from "@/lib/media/validation";

/**
 * The key prefix the LEGACY upload action uses, copied from
 * `lib/admin/actions/upload.ts` (`admin/${group}/…`).
 *
 * Deliberately a literal: this test exists to notice if that module's layout
 * changes, so importing the value would defeat the point.
 */
const LEGACY_KEY_PREFIX = "admin";

const BLOB_URL =
  "https://store123.public.blob.vercel-storage.com/media/products/1-hero.png";

describe("media output is a drop-in for the existing image fields", () => {
  it("a Media URL satisfies the catalog image schema unchanged", () => {
    // The whole reason the catalog models need no migration yet: the media
    // service returns a plain URL string, which is exactly what every existing
    // image column already validates against.
    expect(imageRefSchema.safeParse(BLOB_URL).success).toBe(true);
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

describe("the two systems own disjoint key namespaces", () => {
  it("media keys live under media/ and never under the legacy prefix", () => {
    for (const folder of ["products", "designers", "uploads", undefined]) {
      const key = buildStorageKey({
        folder,
        baseName: "hero",
        extension: "png",
        now: 1,
      });
      expect(key.startsWith(`${MEDIA_KEY_PREFIX}/`)).toBe(true);
      expect(key.startsWith(`${LEGACY_KEY_PREFIX}/`)).toBe(false);
    }
  });

  it("the prefixes differ, so a URL sweep cannot reach across", () => {
    // If these ever became equal, the legacy `deleteBlobUrls` sweep could
    // delete an object a Media row still references.
    expect(MEDIA_KEY_PREFIX).not.toBe(LEGACY_KEY_PREFIX);
  });

  it("the legacy blob-URL check still recognises our store", () => {
    // The legacy cleanup filters by host, not by prefix — it must keep working
    // for the uploads it owns.
    expect(isBlobUrl(BLOB_URL)).toBe(true);
    expect(isBlobUrl("/images/seed/hero.jpg")).toBe(false);
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
