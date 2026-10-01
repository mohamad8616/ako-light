/**
 * Pass 13.5 Step 9 — media validation (lib/media/validation.ts).
 *
 * `lib/admin/image-sniff.ts` already owns the byte-signature tests
 * (tests/unit/admin/image-sniff.test.ts). This file covers what the MEDIA layer
 * adds on top of it:
 *
 *   - `validateImageUpload` — the composition of those rules into the result
 *     shape the media service consumes, including the security property that
 *     the SNIFFED type wins over the client's claim;
 *   - `buildStorageKey` / `safeFolder` — safe path generation, which is the
 *     only place a client-supplied value can reach a provider pathname.
 *
 * Pure: no SDK, no network, no database.
 */
import { describe, expect, it } from "vitest";
import {
  buildStorageKey,
  DEFAULT_MEDIA_FOLDER,
  MAX_UPLOAD_BYTES,
  MEDIA_KEY_PREFIX,
  safeFolder,
  validateImageUpload,
} from "@/lib/media/validation";

/** A byte array from a signature prefix plus filler. */
function bytes(prefix: number[], filler = 40): ArrayBuffer {
  const out = new Uint8Array(prefix.length + filler);
  out.set(prefix, 0);
  return out.buffer;
}
const str = (value: string) => [...value].map((c) => c.charCodeAt(0));

const JPEG = () => bytes([0xff, 0xd8, 0xff, 0xe0]);
const PNG = () => bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP = () => bytes([...str("RIFF"), 0, 0, 0, 0, ...str("WEBP")]);
const AVIF = () => bytes([0, 0, 0, 0, ...str("ftyp"), ...str("avif")]);

const valid = (bytesIn: ArrayBuffer, declaredMimeType = "image/png") =>
  validateImageUpload({ filename: "hero.png", declaredMimeType, bytes: bytesIn });

describe("validateImageUpload — accepted formats", () => {
  it("accepts a real JPEG", () => {
    const result = valid(JPEG(), "image/jpeg");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.mimeType).toBe("image/jpeg");
      expect(result.value.extension).toBe("jpg");
    }
  });

  it("accepts a real PNG", () => {
    const result = valid(PNG());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.mimeType).toBe("image/png");
      expect(result.value.extension).toBe("png");
    }
  });

  it("accepts a real WebP (container signature, not just a prefix)", () => {
    const result = valid(WEBP(), "image/webp");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.extension).toBe("webp");
  });

  it("accepts a real AVIF", () => {
    const result = valid(AVIF(), "image/avif");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.extension).toBe("avif");
  });
});

describe("validateImageUpload — rejections", () => {
  it("rejects a script that claims to be a PNG (valid extension, invalid bytes)", () => {
    // The classic bypass: a shell script named "cat.png" with type image/png.
    expect(valid(bytes(str("#!/bin/sh\nrm -rf /")))).toEqual({
      ok: false,
      code: "notImage",
    });
  });

  it("rejects an ISO-BMFF file that is not AVIF (e.g. MP4)", () => {
    expect(valid(bytes([0, 0, 0, 0, ...str("ftyp"), ...str("isom")]), "image/avif")).toEqual({
      ok: false,
      code: "notImage",
    });
  });

  it("rejects a RIFF container that is not WebP", () => {
    expect(valid(bytes([...str("RIFF"), 0, 0, 0, 0, ...str("WAVE")]), "image/webp")).toEqual({
      ok: false,
      code: "notImage",
    });
  });

  it("rejects a declared MIME the admin does not handle", () => {
    expect(valid(JPEG(), "image/gif")).toEqual({ ok: false, code: "notImage" });
    expect(valid(JPEG(), "application/pdf")).toEqual({ ok: false, code: "notImage" });
  });

  it("rejects empty and truncated payloads", () => {
    expect(valid(new ArrayBuffer(0))).toEqual({ ok: false, code: "required" });
    expect(valid(bytes([0xff, 0xd8]))).toEqual({ ok: false, code: "notImage" });
  });

  it("rejects an oversized image, and accepts the ceiling itself", () => {
    /** A valid PNG signature padded out to `total` bytes. */
    const sized = (total: number) => {
      const out = new Uint8Array(total);
      out.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
      return out.buffer;
    };

    // The cap is `> MAX`, so exactly MAX is legal — a real file at the boundary
    // must not be rejected by an off-by-one.
    const atCeiling = valid(sized(MAX_UPLOAD_BYTES));
    expect(atCeiling.ok).toBe(true);

    expect(valid(sized(MAX_UPLOAD_BYTES + 1))).toEqual({
      ok: false,
      code: "tooLarge",
    });
  });

  it("checks size before bytes, so a huge non-image reports tooLarge", () => {
    // An oversized payload is rejected on size without ever being sniffed — the
    // cheaper, safer order.
    expect(valid(new ArrayBuffer(MAX_UPLOAD_BYTES + 1))).toEqual({
      ok: false,
      code: "tooLarge",
    });
  });
});

