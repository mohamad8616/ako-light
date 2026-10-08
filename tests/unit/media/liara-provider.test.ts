/**
 * Liara Object Storage provider (lib/media/storage/liara.ts + liara-config.ts).
 *
 * Hermetic: the S3 client and the presigner are injected fakes, so nothing here
 * reaches Liara or the network. The provider is server-only, which is why the
 * config helper is exercised through its pure function rather than `process.env`.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createLiaraStorage,
  isLiaraStorageHost,
  LIARA_UPLOAD_URL_TTL_SECONDS,
  liaraPublicUrl,
} from "@/lib/media/storage/liara";
import {
  LIARA_ENV_NAMES,
  readLiaraConfig,
} from "@/lib/media/storage/liara-config";
import { StorageNotConfiguredError } from "@/lib/media/types";

const CONFIG = {
  // The REAL endpoint shape: Liara's storage cluster answers on `liara.site`
  // (and the `liara.space` alias), NOT on the corporate `liara.ir` domain,
  // which does not resolve for storage at all. The old value here was
  // `https://storage.iran.liara.ir`, which made the suite assert the
  // bucket-subdomain branch against a host that does not exist.
  endpoint: "https://storage.iran.liara.site",
  bucket: "homeform-media",
  accessKeyId: "AKIAEXAMPLE",
  secretAccessKey: "secret-example",
};

/** A fake S3 client that records every command and returns scripted output. */
function fakeClient(result: unknown = {}) {
  const sent: unknown[] = [];
  return {
    sent,
    send: vi.fn(async (command: unknown) => {
      sent.push(command);
      return result;
    }),
  };
}

const presignMock = vi.fn(
  async () =>
    // Path-style, because the provider sets `forcePathStyle: true` — this is
    // the shape `getSignedUrl` actually produces.
    "https://storage.iran.liara.site/homeform-media/media/x?X-Amz-Signature=abc",
);

function providerWith(client: ReturnType<typeof fakeClient>) {
  return createLiaraStorage({
    config: () => CONFIG,
    client: () => client as never,
    presign: presignMock as never,
  });
}

describe("readLiaraConfig", () => {
  const env = (overrides: Record<string, string | undefined> = {}) =>
    ({
      LIARA_ENDPOINT: CONFIG.endpoint,
      LIARA_BUCKET_NAME: CONFIG.bucket,
      LIARA_ACCESS_KEY: CONFIG.accessKeyId,
      LIARA_SECRET_KEY: CONFIG.secretAccessKey,
      ...overrides,
    }) as unknown as NodeJS.ProcessEnv;

  it("reads all four variables", () => {
    expect(readLiaraConfig(env())).toEqual(CONFIG);
  });

  it("declares exactly the four documented environment names", () => {
    expect([...LIARA_ENV_NAMES]).toEqual([
      "LIARA_ENDPOINT",
      "LIARA_BUCKET_NAME",
      "LIARA_ACCESS_KEY",
      "LIARA_SECRET_KEY",
    ]);
  });

  it("throws StorageNotConfiguredError when a variable is missing", () => {
    for (const name of LIARA_ENV_NAMES) {
      expect(() => readLiaraConfig(env({ [name]: undefined }))).toThrow(
        StorageNotConfiguredError,
      );
    }
  });

  it("treats a whitespace-only value as unset", () => {
    expect(() => readLiaraConfig(env({ LIARA_ACCESS_KEY: "   " }))).toThrow(
      StorageNotConfiguredError,
    );
  });

  it("rejects a malformed endpoint instead of silently using it", () => {
    expect(() => readLiaraConfig(env({ LIARA_ENDPOINT: "not-a-url" }))).toThrow(
      /absolute HTTP\(S\) URL/,
    );
    expect(() =>
      readLiaraConfig(env({ LIARA_ENDPOINT: "ftp://x.test" })),
    ).toThrow(/absolute HTTP\(S\) URL/);
  });

  it("strips a trailing slash so URL building cannot double it", () => {
    expect(
      readLiaraConfig(env({ LIARA_ENDPOINT: "https://x.test/" })).endpoint,
    ).toBe("https://x.test");
  });
});

