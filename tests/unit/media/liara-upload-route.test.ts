/**
 * Liara direct-upload authorization route (app/api/admin/media/upload/route.ts)
 * and the server-side verification that follows it.
 *
 * The security properties the pass requires are pinned here: only an admin can
 * obtain an authorization, the server — not the browser — chooses the key, the
 * type and the size ceiling, and registration re-checks the object in the store
 * instead of trusting what the browser reported.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const getAdminRoleMock = vi.hoisted(() => vi.fn());
const providerHolder = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("@/lib/admin/access", () => ({ getAdminRole: getAdminRoleMock }));
vi.mock("@/lib/media/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/media/storage")>();
  return {
    ...actual,
    // A getter, so a test can swap the provider between cases.
    get storageProvider() {
      return providerHolder.current;
    },
  };
});

const repo = vi.hoisted(() => ({ createMedia: vi.fn() }));
const references = vi.hoisted(() => ({ findMediaReferences: vi.fn() }));
vi.mock("@/lib/repositories/media", () => ({
  ...repo,
  getMedia: vi.fn(),
  deleteMedia: vi.fn(),
  updateMediaMetadata: vi.fn(),
  getMediaByStorageKey: vi.fn(),
  countMedia: vi.fn(),
  listMedia: vi.fn(),
  listMediaPage: vi.fn(),
  DEFAULT_MEDIA_PAGE_SIZE: 50,
}));
vi.mock("@/lib/repositories/media-references", () => ({
  findMediaReferences: references.findMediaReferences,
  UNCHECKABLE_REFERENCE_AREAS: [],
}));

import { POST } from "@/app/api/admin/media/upload/route";
import { MediaError, registerUploadedMedia } from "@/lib/media/service";
import { createLiaraStorage } from "@/lib/media/storage/liara";
import { signLiaraUploadAuthorization } from "@/lib/media/storage/liara-upload-token";

const CONFIG = {
  endpoint: "https://storage.iran.liara.site",
  bucket: "homeform-media",
  accessKeyId: "AKIAEXAMPLE",
  secretAccessKey: "secret-example",
};

/** A Liara provider whose S3 client and presigner are fakes. */
function liaraProvider(
  head: Record<string, unknown> = {
    ContentLength: 1024,
    ContentType: "video/mp4",
  },
) {
  return createLiaraStorage({
    config: () => CONFIG,
    client: () =>
      ({
        send: vi.fn(async (command: { constructor: { name: string } }) =>
          command.constructor.name === "HeadObjectCommand" ? head : {},
        ),
      }) as never,
    presign: (async () =>
      "https://storage.iran.liara.site/homeform-media/media/x?sig=1") as never,
  });
}

const request = (body: unknown) =>
  new Request("https://example.com/api/admin/media/upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  process.env.BETTER_AUTH_SECRET = "test-secret-for-signing";
  providerHolder.current = liaraProvider();
});

describe("POST /api/admin/media/upload — Liara authorization", () => {
  it("refuses an anonymous caller with 403", async () => {
    getAdminRoleMock.mockResolvedValue(undefined);
    const response = await POST(
      request({ payload: { filename: "clip.mp4", size: 1024 } }),
    );
    expect(response.status).toBe(403);
  });

  it("refuses a plain USER with 403", async () => {
    getAdminRoleMock.mockResolvedValue(undefined);
    expect(
      (await POST(request({ payload: { filename: "clip.mp4", size: 1024 } })))
        .status,
    ).toBe(403);
  });

  it("mints a key, a presigned URL and a signed token for an ADMIN", async () => {
    getAdminRoleMock.mockResolvedValue("admin");
    const response = await POST(
      request({ payload: { filename: "clip.mp4", size: 1024 } }),
    );
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body.provider).toBe("liara");
    expect(String(body.key)).toMatch(/^media\/library\/\d+-clip\.mp4/);
    expect(String(body.key).startsWith("media/library/")).toBe(true);
    expect(body.contentType).toBe("video/mp4");
    expect(typeof body.uploadToken).toBe("string");
    // The browser never receives credentials.
    expect(JSON.stringify(body)).not.toContain(CONFIG.secretAccessKey);
    expect(JSON.stringify(body)).not.toContain(CONFIG.accessKeyId);
  });

  it("never lets the browser choose the key", async () => {
    getAdminRoleMock.mockResolvedValue("admin");
    const body = (await (
      await POST(
        request({
          payload: {
            filename: "clip.mp4",
            size: 1024,
            pathname: "media/library/attacker.mp4",
          },
        }),
      )
    ).json()) as { key: string };

    expect(body.key).not.toBe("media/library/attacker.mp4");
    expect(body.key).toMatch(/^media\/library\//);
  });

  it("refuses an unsupported extension", async () => {
    getAdminRoleMock.mockResolvedValue("admin");
    const response = await POST(
      request({ payload: { filename: "clip.mov", size: 1024 } }),
    );
    expect(response.status).toBe(400);
  });

  it("refuses a file over the video ceiling (200 MB)", async () => {
    getAdminRoleMock.mockResolvedValue("admin");
    const response = await POST(
      request({
        payload: { filename: "clip.mp4", size: 200 * 1024 * 1024 + 1 },
      }),
    );
    expect(response.status).toBe(413);
  });

  it("refuses a non-numeric or missing size", async () => {
    getAdminRoleMock.mockResolvedValue("admin");
    for (const size of [undefined, "big", 0, -1]) {
      expect(
        (await POST(request({ payload: { filename: "clip.mp4", size } })))
          .status,
      ).toBe(400);
    }
  });
});