describe("validateImageUpload — the sniffed type is authoritative", () => {
  it("trusts the bytes, not the declared type", () => {
    // Claims JPEG, is actually a PNG: the stored type must be image/png.
    const result = validateImageUpload({
      filename: "lie.jpg",
      declaredMimeType: "image/jpeg",
      bytes: PNG(),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.mimeType).toBe("image/png");
      expect(result.value.extension).toBe("png");
    }
  });

  it("strips the extension from the reported base name", () => {
    const result = validateImageUpload({
      filename: "Hero Shot.JPG",
      declaredMimeType: "image/jpeg",
      bytes: JPEG(),
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.baseName).toBe("hero-shot");
  });

  it("never reports a base name that could escape a path segment", () => {
    const result = validateImageUpload({
      filename: "../../etc/passwd",
      declaredMimeType: "image/png",
      bytes: PNG(),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.baseName).not.toContain("/");
      expect(result.value.baseName).not.toContain("..");
    }
  });
});

describe("safeFolder", () => {
  it("keeps a plain slug", () => {
    expect(safeFolder("products")).toBe("products");
    expect(safeFolder("product-categories")).toBe("product-categories");
  });

  it("falls back for anything that is not a plain slug", () => {
    for (const input of [
      "../../etc",
      "Products",
      "has space",
      "trailing-",
      "-leading",
      "sneaky/path",
      "",
      null,
      undefined,
      42,
      {},
    ]) {
      expect(safeFolder(input), String(input)).toBe(DEFAULT_MEDIA_FOLDER);
    }
  });
});

describe("buildStorageKey", () => {
  it("builds media/<folder>/<stamp>-<base>.<ext>", () => {
    expect(
      buildStorageKey({ folder: "products", baseName: "Hero Shot.jpg", extension: "jpg", now: 123 }),
    ).toBe("media/products/123-hero-shot.jpg");
  });

  it("defaults the folder when none is supplied", () => {
    expect(buildStorageKey({ baseName: "a", extension: "png", now: 1 })).toBe(
      `media/${DEFAULT_MEDIA_FOLDER}/1-a.png`,
    );
  });

  it("neutralises a traversal attempt in BOTH the folder and the name", () => {
    const key = buildStorageKey({
      folder: "../../etc",
      baseName: "../../etc/passwd",
      extension: "png",
      now: 1,
    });
    expect(key).toBe("media/uploads/1-passwd.png");
    expect(key).not.toContain("..");
  });

  it("rejects an extension outside the shared allow-list", () => {
    // Falls back to "bin" rather than letting an arbitrary string into the key.
    expect(buildStorageKey({ folder: "x", baseName: "a", extension: "php", now: 1 })).toBe(
      "media/x/1-a.bin",
    );
    expect(buildStorageKey({ folder: "x", baseName: "a", extension: "p!h<p", now: 1 })).toBe(
      "media/x/1-a.bin",
    );
  });

  it("is deterministic for a given timestamp, and unique across timestamps", () => {
    const at = (now: number) => buildStorageKey({ folder: "p", baseName: "a", extension: "png", now });
    expect(at(5)).toBe(at(5));
    expect(at(5)).not.toBe(at(6));
  });

  it("always lives under the media prefix", () => {
    expect(
      buildStorageKey({ folder: "p", baseName: "a", extension: "png", now: 1 }).startsWith(
        `${MEDIA_KEY_PREFIX}/`,
      ),
    ).toBe(true);
  });

  it("falls back to a neutral base for an unusable name", () => {
    expect(buildStorageKey({ folder: "p", baseName: "", extension: "png", now: 1 })).toBe(
      "media/p/1-image.png",
    );
  });
});
