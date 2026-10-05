/**
 * Store access-mode contract (Pass 3 — media upload fix).
 *
 * WHY THIS FILE EXISTS. Every upload failed because the Blob store was
 * provisioned PRIVATE while the app wrote with a hardcoded `public`, and the
 * provider rejected the write with a bare 400 that surfaced to the admin as
 * the generic "something went wrong". These tests pin the two things that
 * prevent a repeat:
 *
 *   1. the access mode is ONE shared value (not a literal copied per file), and
 *   2. a visibility refusal is recognised and surfaced as its own error/code
 *      instead of being flattened into a transport failure.
 *
 * Hermetic: `@vercel/blob` is mocked, so nothing here reaches the network.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const putMock = vi.hoisted(() => vi.fn());
const delMock = vi.hoisted(() => vi.fn());
const handleUploadMock = vi.hoisted(() => vi.fn());
const clientUploadMock = vi.hoisted(() => vi.fn());

vi.mock("@vercel/blob", () => ({ put: putMock, del: delMock }));
vi.mock("@vercel/blob/client", () => ({
  handleUpload: handleUploadMock,
  upload: clientUploadMock,
}));

import { BLOB_ACCESS } from "@/lib/media/limits";
import { vercelBlobStorage } from "@/lib/media/storage/vercel-blob";
import { uploadDirectToStorage } from "@/lib/media/storage/client";
import { StorageAccessMismatchError } from "@/lib/media/types";

const TOKEN = "vercel_blob_rw_storeid_randomrandomrandomrandomrandomrandomr";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.BLOB_READ_WRITE_TOKEN = TOKEN;
});

describe("the shared access mode", () => {
  it("is exactly \"public\" — what next.config.ts whitelists for <Image>", () => {
    // If this changes, the image remotePatterns and every stored URL consumer
    // must change with it, so the value is asserted rather than assumed.
    expect(BLOB_ACCESS).toBe("public");
  });

  it("is the value the server write sends to the provider", async () => {
    putMock.mockResolvedValue({
      pathname: "media/library/x.png-abc",
      url: "https://store.public.blob.vercel-storage.com/media/library/x.png-abc",
    });

    await vercelBlobStorage.upload({
      key: "media/library/x.png",
      bytes: new ArrayBuffer(8),
      contentType: "image/png",
    });

    expect(putMock).toHaveBeenCalledWith(
      "media/library/x.png",
      expect.anything(),
      expect.objectContaining({ access: BLOB_ACCESS, token: TOKEN }),
    );
  });
});

describe("a store/visibility refusal", () => {
  it("is re-thrown as StorageAccessMismatchError, not a raw provider error", async () => {
    putMock.mockRejectedValue(
      new Error(
        "Vercel Blob: Cannot use public access on a private store. The store is configured with private access.",
      ),
    );

    await expect(
      vercelBlobStorage.upload({
        key: "media/library/x.png",
        bytes: new ArrayBuffer(8),
        contentType: "image/png",
      }),
    ).rejects.toBeInstanceOf(StorageAccessMismatchError);
  });

  it("carries the access the app expected and the store's own message", async () => {
    putMock.mockRejectedValue(
      new Error("Cannot use public access on a private store."),
    );

    await expect(
      vercelBlobStorage.upload({
        key: "media/library/x.png",
        bytes: new ArrayBuffer(8),
        contentType: "image/png",
      }),
    ).rejects.toMatchObject({
      expectedAccess: "public",
      storeMessage: expect.stringContaining("private store"),
    });
  });

  it("leaves an ordinary transport failure untouched", async () => {
    const transport = new Error("ECONNRESET");
    putMock.mockRejectedValue(transport);

    // A network blip must NOT be mislabelled as a config fault.
    await expect(
      vercelBlobStorage.upload({
        key: "media/library/x.png",
        bytes: new ArrayBuffer(8),
        contentType: "image/png",
      }),
    ).rejects.toBe(transport);
  });

  it("still refuses to write when no token is configured", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;

    await expect(
      vercelBlobStorage.upload({
        key: "media/library/x.png",
        bytes: new ArrayBuffer(8),
        contentType: "image/png",
      }),
    ).rejects.toMatchObject({ name: "StorageNotConfiguredError" });
    expect(putMock).not.toHaveBeenCalled();
  });
});

describe("the direct-upload token mint", () => {
  it("passes the shared access mode into onBeforeGenerateToken", async () => {
    handleUploadMock.mockImplementation(async (options: {
      onBeforeGenerateToken: () => Promise<Record<string, unknown>>;
    }) => {
      const payload = await options.onBeforeGenerateToken();
      return { type: "blob.generate-client-token", ok: true, payload };
    });

    await vercelBlobStorage.authorizeClientUpload!({
      body: { type: "blob.generate-client-token", payload: { pathname: "media/x.png" } },
      request: new Request("https://example.com/api/admin/media/upload"),
      constraints: {
        key: "media/x.png",
        allowedContentTypes: ["image/png"],
        maximumSizeInBytes: 5 * 1024 * 1024,
      },
    });

    const passed = handleUploadMock.mock.calls[0][0];
    // The callback must bake the SAME access mode the browser will write with,
    // so the minted token and the PUT cannot disagree.
    const resolved = await passed.onBeforeGenerateToken("media/x.png", null, false);
    expect(resolved.access).toBe(BLOB_ACCESS);
  });
});

describe("the browser-side direct upload", () => {
  const file = new File([new Uint8Array([1, 2, 3])], "clip.mp4", {
    type: "video/mp4",
  });

  it("writes with the same shared access mode as the server", async () => {
    clientUploadMock.mockResolvedValue({
      url: "https://store.public.blob.vercel-storage.com/media/library/clip.mp4",
      pathname: "media/library/clip.mp4",
      contentType: "video/mp4",
    });

    await uploadDirectToStorage({ key: "media/library/clip.mp4", file });

    expect(clientUploadMock).toHaveBeenCalledWith(
      "media/library/clip.mp4",
      file,
      expect.objectContaining({ access: BLOB_ACCESS }),
    );
  });

  it("surfaces a store/visibility refusal as an actionable reason", async () => {
    // The provider's own message when the WRITE is refused on the wire.
    clientUploadMock.mockRejectedValue(
      new Error("Vercel Blob: Cannot use public access on a private store."),
    );

    await expect(
      uploadDirectToStorage({ key: "media/library/clip.mp4", file }),
    ).rejects.toMatchObject({ name: "DirectUploadError", reason: "access_mismatch" });
  });

  it("treats a swallowed token-mint failure as a store fault, not a silent unknown", async () => {
    // The SDK loses the response body here, so the mint failure is the only
    // signal — it must still map to the actionable reason rather than collapse
    // to "unknown".
    clientUploadMock.mockRejectedValue(
      new Error("Vercel Blob: Failed to  retrieve the client token"),
    );

    await expect(
      uploadDirectToStorage({ key: "media/library/clip.mp4", file }),
    ).rejects.toMatchObject({ reason: "access_mismatch" });
  });

  it("keeps an unrelated failure classified as unknown", async () => {
    clientUploadMock.mockRejectedValue(new Error("network unreachable"));

    await expect(
      uploadDirectToStorage({ key: "media/library/clip.mp4", file }),
    ).rejects.toMatchObject({ reason: "unknown" });
  });
});