describe("liaraPublicUrl", () => {
  it("uses the bucket subdomain for the real Liara endpoint", () => {
    expect(liaraPublicUrl("media/a.png", CONFIG.endpoint, CONFIG.bucket)).toBe(
      "https://homeform-media.storage.iran.liara.site/media/a.png",
    );
  });

  it("treats every Liara storage domain as Liara, not just liara.ir", () => {
    // `liara.site` is what the console issues, `liara.space` is the alias
    // rclone ships, and `liara.ir` is the corporate domain. All three must take
    // the bucket-subdomain branch — matching ONLY `liara.ir` was the original
    // bug, and that domain does not even resolve for storage.
    for (const host of [
      "https://storage.iran.liara.site",
      "https://storage.iran.liara.space",
      "https://storage.iran.liara.ir",
    ]) {
      expect(liaraPublicUrl("media/a.png", host, CONFIG.bucket)).toBe(
        `https://homeform-media.${new URL(host).hostname}/media/a.png`,
      );
    }
  });

  it("does not mistake a look-alike host for Liara", () => {
    expect(isLiaraStorageHost("liara.example.com")).toBe(false);
    expect(isLiaraStorageHost("notliara.ir")).toBe(false);
    expect(isLiaraStorageHost("storage.iran.liara.site.evil.com")).toBe(false);
  });

  it("uses the path-style URL for a non-Liara/custom endpoint", () => {
    expect(
      liaraPublicUrl("media/a.png", "https://minio.internal:9000", "bucket"),
    ).toBe("https://minio.internal:9000/bucket/media/a.png");
  });

  it("encodes path segments but keeps the separators", () => {
    expect(
      liaraPublicUrl("media/my file.png", CONFIG.endpoint, CONFIG.bucket),
    ).toBe("https://homeform-media.storage.iran.liara.site/media/my%20file.png");
  });
});

describe("Liara upload", () => {
  beforeEach(() => vi.clearAllMocks());

  it("puts the object under the generated key and returns a derived URL", async () => {
    const client = fakeClient();
    const stored = await providerWith(client).upload({
      key: "media/library/1-hero.png",
      bytes: new Uint8Array([1, 2, 3]).buffer,
      contentType: "image/png",
      addRandomSuffix: false,
    });

    expect(stored.key).toBe("media/library/1-hero.png");
    expect(stored.url).toBe(
      "https://homeform-media.storage.iran.liara.site/media/library/1-hero.png",
    );
    expect(client.send).toHaveBeenCalledTimes(1);
    expect(client.sent[0]).toMatchObject({
      input: expect.objectContaining({
        Bucket: CONFIG.bucket,
        Key: "media/library/1-hero.png",
        ContentType: "image/png",
      }),
    });
  });

  it("appends a suffix when a colliding key is possible, and reports the stored key", async () => {
    const client = fakeClient();
    const stored = await providerWith(client).upload({
      key: "media/library/1-hero.png",
      bytes: new Uint8Array([1]).buffer,
      contentType: "image/png",
      addRandomSuffix: true,
    });

    expect(stored.key.startsWith("media/library/1-hero.png-")).toBe(true);
    expect(stored.key).not.toBe("media/library/1-hero.png");
  });

  it("refuses to upload when the credentials are absent", async () => {
    const provider = createLiaraStorage({
      config: () => {
        throw new StorageNotConfiguredError();
      },
      client: () => fakeClient() as never,
    });

    await expect(
      provider.upload({
        key: "media/a.png",
        bytes: new Uint8Array([1]).buffer,
        contentType: "image/png",
      }),
    ).rejects.toBeInstanceOf(StorageNotConfiguredError);
  });
});

describe("Liara delete", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes each object once, de-duplicating and skipping empties", async () => {
    const client = fakeClient();
    await providerWith(client).delete([
      "media/a.png",
      "media/a.png",
      "",
      "media/b.mp4",
    ]);

    expect(client.sent).toHaveLength(2);
    expect(
      client.sent.map((c) => (c as { input: { Key: string } }).input.Key),
    ).toEqual(["media/a.png", "media/b.mp4"]);
  });

  it("does nothing (and never touches the client) for an empty list", async () => {
    const client = fakeClient();
    await providerWith(client).delete([]);
    expect(client.send).not.toHaveBeenCalled();
  });
});

