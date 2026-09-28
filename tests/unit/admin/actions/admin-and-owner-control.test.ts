/**
 * Pass 11.5B — §2 (admin authorization) + §5 (direct server-action access):
 * the POSITIVE half of the boundary.
 *
 * Steps 1 and 2 of this pass already prove that an anonymous caller and a
 * plain `user` are denied on every admin action entry point. What they only
 * sample once (a single `destroyProductAction` control) is the other side of
 * the contract: that an `admin` session AND an `owner` session actually pass
 * the real `requireAdminAccess()` gate on the representative action families.
 *
 * Without this file a regression that tightened the gate to, say, "owner
 * only" would leave the whole denial suite green while locking every real
 * admin out of the dashboard.
 *
 * It also pins §5's hardest case — an ADMIN calling an owner-gated code path
 * directly. There is no owner-gated *server action* in the project yet (the
 * owner-only surface is better-auth's `/admin/impersonate-user`, covered
 * end-to-end in tests/integration/auth/roles.test.ts), so the direct-call
 * assertion here runs against the real `requireOwnerAccess()` helper — the
 * exact function an owner-gated action will call first. That proves the gate
 * itself rejects an admin regardless of how it is reached.
 *
 * Unit tier: hermetic — auth + next/* + repositories + result-server mocked;
 * permissions.ts and the access helpers imported for real.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.hoisted(() => vi.fn());
const headersMock = vi.hoisted(() => vi.fn());
const mockGetSession = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());
const toActionResultMock = vi.hoisted(() => vi.fn());

const repoMocks = vi.hoisted(() => ({
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
  createDesigner: vi.fn(),
  updateDesigner: vi.fn(),
  deleteDesigner: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  updateOrderFulfillmentStatus: vi.fn(),
  updateHomeCollectionFeature: vi.fn(),
  updateAboutPageSection: vi.fn(),
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
vi.mock("@/lib/repositories/products", () => ({
  createProduct: repoMocks.createProduct,
  updateProduct: repoMocks.updateProduct,
  deleteProduct: repoMocks.deleteProduct,
}));
vi.mock("@/lib/repositories/designers", () => ({
  createDesigner: repoMocks.createDesigner,
  updateDesigner: repoMocks.updateDesigner,
  deleteDesigner: repoMocks.deleteDesigner,
}));
vi.mock("@/lib/repositories/projects", () => ({
  createProject: repoMocks.createProject,
  updateProject: repoMocks.updateProject,
  deleteProject: repoMocks.deleteProject,
}));
vi.mock("@/lib/repositories/orders", () => ({
  updateOrderFulfillmentStatus: repoMocks.updateOrderFulfillmentStatus,
}));
vi.mock("@/lib/repositories/homepage-features", () => ({
  updateHomeCollectionFeature: repoMocks.updateHomeCollectionFeature,
}));
vi.mock("@/lib/repositories/about-page", () => ({
  updateAboutPageSection: repoMocks.updateAboutPageSection,
}));

import { requireOwnerAccess } from "@/lib/admin/access";
import {
  createProductAction,
  destroyProductAction,
} from "@/lib/admin/actions/products";
import { createDesignerAction } from "@/lib/admin/actions/designers";
import { createProjectAction } from "@/lib/admin/actions/projects";
import { updateOrderFulfillmentAction } from "@/lib/admin/actions/orders";
import { updateHomeCollectionFeatureAction } from "@/lib/admin/actions/homepage";
import { updateAboutPageSectionAction } from "@/lib/admin/actions/about";

const PAIR = { en: "Test", fa: "تست" };

const productInput = {
  slug: "valid-product",
  name: PAIR,
  hoverImage: "/images/hover.jpg",
  heroImage: "/images/hero.jpg",
  priceEur: 10,
  priceToman: 500_000,
  existsInStore: true,
  quantity: 1,
  description: PAIR,
  moreInfo: null,
  downloads: [],
  related: [],
  sortOrder: 0,
  categoryId: "lighting",
  designerId: null,
  images: [],
};

const designerInput = {
  slug: "some-designer",
  name: PAIR,
  image: "/images/designer.jpg",
  website: null,
  bio: [],
  sortOrder: 0,
};

const projectInput = {
  slug: "some-project",
  i18nKey: "projects.some",
  name: PAIR,
  location: "Somewhere",
  year: "2026",
  image: "/images/project.jpg",
  description: PAIR,
  paragraph: PAIR,
  moreDescription: [],
  credits: [],
  portfolioImages: [],
  sortOrder: 0,
  productIds: [],
};

const homeCollectionInput = {
  enabled: true,
  image: "/images/collection.jpg",
  title: PAIR,
  text: PAIR,
};

const aboutSectionInput = {
  firstLine: PAIR,
  secondLine: PAIR,
};

describe("admin authorization — positive controls (ADMIN and OWNER pass)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headersMock.mockResolvedValue(new Headers());
    redirectMock.mockImplementation(((url: string) => {
      const error = new Error(`NEXT_REDIRECT:${url}`) as Error & {
        digest: string;
      };
      error.digest = `NEXT_REDIRECT;replace;${url};307;`;
      throw error;
    }) as never);
    for (const fn of Object.values(repoMocks)) fn.mockResolvedValue(undefined);
    repoMocks.createProduct.mockResolvedValue("new-id");
    repoMocks.createDesigner.mockResolvedValue("new-id");
    repoMocks.createProject.mockResolvedValue("new-id");
  });

  /** Runs the representative action set and asserts every call was allowed. */
  async function expectAllAllowed() {
    await expect(createProductAction(productInput as never)).resolves.toEqual({
      ok: true,
      data: "new-id",
    });
    await expect(destroyProductAction("x")).resolves.toEqual({
      ok: true,
      data: undefined,
    });
    await expect(createDesignerAction(designerInput)).resolves.toEqual({
      ok: true,
      data: "new-id",
    });
    await expect(createProjectAction(projectInput as never)).resolves.toEqual({
      ok: true,
      data: "new-id",
    });
    await expect(
      updateOrderFulfillmentAction({
        id: "some-order",
        fulfillmentStatus: "shipped",
      }),
    ).resolves.toEqual({ ok: true, data: undefined });
    await expect(
      updateHomeCollectionFeatureAction(homeCollectionInput as never),
    ).resolves.toEqual({ ok: true, data: undefined });
    await expect(
      updateAboutPageSectionAction("heroSection", aboutSectionInput),
    ).resolves.toEqual({ ok: true, data: undefined });

    // An allowed call must never redirect and must reach the repository.
    expect(redirectMock).not.toHaveBeenCalled();
    expect(repoMocks.createProduct.mock.calls).toHaveLength(1);
    expect(repoMocks.deleteProduct.mock.calls).toHaveLength(1);
    expect(repoMocks.createDesigner.mock.calls).toHaveLength(1);
    expect(repoMocks.createProject.mock.calls).toHaveLength(1);
    expect(repoMocks.updateOrderFulfillmentStatus.mock.calls).toHaveLength(1);
    expect(repoMocks.updateHomeCollectionFeature.mock.calls).toHaveLength(1);
    expect(repoMocks.updateAboutPageSection.mock.calls).toHaveLength(1);
  }

  it("an ADMIN session passes requireAdminAccess on every representative action", async () => {
    mockGetSession.mockResolvedValue({ user: { role: "admin" } });
    await expectAllAllowed();
  });

  it("an OWNER session passes requireAdminAccess on every representative action", async () => {
    mockGetSession.mockResolvedValue({ user: { role: "owner" } });
    await expectAllAllowed();
  });

  it("admin mutations actually revalidate the affected routes (gate is not a no-op)", async () => {
    mockGetSession.mockResolvedValue({ user: { role: "admin" } });
    await destroyProductAction("x");
    expect(revalidatePathMock).toHaveBeenCalled();
    expect(refreshMock).toHaveBeenCalled();
  });
});

describe("direct access to an owner-gated code path (§5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headersMock.mockResolvedValue(new Headers());
    redirectMock.mockImplementation(((url: string) => {
      const error = new Error(`NEXT_REDIRECT:${url}`) as Error & {
        digest: string;
      };
      error.digest = `NEXT_REDIRECT;replace;${url};307;`;
      throw error;
    }) as never);
  });

  it("an ADMIN calling the owner gate directly is denied (bounced to /admin)", async () => {
    mockGetSession.mockResolvedValue({ user: { role: "admin" } });
    await expect(requireOwnerAccess()).rejects.toThrow("NEXT_REDIRECT:/admin");
    // Not the sign-in page: the admin IS authenticated, just not owner-rank.
    expect(redirectMock).toHaveBeenCalledWith("/admin");
  });

  it("an OWNER calling the owner gate directly passes", async () => {
    mockGetSession.mockResolvedValue({ user: { role: "owner" } });
    await expect(requireOwnerAccess()).resolves.toBe("owner");
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
