/**
 * Pass 13.5E — large-file uploads: validation, the registration path, and the
 * authorization of the token endpoint.
 *
 * Hermetic. The storage provider, the repository and the session are all mocked,
 * so nothing here touches Vercel Blob or the database — the plan is explicit
 * that normal tests must not depend on the live Blob service.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const repo = vi.hoisted(() => ({
  createMedia: vi.fn(),
  deleteMedia: vi.fn(),
  updateMediaMetadata: vi.fn(),
  getMedia: vi.fn(),
  getMediaByStorageKey: vi.fn(),
  countMedia: vi.fn(),
  listMedia: vi.fn(),
  listMediaPage: vi.fn(),
  DEFAULT_MEDIA_PAGE_SIZE: 50,
}));

const provider = vi.hoisted(() => ({
  name: "fake",
  upload: vi.fn(),
  delete: vi.fn(),
  getUrl: vi.fn(() => null),
  supportsClientUpload: true,
  authorizeClientUpload: vi.fn(),
}));

const references = vi.hoisted(() => ({ findMediaReferences: vi.fn() }));
const getAdminRoleMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/repositories/media", () => repo);
vi.mock("@/lib/repositories/media-references", () => ({
  findMediaReferences: references.findMediaReferences,
  UNCHECKABLE_REFERENCE_AREAS: [],
}));
vi.mock("@/lib/media/storage", () => ({
  getStorageProvider: () => provider,
  DEFAULT_STORAGE_PROVIDER: "vercel-blob",
}));
vi.mock("@/lib/admin/access", () => ({ getAdminRole: getAdminRoleMock }));

import {
  registerUploadedMedia,
  MediaError,
} from "@/lib/media/service";
import { IMAGE_MAX_BYTES, readByteLimit, VIDEO_MAX_BYTES } from "@/lib/media/limits";
import { validateMediaUpload } from "@/lib/media/validation";
import { sniffVideoType } from "@/lib/media/video-sniff";
import { POST } from "@/app/api/admin/media/upload/route";

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
      sniffVideoType(new Uint8Array(bytes([0x1a, 0x45, 0xdf, 0xa3, ...str("matroska")]))),
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
      input({ filename: "clip.webm", declaredMimeType: "video/webm", bytes: webm() }),
    );

    expect(result.ok && result.value.mediaType).toBe("video");
    expect(result.ok && result.value.extension).toBe("webm");
  });

  it("still routes images down the IMAGE branch", () => {
    const result = validateMediaUpload(
      input({ filename: "hero.png", declaredMimeType: "image/png", bytes: PNG() }),
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
      input({ filename: "evil.mp4", declaredMimeType: "video/mp4", bytes: bytes(str("#!/bin/sh")) }),
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
        input({ filename: "hero.png", declaredMimeType: "image/png", bytes: huge }),
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

describe("registerUploadedMedia", () => {
  const valid = {
    filename: "clip.mp4",
    url: "https://store.public.blob.vercel-storage.com/media/library/1-clip.mp4",
    pathname: "media/library/1-clip.mp4",
    size: 1024,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    repo.createMedia.mockResolvedValue({ id: "m1", url: valid.url });
  });

  it("registers a video, deriving the KIND and MIME from the pathname", async () => {
    await registerUploadedMedia(valid);

    expect(repo.createMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        storageKey: "media/library/1-clip.mp4",
        mediaType: "video",
        mimeType: "video/mp4",
      }),
    );
  });

  it("refuses a pathname outside the media namespace", async () => {
    await expect(
      registerUploadedMedia({ ...valid, pathname: "admin/products/x.mp4" }),
    ).rejects.toMatchObject({ code: "unsupportedType" });

    expect(repo.createMedia).not.toHaveBeenCalled();
  });

  it("refuses an extension the app does not support", async () => {
    await expect(
      registerUploadedMedia({ ...valid, pathname: "media/library/x.exe" }),
    ).rejects.toBeInstanceOf(MediaError);
    expect(repo.createMedia).not.toHaveBeenCalled();
  });

  it("refuses a size above the ceiling for that kind", async () => {
    await expect(
      registerUploadedMedia({ ...valid, size: VIDEO_MAX_BYTES + 1 }),
    ).rejects.toMatchObject({ code: "tooLarge" });
    expect(repo.createMedia).not.toHaveBeenCalled();
  });

  it("refuses a non-positive or non-numeric size", async () => {
    for (const size of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      await expect(
        registerUploadedMedia({ ...valid, size }),
      ).rejects.toMatchObject({ code: "tooLarge" });
    }
    expect(repo.createMedia).not.toHaveBeenCalled();
  });

  it("does not let a client widen an IMAGE path into a video ceiling", async () => {
    // The kind comes from the pathname, so a PNG path is capped at the image
    // limit even if the client reports a video-sized file.
    await expect(
      registerUploadedMedia({
        ...valid,
        pathname: "media/library/1-hero.png",
        size: IMAGE_MAX_BYTES + 1,
      }),
    ).rejects.toMatchObject({ code: "tooLarge" });
  });
});

describe("POST /api/admin/media/upload — authorization", () => {
  const request = (body: unknown) =>
    new Request("https://example.com/api/admin/media/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

  const tokenBody = {
    type: "blob.generate-client-token",
    payload: { pathname: "media/library/1-clip.mp4", callbackUrl: "https://example.com" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    provider.authorizeClientUpload.mockResolvedValue({
      type: "blob.generate-client-token",
      clientToken: "scoped-token",
    });
  });

  it("refuses an anonymous caller with 403 and mints nothing", async () => {
    getAdminRoleMock.mockResolvedValue(undefined);

    const response = await POST(request(tokenBody));

    expect(response.status).toBe(403);
    expect(provider.authorizeClientUpload).not.toHaveBeenCalled();
  });

  it("refuses a plain USER with 403", async () => {
    // `getAdminRole` returns undefined for a non-admin-level session, which is
    // the same filter the rest of the admin uses.
    getAdminRoleMock.mockResolvedValue(undefined);

    expect((await POST(request(tokenBody))).status).toBe(403);
  });

  it("mints a scoped token for an ADMIN", async () => {
    getAdminRoleMock.mockResolvedValue("admin");

    const response = await POST(request(tokenBody));

    expect(response.status).toBe(200);

    // Read the body ONCE — a Response body cannot be consumed twice.
    const payload = await response.json();
    expect(payload).toMatchObject({ clientToken: "scoped-token" });

    // The read-write token is never in the response; only a scoped client token.
    expect(JSON.stringify(payload)).not.toContain("BLOB_READ_WRITE_TOKEN");
  });

  it("mints a scoped token for an OWNER", async () => {
    getAdminRoleMock.mockResolvedValue("owner");
    expect((await POST(request(tokenBody))).status).toBe(200);
  });

  it("refuses a pathname outside the media namespace", async () => {
    getAdminRoleMock.mockResolvedValue("admin");

    const response = await POST(
      request({
        ...tokenBody,
        payload: { pathname: "admin/products/x.mp4", callbackUrl: "https://example.com" },
      }),
    );

    expect(response.status).toBe(400);
    expect(provider.authorizeClientUpload).not.toHaveBeenCalled();
  });

  it("refuses an unsupported extension before minting anything", async () => {
    getAdminRoleMock.mockResolvedValue("admin");

    const response = await POST(
      request({
        ...tokenBody,
        payload: { pathname: "media/library/x.mov", callbackUrl: "https://example.com" },
      }),
    );

    expect(response.status).toBe(400);
    expect(provider.authorizeClientUpload).not.toHaveBeenCalled();
  });

  it("derives the constraints from the extension, not from the client", async () => {
    getAdminRoleMock.mockResolvedValue("admin");

    await POST(request(tokenBody));

    expect(provider.authorizeClientUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        constraints: {
          key: "media/library/1-clip.mp4",
          allowedContentTypes: ["video/mp4", "video/webm"],
          maximumSizeInBytes: VIDEO_MAX_BYTES,
        },
      }),
    );
  });
});