describe("Liara direct-upload authorization", () => {
  beforeEach(() => vi.clearAllMocks());

  it("mints a short-lived presigned PUT for the server-supplied key", async () => {
    const client = fakeClient();
    const result = (await providerWith(client).authorizeClientUpload!({
      body: { payload: { filename: "clip.mp4", size: 1024 } },
      request: new Request("https://example.com/api/admin/media/upload"),
      constraints: {
        key: "media/library/2-clip.mp4",
        allowedContentTypes: ["video/mp4"],
        maximumSizeInBytes: 200 * 1024 * 1024,
      },
    })) as Record<string, unknown>;

    expect(result).toMatchObject({
      provider: "liara",
      key: "media/library/2-clip.mp4",
      method: "PUT",
      contentType: "video/mp4",
    });
    expect(typeof result.url).toBe("string");
    expect(presignMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        input: expect.objectContaining({ Key: "media/library/2-clip.mp4" }),
      }),
      { expiresIn: LIARA_UPLOAD_URL_TTL_SECONDS },
    );
  });

  it("refuses a key outside the media/ namespace", async () => {
    const client = fakeClient();
    await expect(
      providerWith(client).authorizeClientUpload!({
        body: {},
        request: new Request("https://example.com"),
        constraints: {
          key: "admin/private.png",
          allowedContentTypes: ["image/png"],
          maximumSizeInBytes: 1024,
        },
      }),
    ).rejects.toThrow(/media\/ key prefix/);
    expect(presignMock).not.toHaveBeenCalled();
  });

  it("refuses an authorization above the 200 MB ceiling", async () => {
    const client = fakeClient();
    await expect(
      providerWith(client).authorizeClientUpload!({
        body: {},
        request: new Request("https://example.com"),
        constraints: {
          key: "media/library/big.mp4",
          allowedContentTypes: ["video/mp4"],
          maximumSizeInBytes: 200 * 1024 * 1024 + 1,
        },
      }),
    ).rejects.toThrow(/200 MB/);
    expect(presignMock).not.toHaveBeenCalled();
  });

  it("expires the authorization in five minutes", async () => {
    const client = fakeClient();
    const before = Date.now();
    const result = (await providerWith(client).authorizeClientUpload!({
      body: {},
      request: new Request("https://example.com"),
      constraints: {
        key: "media/library/a.png",
        allowedContentTypes: ["image/png"],
        maximumSizeInBytes: 1024,
      },
    })) as { expiresAt: number };

    expect(result.expiresAt).toBeGreaterThanOrEqual(
      before + LIARA_UPLOAD_URL_TTL_SECONDS * 1000,
    );
  });
});

describe("Liara upload verification", () => {
  beforeEach(() => vi.clearAllMocks());

  const verify = async (
    head: Record<string, unknown>,
    overrides: Record<string, unknown> = {},
  ) =>
    providerWith(fakeClient(head)).verifyClientUpload!({
      key: "media/library/1-clip.mp4",
      contentType: "video/mp4",
      maximumSizeInBytes: 200 * 1024 * 1024,
      reportedSize: 1024,
      ...overrides,
    } as never);

  it("accepts an object that exists with the authorized type and size", async () => {
    await expect(
      verify({ ContentLength: 1024, ContentType: "video/mp4" }),
    ).resolves.toEqual({
      key: "media/library/1-clip.mp4",
      url: "https://homeform-media.storage.iran.liara.site/media/library/1-clip.mp4",
      size: 1024,
      contentType: "video/mp4",
    });
  });

  it("refuses a missing/zero-length object", async () => {
    await expect(verify({ ContentType: "video/mp4" })).rejects.toThrow(
      /no reported size/i,
    );
    await expect(
      verify({ ContentLength: 0, ContentType: "video/mp4" }),
    ).rejects.toThrow(/no reported size/i);
  });

  it("refuses an object larger than the authorization", async () => {
    await expect(
      verify({
        ContentLength: 200 * 1024 * 1024 + 1,
        ContentType: "video/mp4",
      }),
    ).rejects.toThrow(/size limit/);
  });

  it("refuses when the stored size disagrees with the authorization", async () => {
    await expect(
      verify({ ContentLength: 2048, ContentType: "video/mp4" }),
    ).rejects.toThrow(/does not match the authorization/);
  });

  it("refuses when the stored content type is not the authorized one", async () => {
    await expect(
      verify({ ContentLength: 1024, ContentType: "application/octet-stream" }),
    ).rejects.toThrow(/content type does not match/);
  });
});
