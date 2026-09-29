/**
 * Upload validation (lib/admin/image-sniff.ts) — the security-critical half of
 * the admin image upload: deciding whether a payload is REALLY an image.
 *
 * The declared `File.type` is attacker-controlled, so these cases deliberately
 * include the "claims to be an image, isn't one" shape.
 */
import { describe, expect, it } from "vitest";
import {
  MAX_UPLOAD_BYTES,
  safeBaseName,
  sniffImageType,
} from "@/lib/admin/image-sniff";

/** Builds a byte array from a prefix plus filler. */
function bytes(prefix: number[], filler = 32): Uint8Array {
  const out = new Uint8Array(prefix.length + filler);
  out.set(prefix, 0);
  return out;
}

/** ASCII helper for the text-based container signatures. */
function str(value: string): number[] {
  return [...value].map((char) => char.charCodeAt(0));
}

describe("sniffImageType", () => {
  it("recognises JPEG", () => {
    expect(sniffImageType(bytes([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
  });

  it("recognises PNG", () => {
    expect(
      sniffImageType(
        bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBe("image/png");
  });

  it("recognises WebP by its RIFF....WEBP container", () => {
    expect(
      sniffImageType(bytes([...str("RIFF"), 0, 0, 0, 0, ...str("WEBP")])),
    ).toBe("image/webp");
  });

  it("recognises AVIF by its ftyp brand", () => {
    expect(
      sniffImageType(bytes([0, 0, 0, 0, ...str("ftyp"), ...str("avif")])),
    ).toBe("image/avif");
    expect(
      sniffImageType(bytes([0, 0, 0, 0, ...str("ftyp"), ...str("avis")])),
    ).toBe("image/avif");
  });

  it("rejects a non-image payload that claims to be a PNG", () => {
    // The classic bypass: a script renamed to .png with type "image/png".
    expect(sniffImageType(bytes(str("#!/bin/sh\nrm -rf /")))).toBeNull();
  });

  it("rejects an ISO-BMFF file that is not AVIF (e.g. MP4)", () => {
    expect(
      sniffImageType(bytes([0, 0, 0, 0, ...str("ftyp"), ...str("isom")])),
    ).toBeNull();
  });

  it("rejects RIFF containers that are not WebP", () => {
    expect(
      sniffImageType(bytes([...str("RIFF"), 0, 0, 0, 0, ...str("WAVE")])),
    ).toBeNull();
  });

  it("rejects empty and truncated payloads", () => {
    expect(sniffImageType(new Uint8Array(0))).toBeNull();
    expect(sniffImageType(bytes([0xff, 0xd8]))).toBeNull();
  });

  it("never returns a type the uploader would refuse to store", () => {
    // Guards the invariant between the sniffer and IMAGE_EXTENSIONS: a sniffed
    // type the map does not know would fall through to "notImage" anyway, but
    // only because of a second lookup — keep them in lockstep.
    const known = ["image/jpeg", "image/png", "image/webp", "image/avif"];
    for (const sample of [
      bytes([0xff, 0xd8, 0xff]),
      bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ]) {
      const type = sniffImageType(sample);
      expect(type).not.toBeNull();
      expect(known).toContain(type);
    }
  });
});

describe("safeBaseName", () => {
  it("strips directory components", () => {
    expect(safeBaseName("../../etc/passwd")).toBe("passwd");
    expect(safeBaseName("C:\\Users\\me\\Hero Shot.jpg")).toBe("hero-shot.jpg");
  });

  it("reduces messy names to a safe segment", () => {
    const cleaned = safeBaseName("  --hero (final).PNG  ");
    // Property over exactness: whatever the input, the result must be safe to
    // interpolate into a Blob pathname.
    expect(cleaned).toMatch(/^[a-z0-9._-]+$/);
    expect(cleaned).not.toMatch(/^[.-]/);
    expect(cleaned).toMatch(/png$/);
  });

  it("keeps a clean name unchanged", () => {
    expect(safeBaseName("hero-shot.jpg")).toBe("hero-shot.jpg");
  });

  it("falls back to a neutral name for unusable input", () => {
    expect(safeBaseName("")).toBe("image");
    expect(safeBaseName("///")).toBe("image");
  });

  it("caps the length", () => {
    expect(safeBaseName(`${"a".repeat(200)}.jpg`).length).toBeLessThanOrEqual(
      60,
    );
  });
});

describe("MAX_UPLOAD_BYTES", () => {
  it("is a 5 MB ceiling", () => {
    expect(MAX_UPLOAD_BYTES).toBe(5 * 1024 * 1024);
  });
});
