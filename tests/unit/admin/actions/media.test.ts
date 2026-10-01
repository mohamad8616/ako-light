/**
 * Pass 13.5 Step 9 — authorization for the media server actions
 * (lib/admin/actions/media.ts).
 *
 * Server functions are reachable by direct POST, so the client form is never
 * the authorization: `requireAdminAccess()` must be the FIRST statement of every
 * action. These tests call the actions directly with a forged role and assert
 * that a non-admin is rejected BEFORE any service or storage work happens.
 *
 * Hermetic: auth, next/*, the result mapper and the media service are mocked.
 * The suite therefore never touches the database, the session store or Vercel
 * Blob. (The permission matrix itself is pinned in
 * tests/unit/admin/access-owner-boundary.test.ts.)
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.hoisted(() => vi.fn());
const headersMock = vi.hoisted(() => vi.fn());
const mockGetSession = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());
const toActionResultMock = vi.hoisted(() => vi.fn());

const service = vi.hoisted(() => ({
  uploadMedia: vi.fn(),
  updateMediaInfo: vi.fn(),
  removeMedia: vi.fn(),
}));

vi.mock("@/lib/auth/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));
vi.mock("next/headers", () => ({ headers: headersMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
  refresh: refreshMock,
}));
vi.mock("@/lib/admin/result-server", () => ({
  toActionResult: toActionResultMock,
}));

/**
 * The service is stubbed but its `MediaError` class is REAL, so the action's
 * `instanceof` mapping is genuinely exercised rather than assumed.
 */
vi.mock("@/lib/media/service", () => {
  class MediaError extends Error {
    constructor(public code: string) {
      super(code);
      this.name = "MediaError";
    }
  }
  return {
    MediaError,
    uploadMedia: service.uploadMedia,
    updateMediaInfo: service.updateMediaInfo,
    removeMedia: service.removeMedia,
    getMedia: vi.fn(),
    getMediaByStorageKey: vi.fn(),
    countMedia: vi.fn(),
    listMedia: vi.fn(),
    DEFAULT_MEDIA_PAGE_SIZE: 50,
  };
});

import {
  destroyMediaAction,
  updateMediaMetadataAction,
  uploadMediaAction,
} from "@/lib/admin/actions/media";
import type { AdminErrorCode } from "@/lib/admin/result";
import { MediaError, type MediaErrorCode } from "@/lib/media/service";

const DENIED_URL = "/sign-in?denied=1";
const STORED_URL = "https://store.public.blob.vercel-storage.com/media/products/1-a.png";

/** A FormData carrying a plausible image upload. */
function imageForm(name = "hero.png"): FormData {
  const form = new FormData();
  form.set(
    "file",
    new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], name, {
      type: "image/png",
    }),
  );
  return form;
}

