/**
 * Pass 13.5E — large-file uploads: the byte-level validation and the limits
 * that gate it.
 *
 * The authorization route and the registration path have their own suite
 * (tests/unit/media/liara-upload-route.test.ts), which mocks the provider and
 * asserts the wire protocol. What is left here is PURE: the limits parser, the
 * video sniffer, and the shared upload validator — no provider, no database, no
 * network.
 */
import { describe, expect, it } from "vitest";

import {
  IMAGE_MAX_BYTES,
  readByteLimit,
  VIDEO_MAX_BYTES,
} from "@/lib/media/limits";
import { validateMediaUpload } from "@/lib/media/validation";
import { sniffVideoType } from "@/lib/media/video-sniff";

// ---------------------------------------------------------------------------
// Byte fixtures
// ---------------------------------------------------------------------------

const bytes = (prefix: number[], filler = 64): ArrayBuffer => {
  const out = new Uint8Array(prefix.length + filler);
  out.set(prefix, 0);
  return out.buffer;
};

const str = (value: string) => [...value].map((c) => c.charCodeAt(0));

/** ISO-BMFF: "ftyp" at 4, brand at 8. */
const mp4 = (brand = "isom") =>
  bytes([0, 0, 0, 0, ...str("ftyp"), ...str(brand)]);

/** EBML magic + a "webm" DocType in the opening bytes. */
const webm = () => bytes([0x1a, 0x45, 0xdf, 0xa3, ...str("webm")]);

const PNG = () => bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("sniffVideoType", () => {
  it("recognises MP4 by its container brand", () => {
    expect(sniffVideoType(new Uint8Array(mp4("isom")))).toBe("video/mp4");
    expect(sniffVideoType(new Uint8Array(mp4("mp42")))).toBe("video/mp4");
  });

  it("recognises WebM by its EBML header and DocType", () => {
    expect(sniffVideoType(new Uint8Array(webm()))).toBe("video/webm");
  });

  it("does NOT claim an AVIF as a video, despite the shared ftyp container", () => {
    // This is the trap the whole ordering exists to avoid: AVIF is ISO-BMFF
    // too, so a naive ftyp check would turn a still image into a video.
    expect(sniffVideoType(new Uint8Array(mp4("avif")))).toBeNull();
    expect(sniffVideoType(new Uint8Array(mp4("avis")))).toBeNull();
  });

  it("rejects Matroska (.mkv) — same EBML header, but not webm", () => {
    expect(
      sniffVideoType(
        new Uint8Array(bytes([0x1a, 0x45, 0xdf, 0xa3, ...str("matroska")])),
      ),
    ).toBeNull();
  });

  it("rejects a script or an image", () => {
    expect(sniffVideoType(new Uint8Array(bytes(str("#!/bin/sh"))))).toBeNull();
    expect(sniffVideoType(new Uint8Array(PNG()))).toBeNull();
  });
});

describe("validateMediaUpload", () => {
  const input = (
    overrides: Partial<Parameters<typeof validateMediaUpload>[0]> = {},
  ) => ({
    filename: "clip.mp4",
    declaredMimeType: "video/mp4",
    bytes: mp4(),
    ...overrides,
  });

  it("accepts an MP4 and reports it as a video", () => {
    const result = validateMediaUpload(input());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.mediaType).toBe("video");
      expect(result.value.mimeType).toBe("video/mp4");
      expect(result.value.extension).toBe("mp4");
      // The extension is stripped from the stored base name.
      expect(result.value.baseName).toBe("clip");
    }
  });

  it("accepts a WebM", () => {
    const result = validateMediaUpload(
      input({
        filename: "clip.webm",
        declaredMimeType: "video/webm",
        bytes: webm(),
      }),
    );

    expect(result.ok && result.value.mediaType).toBe("video");
    expect(result.ok && result.value.extension).toBe("webm");
  });

  it("still routes images down the IMAGE branch", () => {
    const result = validateMediaUpload(
      input({
        filename: "hero.png",
        declaredMimeType: "image/png",
        bytes: PNG(),
      }),
    );

    expect(result.ok && result.value.mediaType).toBe("image");
  });

  it("rejects an unsupported type on the declared type alone", () => {
    const result = validateMediaUpload(
      input({ filename: "movie.mov", declaredMimeType: "video/quicktime" }),
    );

    expect(result).toEqual({ ok: false, code: "unsupportedType" });
  });

  it("rejects a file that CLAIMS to be a video but is not one", () => {
    const result = validateMediaUpload(
      input({
        filename: "evil.mp4",
        declaredMimeType: "video/mp4",
        bytes: bytes(str("#!/bin/sh")),
      }),
    );

    // `unsupportedType`, not `notImage`: the admin uploaded a video, and
    // "this is not a supported image" would send them looking for the wrong bug.
    expect(result).toEqual({ ok: false, code: "unsupportedType" });
  });

  it("rejects an oversized video", () => {
    const huge = new ArrayBuffer(VIDEO_MAX_BYTES + 1);
    new Uint8Array(huge).set(new Uint8Array(mp4()), 0);

    expect(validateMediaUpload(input({ bytes: huge }))).toEqual({
      ok: false,
      code: "tooLarge",
    });
  });

  it("rejects an oversized IMAGE at the smaller image ceiling", () => {
    const huge = new ArrayBuffer(IMAGE_MAX_BYTES + 1);
    new Uint8Array(huge).set(new Uint8Array(PNG()), 0);

    expect(
      validateMediaUpload(
        input({
          filename: "hero.png",
          declaredMimeType: "image/png",
          bytes: huge,
        }),
      ),
    ).toEqual({ ok: false, code: "tooLarge" });
  });
});

describe("readByteLimit", () => {
  it("uses the fallback when unset", () => {
    expect(readByteLimit(undefined, 123)).toBe(123);
  });

  it("parses a valid override", () => {
    expect(readByteLimit("  2048 ", 123)).toBe(2048);
  });

  it("falls back for a malformed value instead of disabling the guard", () => {
    // `size > NaN` is always false, so a bad parse must NOT reach the ceiling.
    for (const raw of ["", "abc", "0", "-5", "Infinity"]) {
      expect(readByteLimit(raw, 123)).toBe(123);
    }
  });
});

