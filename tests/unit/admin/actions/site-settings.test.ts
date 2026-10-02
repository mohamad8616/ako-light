/**
 * Pass 13.5D — site-settings validation and action authorization.
 *
 * Hermetic: auth, next/*, the repository and Prisma are mocked, so the suite
 * never touches the database. The permission matrix itself is pinned in
 * tests/unit/admin/access-owner-boundary.test.ts.
 *
 * Two contracts are checked here:
 *   - every mutation is ADMIN/OWNER only, enforced INSIDE the action (a server
 *     action is reachable by direct POST, so the client form is never the
 *     authorization);
 *   - the input rules reject what the plan says they must (bad URLs, unknown
 *     platforms, oversized text) and normalise blank contact fields to null.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.hoisted(() => vi.fn());
const headersMock = vi.hoisted(() => vi.fn());
const mockGetSession = vi.hoisted(() => vi.fn());
const toActionResultMock = vi.hoisted(() => vi.fn());
const mediaFindUnique = vi.hoisted(() => vi.fn());

const repo = vi.hoisted(() => ({
  upsertSiteSettings: vi.fn(),
  createSocialLink: vi.fn(),
  updateSocialLink: vi.fn(),
  deleteSocialLink: vi.fn(),
  reorderSocialLinks: vi.fn(),
  getSiteSettings: vi.fn(),
  getActiveSocialLinks: vi.fn(),
  getSocialLinks: vi.fn(),
  SITE_SETTINGS_ID: "singleton",
}));

vi.mock("@/lib/auth/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));
vi.mock("next/headers", () => ({ headers: headersMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  refresh: vi.fn(),
  updateTag: vi.fn(),
}));
vi.mock("@/lib/admin/result-server", () => ({
  toActionResult: toActionResultMock,
}));
vi.mock("@/lib/repositories/site-settings", () => repo);
vi.mock("@/lib/db/prisma", () => ({
  prisma: { media: { findUnique: mediaFindUnique } },
}));

import {
  createSocialLinkAction,
  destroySocialLinkAction,
  reorderSocialLinksAction,
  updateSiteSettingsAction,
  updateSocialLinkAction,
} from "@/lib/admin/actions/site-settings";
import { siteSettingsFormSchema } from "@/lib/admin/schemas/site-settings";

const DENIED_URL = "/sign-in?denied=1";

const validSettings = {
  siteName: { en: "Home Form", fa: "هوم فرم" },
  siteDescription: { en: "Lighting", fa: "روشنایی" },
  logoMediaId: null,
  faviconMediaId: null,
  phone: null,
  email: null,
  address: null,
};

const validLink = {
  platform: "instagram",
  label: "Instagram",
  url: "https://instagram.com/example",
  sortOrder: 0,
  isActive: true,
};

function asRole(role: string | null) {
  mockGetSession.mockResolvedValue(role ? { user: { role } } : null);
}

beforeEach(() => {
  vi.clearAllMocks();
  headersMock.mockResolvedValue(new Headers());
  redirectMock.mockImplementation(((url: string) => {
    const error = new Error(`NEXT_REDIRECT:${url}`) as Error & { digest: string };
    error.digest = `NEXT_REDIRECT;replace;${url};307;`;
    throw error;
  }) as never);
  repo.upsertSiteSettings.mockResolvedValue({ id: "singleton" });
  repo.createSocialLink.mockResolvedValue({ id: "s1" });
  repo.updateSocialLink.mockResolvedValue({ id: "s1" });
  repo.deleteSocialLink.mockResolvedValue(undefined);
  repo.reorderSocialLinks.mockResolvedValue(undefined);
  mediaFindUnique.mockResolvedValue({ id: "m1" });
});

describe("site settings — authorization", () => {
  it("a plain USER cannot update settings or touch social links", async () => {
    asRole("user");

    await expect(updateSiteSettingsAction(validSettings)).rejects.toThrow(
      `NEXT_REDIRECT:${DENIED_URL}`,
    );
    await expect(createSocialLinkAction(validLink)).rejects.toThrow(
      `NEXT_REDIRECT:${DENIED_URL}`,
    );
    await expect(updateSocialLinkAction("s1", { label: "x" })).rejects.toThrow(
      `NEXT_REDIRECT:${DENIED_URL}`,
    );
    await expect(destroySocialLinkAction("s1")).rejects.toThrow(
      `NEXT_REDIRECT:${DENIED_URL}`,
    );
    await expect(reorderSocialLinksAction(["s1"])).rejects.toThrow(
      `NEXT_REDIRECT:${DENIED_URL}`,
    );

    expect(repo.upsertSiteSettings).not.toHaveBeenCalled();
    expect(repo.createSocialLink).not.toHaveBeenCalled();
    expect(repo.updateSocialLink).not.toHaveBeenCalled();
    expect(repo.deleteSocialLink).not.toHaveBeenCalled();
    expect(repo.reorderSocialLinks).not.toHaveBeenCalled();
  });

  it("no session at all cannot update settings", async () => {
    asRole(null);

    await expect(updateSiteSettingsAction(validSettings)).rejects.toThrow(
      `NEXT_REDIRECT:${DENIED_URL}`,
    );
    expect(repo.upsertSiteSettings).not.toHaveBeenCalled();
  });

  it("an ADMIN can perform every settings operation", async () => {
    asRole("admin");

    await expect(updateSiteSettingsAction(validSettings)).resolves.toEqual({
      ok: true,
      data: undefined,
    });
    await expect(createSocialLinkAction(validLink)).resolves.toEqual({
      ok: true,
      data: "s1",
    });
    await expect(updateSocialLinkAction("s1", { label: "IG" })).resolves.toEqual({
      ok: true,
      data: undefined,
    });
    await expect(destroySocialLinkAction("s1")).resolves.toEqual({
      ok: true,
      data: undefined,
    });
    await expect(reorderSocialLinksAction(["s1"])).resolves.toEqual({
      ok: true,
      data: undefined,
    });

    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("an OWNER can perform every settings operation", async () => {
    asRole("owner");

    await expect(updateSiteSettingsAction(validSettings)).resolves.toMatchObject({
      ok: true,
    });
    await expect(createSocialLinkAction(validLink)).resolves.toMatchObject({
      ok: true,
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe("site settings — media reference verification", () => {
  beforeEach(() => asRole("admin"));

  it("rejects a logo id that does not resolve to a Media row", async () => {
    mediaFindUnique.mockResolvedValue(null);

    const result = await updateSiteSettingsAction({
      ...validSettings,
      logoMediaId: "ghost",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual({
        field: "logoMediaId",
        code: "notFound",
      });
    }
    // A forged or stale id must never be persisted.
    expect(repo.upsertSiteSettings).not.toHaveBeenCalled();
  });

  it("accepts a verified logo id and persists the RELATIONSHIP", async () => {
    await updateSiteSettingsAction({ ...validSettings, logoMediaId: "m1" });

    expect(repo.upsertSiteSettings).toHaveBeenCalledWith(
      expect.objectContaining({ logoMediaId: "m1" }),
    );
  });

  it("does not query Media when no brand asset is selected", async () => {
    await updateSiteSettingsAction(validSettings);

    expect(mediaFindUnique).not.toHaveBeenCalled();
  });
});

describe("site settings — input validation", () => {
  beforeEach(() => asRole("admin"));

  it("normalises blank contact fields to null", async () => {
    await updateSiteSettingsAction({
      ...validSettings,
      phone: "",
      email: "",
    });

    expect(repo.upsertSiteSettings).toHaveBeenCalledWith(
      expect.objectContaining({ phone: null, email: null }),
    );
  });

  it("rejects a malformed social URL", async () => {
    const result = await createSocialLinkAction({
      ...validLink,
      url: "not a url",
    });

    expect(result.ok).toBe(false);
    expect(repo.createSocialLink).not.toHaveBeenCalled();
  });

  it("rejects an unknown platform SHAPE but allows a new platform value", async () => {
    // A brand-new platform is legitimate (the plan requires adding platforms
    // without a code change)…
    await expect(
      createSocialLinkAction({ ...validLink, platform: "mastodon" }),
    ).resolves.toMatchObject({ ok: true });

    // …but the key must still be a usable slug, not free prose.
    const result = await createSocialLinkAction({
      ...validLink,
      platform: "Not A Slug!",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a reorder payload that is not a list of ids", async () => {
    const result = await reorderSocialLinksAction(["ok", ""]);

    expect(result.ok).toBe(false);
    expect(repo.reorderSocialLinks).not.toHaveBeenCalled();
  });
});

describe("siteSettingsFormSchema — pure rules", () => {
  it("accepts a fully-populated payload", () => {
    expect(
      siteSettingsFormSchema.safeParse({
        ...validSettings,
        phone: "+989120000000",
        email: "hi@example.com",
        address: { en: "Tehran", fa: "تهران" },
      }).success,
    ).toBe(true);
  });

  it("collapses blank strings to null rather than persisting ''", () => {
    const parsed = siteSettingsFormSchema.parse({
      ...validSettings,
      phone: "",
      email: "",
      address: null,
    });

    expect(parsed.phone).toBeNull();
    expect(parsed.email).toBeNull();
  });

  it("requires both locales for the site name", () => {
    expect(
      siteSettingsFormSchema.safeParse({
        ...validSettings,
        siteName: { en: "Home Form", fa: "" },
      }).success,
    ).toBe(false);
  });
});