describe("media actions — authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headersMock.mockResolvedValue(new Headers());
    // Mirror the real helper: deny by throwing the framework's redirect signal.
    redirectMock.mockImplementation(((url: string) => {
      const error = new Error(`NEXT_REDIRECT:${url}`) as Error & { digest: string };
      error.digest = `NEXT_REDIRECT;replace;${url};307;`;
      throw error;
    }) as never);
    service.uploadMedia.mockResolvedValue({ id: "m1", url: STORED_URL });
    service.updateMediaInfo.mockResolvedValue({ id: "m1" });
    service.removeMedia.mockResolvedValue(undefined);
  });

  /** Sign in as `role`, or as nobody when null. */
  function asRole(role: string | null) {
    mockGetSession.mockResolvedValue(role ? { user: { role } } : null);
  }

  it("a plain USER cannot upload", async () => {
    asRole("user");

    await expect(uploadMediaAction(imageForm())).rejects.toThrow(
      `NEXT_REDIRECT:${DENIED_URL}`,
    );
    expect(redirectMock).toHaveBeenCalledWith(DENIED_URL);
    expect(service.uploadMedia).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("a plain USER cannot update metadata or delete", async () => {
    asRole("user");

    await expect(
      updateMediaMetadataAction("m1", { alt: "x", title: null }),
    ).rejects.toThrow(`NEXT_REDIRECT:${DENIED_URL}`);
    await expect(destroyMediaAction("m1")).rejects.toThrow(
      `NEXT_REDIRECT:${DENIED_URL}`,
    );

    expect(service.updateMediaInfo).not.toHaveBeenCalled();
    expect(service.removeMedia).not.toHaveBeenCalled();
  });

  it("no session at all cannot upload", async () => {
    asRole(null);

    await expect(uploadMediaAction(imageForm())).rejects.toThrow(
      `NEXT_REDIRECT:${DENIED_URL}`,
    );
    expect(service.uploadMedia).not.toHaveBeenCalled();
  });

  it("an ADMIN can upload, update metadata and delete", async () => {
    asRole("admin");

    await expect(uploadMediaAction(imageForm())).resolves.toEqual({
      ok: true,
      data: { id: "m1", url: STORED_URL },
    });
    await expect(
      updateMediaMetadataAction("m1", { alt: "A chair", title: null }),
    ).resolves.toEqual({ ok: true, data: undefined });
    await expect(destroyMediaAction("m1")).resolves.toEqual({
      ok: true,
      data: undefined,
    });

    expect(service.uploadMedia).toHaveBeenCalledTimes(1);
    expect(service.updateMediaInfo).toHaveBeenCalledTimes(1);
    expect(service.removeMedia).toHaveBeenCalledTimes(1);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("an OWNER can perform every media operation", async () => {
    asRole("owner");

    await expect(uploadMediaAction(imageForm())).resolves.toMatchObject({ ok: true });
    await expect(
      updateMediaMetadataAction("m1", { alt: null, title: null }),
    ).resolves.toMatchObject({ ok: true });
    await expect(destroyMediaAction("m1")).resolves.toMatchObject({ ok: true });

    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("expires the media section on success", async () => {
    asRole("admin");

    await uploadMediaAction(imageForm());

    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/[locale]/(admin)/admin/media",
      "page",
    );
    expect(refreshMock).toHaveBeenCalled();
  });
});

describe("media actions — input validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headersMock.mockResolvedValue(new Headers());
    mockGetSession.mockResolvedValue({ user: { role: "admin" } });
    service.uploadMedia.mockResolvedValue({ id: "m1", url: STORED_URL });
    service.updateMediaInfo.mockResolvedValue({ id: "m1" });
    service.removeMedia.mockResolvedValue(undefined);
  });

  it("requires a file", async () => {
    await expect(uploadMediaAction(new FormData())).resolves.toEqual({
      ok: false,
      formError: "required",
      issues: [],
    });
    expect(service.uploadMedia).not.toHaveBeenCalled();
  });

  it("rejects an over-long metadata field via the shared schema", async () => {
    const result = await updateMediaMetadataAction("m1", {
      alt: "a".repeat(2001),
      title: null,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.formError).toBe("invalid");
      expect(result.issues).toEqual([{ field: "alt", code: "tooLong" }]);
    }
    expect(service.updateMediaInfo).not.toHaveBeenCalled();
  });

  it("rejects a missing metadata field (a malformed request, not a partial update)", async () => {
    const result = await updateMediaMetadataAction("m1", {} as never);
    expect(result.ok).toBe(false);
    expect(service.updateMediaInfo).not.toHaveBeenCalled();
  });

  it("normalises a blank field to null before it reaches the service", async () => {
    await updateMediaMetadataAction("m1", { alt: "", title: "Hero" });
    expect(service.updateMediaInfo).toHaveBeenLastCalledWith("m1", {
      alt: null,
      title: "Hero",
    });
  });

  it("carries alt/title from the upload form through to the service", async () => {
    const form = imageForm();
    form.set("alt", "A chair");
    form.set("title", "Hero");

    await uploadMediaAction(form);

    expect(service.uploadMedia).toHaveBeenCalledWith(
      expect.objectContaining({ alt: "A chair", title: "Hero", folder: undefined }),
    );
  });
});

describe("media actions — error mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headersMock.mockResolvedValue(new Headers());
    mockGetSession.mockResolvedValue({ user: { role: "admin" } });
  });

  it("maps MediaError codes onto the admin result contract", async () => {
    const cases: [MediaErrorCode, AdminErrorCode][] = [
      // The four with a dictionary entry of their own.
      ["required", "required"],
      ["tooLarge", "tooLarge"],
      ["notImage", "notImage"],
      ["notFound", "notFound"],
      // The storage codes deliberately collapse to the generic failure: the real
      // cause is only actionable server-side.
      ["storageFailed", "unknown"],
      ["storageNotConfigured", "unknown"],
    ];

    for (const [mediaCode, adminCode] of cases) {
      service.uploadMedia.mockRejectedValueOnce(new MediaError(mediaCode));
      await expect(uploadMediaAction(imageForm()), mediaCode).resolves.toEqual({
        ok: false,
        formError: adminCode,
        issues: [],
      });
    }
  });

  it("falls through to the shared Prisma mapping for a non-MediaError", async () => {
    const dbError = new Error("P2002");
    service.removeMedia.mockRejectedValueOnce(dbError);
    toActionResultMock.mockReturnValueOnce({
      ok: false,
      formError: "slugTaken",
      issues: [],
    });

    await expect(destroyMediaAction("m1")).resolves.toEqual({
      ok: false,
      formError: "slugTaken",
      issues: [],
    });
    expect(toActionResultMock).toHaveBeenCalledWith(dbError);
  });
});