describe("registerUploadedMedia — Liara verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BETTER_AUTH_SECRET = "test-secret-for-signing";
    providerHolder.current = liaraProvider();
    repo.createMedia.mockResolvedValue({ id: "m1", url: "x" });
  });

  const token = (overrides: Record<string, unknown> = {}) =>
    signLiaraUploadAuthorization({
      nonce: "n",
      key: "media/library/1-clip.mp4",
      filename: "clip.mp4",
      size: 1024,
      contentType: "video/mp4",
      expiresAt: Date.now() + 60_000,
      ...overrides,
    });

  it("creates the row from VERIFIED store metadata, not the browser's report", async () => {
    await registerUploadedMedia({
      filename: "clip.mp4",
      uploadToken: token(),
      size: 1024,
    });

    expect(repo.createMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        storageKey: "media/library/1-clip.mp4",
        size: 1024,
        mediaType: "video",
        mimeType: "video/mp4",
        url: "https://homeform-media.storage.iran.liara.site/media/library/1-clip.mp4",
      }),
    );
  });

  it("refuses a registration with no signed authorization", async () => {
    // An empty token stands in for "the caller sent nothing usable": the zod
    // schema rejects a truly missing one before this point, so what is pinned
    // here is the service-level guard behind it.
    await expect(
      registerUploadedMedia({
        filename: "clip.mp4",
        uploadToken: "",
        size: 1024,
      }),
    ).rejects.toBeInstanceOf(MediaError);
    expect(repo.createMedia).not.toHaveBeenCalled();
  });

  it("refuses an expired authorization", async () => {
    await expect(
      registerUploadedMedia({
        filename: "clip.mp4",
        uploadToken: token({ expiresAt: Date.now() - 1 }),
        size: 1024,
      }),
    ).rejects.toMatchObject({ code: "unsupportedType" });
    expect(repo.createMedia).not.toHaveBeenCalled();
  });

  it("refuses when the client's filename or size disagrees with the authorization", async () => {
    await expect(
      registerUploadedMedia({
        filename: "other.mp4",
        uploadToken: token(),
        size: 1024,
      }),
    ).rejects.toBeInstanceOf(MediaError);
    await expect(
      registerUploadedMedia({
        filename: "clip.mp4",
        uploadToken: token(),
        size: 2048,
      }),
    ).rejects.toBeInstanceOf(MediaError);
    expect(repo.createMedia).not.toHaveBeenCalled();
  });

  it("refuses when the object is missing from the store", async () => {
    providerHolder.current = liaraProvider({ ContentType: "video/mp4" });
    await expect(
      registerUploadedMedia({
        filename: "clip.mp4",
        uploadToken: token(),
        size: 1024,
      }),
    ).rejects.toBeInstanceOf(Error);
    expect(repo.createMedia).not.toHaveBeenCalled();
  });

  it("refuses when the stored content type does not match the extension", async () => {
    providerHolder.current = liaraProvider({
      ContentLength: 1024,
      ContentType: "application/octet-stream",
    });
    await expect(
      registerUploadedMedia({
        filename: "clip.mp4",
        uploadToken: token(),
        size: 1024,
      }),
    ).rejects.toBeInstanceOf(Error);
    expect(repo.createMedia).not.toHaveBeenCalled();
  });

  it("refuses a registration whose token does not match the filename", async () => {
    providerHolder.current = liaraProvider();

    await expect(
      registerUploadedMedia({
        filename: "other.mp4",
        uploadToken: token(),
        size: 1024,
      }),
    ).rejects.toBeInstanceOf(Error);
    expect(repo.createMedia).not.toHaveBeenCalled();
  });
});
