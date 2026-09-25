/**
 * Step 2 — IDOR / direct server-action access with NO session at all.
 *
 * Simulates a raw unauthenticated POST to a server action's endpoint: the
 * SAME 32 admin action entry points as Step 1 (9 entities x
 * create/update/delete + 5 homepage singleton updates), called directly with
 * `auth.api.getSession()` resolving to null. Proves each call is rejected by
 * the real `requireAdminAccess()` via redirect("/sign-in?denied=1") and that
 * no repository write and no revalidation is touched.
 *
 * Unit tier: fully hermetic — auth, next/*, repositories, result-server all
 * mocked; no database connection needed.
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
  createProductCategory: vi.fn(),
  updateProductCategory: vi.fn(),
  deleteProductCategory: vi.fn(),
  createDesigner: vi.fn(),
  updateDesigner: vi.fn(),
  deleteDesigner: vi.fn(),
  createCollection: vi.fn(),
  updateCollection: vi.fn(),
  deleteCollection: vi.fn(),
  createMaterial: vi.fn(),
  updateMaterial: vi.fn(),
  deleteMaterial: vi.fn(),
  createFlagship: vi.fn(),
  updateFlagship: vi.fn(),
  deleteFlagship: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  createFabricItem: vi.fn(),
  updateFabricItem: vi.fn(),
  deleteFabricItem: vi.fn(),
  createCatalogueItem: vi.fn(),
  updateCatalogueItem: vi.fn(),
  deleteCatalogueItem: vi.fn(),
  updateFlagshipOneFeature: vi.fn(),
  updateProjectBannerFeature: vi.fn(),
  updateProjectDarkBackgroundFeature: vi.fn(),
  updateHomeCollectionFeature: vi.fn(),
  updateCatalogueFeature: vi.fn(),
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
vi.mock("@/lib/repositories/product-categories", () => ({
  createProductCategory: repoMocks.createProductCategory,
  updateProductCategory: repoMocks.updateProductCategory,
  deleteProductCategory: repoMocks.deleteProductCategory,
}));
vi.mock("@/lib/repositories/designers", () => ({
  createDesigner: repoMocks.createDesigner,
  updateDesigner: repoMocks.updateDesigner,
  deleteDesigner: repoMocks.deleteDesigner,
}));
vi.mock("@/lib/repositories/collections", () => ({
  createCollection: repoMocks.createCollection,
  updateCollection: repoMocks.updateCollection,
  deleteCollection: repoMocks.deleteCollection,
}));
vi.mock("@/lib/repositories/materials", () => ({
  createMaterial: repoMocks.createMaterial,
  updateMaterial: repoMocks.updateMaterial,
  deleteMaterial: repoMocks.deleteMaterial,
}));
vi.mock("@/lib/repositories/flagships", () => ({
  createFlagship: repoMocks.createFlagship,
  updateFlagship: repoMocks.updateFlagship,
  deleteFlagship: repoMocks.deleteFlagship,
}));
vi.mock("@/lib/repositories/projects", () => ({
  createProject: repoMocks.createProject,
  updateProject: repoMocks.updateProject,
  deleteProject: repoMocks.deleteProject,
}));
vi.mock("@/lib/repositories/fabrics", () => ({
  createFabricItem: repoMocks.createFabricItem,
  updateFabricItem: repoMocks.updateFabricItem,
  deleteFabricItem: repoMocks.deleteFabricItem,
}));
vi.mock("@/lib/repositories/catalogue", () => ({
  createCatalogueItem: repoMocks.createCatalogueItem,
  updateCatalogueItem: repoMocks.updateCatalogueItem,
  deleteCatalogueItem: repoMocks.deleteCatalogueItem,
}));
vi.mock("@/lib/repositories/homepage-features", () => ({
  updateFlagshipOneFeature: repoMocks.updateFlagshipOneFeature,
  updateProjectBannerFeature: repoMocks.updateProjectBannerFeature,
  updateProjectDarkBackgroundFeature:
    repoMocks.updateProjectDarkBackgroundFeature,
  updateHomeCollectionFeature: repoMocks.updateHomeCollectionFeature,
  updateCatalogueFeature: repoMocks.updateCatalogueFeature,
}));

import {
  createProductAction,
  destroyProductAction,
  updateProductAction,
} from "@/lib/admin/actions/products";
import {
  createProductCategoryAction,
  destroyProductCategoryAction,
  updateProductCategoryAction,
} from "@/lib/admin/actions/product-categories";
import {
  createDesignerAction,
  destroyDesignerAction,
  updateDesignerAction,
} from "@/lib/admin/actions/designers";
import {
  createCollectionAction,
  destroyCollectionAction,
  updateCollectionAction,
} from "@/lib/admin/actions/collections";
import {
  createMaterialAction,
  destroyMaterialAction,
  updateMaterialAction,
} from "@/lib/admin/actions/materials";
import {
  createFlagshipAction,
  destroyFlagshipAction,
  updateFlagshipAction,
} from "@/lib/admin/actions/flagships";
import {
  createProjectAction,
  destroyProjectAction,
  updateProjectAction,
} from "@/lib/admin/actions/projects";
import {
  createFabricAction,
  destroyFabricAction,
  updateFabricAction,
} from "@/lib/admin/actions/fabrics";
import {
  createCatalogueAction,
  destroyCatalogueAction,
  updateCatalogueAction,
} from "@/lib/admin/actions/catalogue";
import {
  updateCatalogueFeatureAction,
  updateFlagshipOneFeatureAction,
  updateHomeCollectionFeatureAction,
  updateProjectBannerFeatureAction,
  updateProjectDarkBackgroundFeatureAction,
} from "@/lib/admin/actions/homepage";

const PAIR = { en: "Test", fa: "تست" };

const productInput = {
  slug: "valid-product",
  name: PAIR,
  hoverImage: "/images/hover.jpg",
  heroImage: "/images/hero.jpg",
  price: 10,
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

const productCategoryInput = {
  slug: "lighting",
  i18nKey: "products.lighting",
  name: PAIR,
  sortOrder: 0,
};

const designerInput = {
  slug: "some-designer",
  name: PAIR,
  image: "/images/designer.jpg",
  website: null,
  bio: [],
  sortOrder: 0,
};

const collectionInput = {
  slug: "some-collection",
  name: PAIR,
  year: "2026",
  image: "/images/collection.jpg",
  description: { p1: PAIR, p2: PAIR, p3: PAIR },
  sortOrder: 0,
};

const materialInput = {
  slug: "some-material",
  name: PAIR,
  category: "Stone",
  type: "stone",
  image: "/images/material.jpg",
  description: PAIR,
  sortOrder: 0,
};

const flagshipInput = {
  slug: "some-flagship",
  name: PAIR,
  city: PAIR,
  image: "/images/flagship.jpg",
  detail: null,
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

const fabricInput = {
  id: "some-fabric",
  name: "Some Fabric",
  code: "01",
  category: "Fabrics",
  swatchColor: "#726A50",
  sortOrder: 0,
};

const catalogueInput = {
  id: "some-item",
  title: "Some Item",
  href: "#",
  coverColor: "#3a3530",
  coverTextColor: null,
  sortOrder: 0,
};

const flagshipOneInput = {
  enabled: true,
  mode: "reference",
  flagshipId: "some-flagship",
  kicker: { en: "", fa: "" },
  title: { en: "", fa: "" },
  paragraphs: [],
  image: "",
};

const projectBannerInput = {
  enabled: true,
  mode: "reference",
  projectId: "some-project",
  kicker: { en: "", fa: "" },
  title: { en: "", fa: "" },
  image: "",
};

const projectDarkInput = {
  enabled: true,
  mode: "reference",
  projectId: "some-project",
  title: { en: "", fa: "" },
  paragraphs: [],
  image: "",
};

const homeCollectionInput = {
  enabled: true,
  image: "/images/collection.jpg",
  title: PAIR,
  text: PAIR,
};

const catalogueFeatureInput = {
  enabled: true,
  catalogueItemId: "some-item",
  image: "/images/catalogue.jpg",
};

describe("admin actions called directly with no session", () => {
  const DENIED_URL = "/sign-in?denied=1";

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
    mockGetSession.mockResolvedValue(null);
    for (const fn of Object.values(repoMocks)) fn.mockResolvedValue(undefined);
    repoMocks.createProduct.mockResolvedValue("new-id");
    repoMocks.createProductCategory.mockResolvedValue("new-id");
    repoMocks.createDesigner.mockResolvedValue("new-id");
    repoMocks.createCollection.mockResolvedValue("new-id");
    repoMocks.createMaterial.mockResolvedValue("new-id");
    repoMocks.createFlagship.mockResolvedValue("new-id");
    repoMocks.createProject.mockResolvedValue("new-id");
    repoMocks.createFabricItem.mockResolvedValue("new-id");
    repoMocks.createCatalogueItem.mockResolvedValue("new-id");
  });

  async function expectDenied(call: Promise<unknown>, repoFn: { mock: { calls: unknown[] } }) {
    await expect(call).rejects.toThrow(`NEXT_REDIRECT:${DENIED_URL}`);
    expect(redirectMock).toHaveBeenCalledWith(DENIED_URL);
    expect(repoFn.mock.calls).toHaveLength(0);
  }

  function expectNothingTouched() {
    for (const fn of Object.values(repoMocks)) {
      expect(fn.mock.calls).toHaveLength(0);
    }
    expect(toActionResultMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();
  }

  it("products create/update/delete reject with no session", async () => {
    await expectDenied(createProductAction(productInput as never), repoMocks.createProduct);
    await expectDenied(updateProductAction("x", productInput as never), repoMocks.updateProduct);
    await expectDenied(destroyProductAction("x"), repoMocks.deleteProduct);
    expectNothingTouched();
  });

  it("product-categories create/update/delete reject with no session", async () => {
    await expectDenied(createProductCategoryAction(productCategoryInput), repoMocks.createProductCategory);
    await expectDenied(updateProductCategoryAction("x", productCategoryInput), repoMocks.updateProductCategory);
    await expectDenied(destroyProductCategoryAction("x"), repoMocks.deleteProductCategory);
    expectNothingTouched();
  });

  it("designers create/update/delete reject with no session", async () => {
    await expectDenied(createDesignerAction(designerInput), repoMocks.createDesigner);
    await expectDenied(updateDesignerAction("x", designerInput), repoMocks.updateDesigner);
    await expectDenied(destroyDesignerAction("x"), repoMocks.deleteDesigner);
    expectNothingTouched();
  });

  it("collections create/update/delete reject with no session", async () => {
    await expectDenied(createCollectionAction(collectionInput), repoMocks.createCollection);
    await expectDenied(updateCollectionAction("x", collectionInput), repoMocks.updateCollection);
    await expectDenied(destroyCollectionAction("x"), repoMocks.deleteCollection);
    expectNothingTouched();
  });

  it("materials create/update/delete reject with no session", async () => {
    await expectDenied(createMaterialAction(materialInput as never), repoMocks.createMaterial);
    await expectDenied(updateMaterialAction("x", materialInput as never), repoMocks.updateMaterial);
    await expectDenied(destroyMaterialAction("x"), repoMocks.deleteMaterial);
    expectNothingTouched();
  });

  it("flagships create/update/delete reject with no session", async () => {
    await expectDenied(createFlagshipAction(flagshipInput as never), repoMocks.createFlagship);
    await expectDenied(updateFlagshipAction("x", flagshipInput as never), repoMocks.updateFlagship);
    await expectDenied(destroyFlagshipAction("x"), repoMocks.deleteFlagship);
    expectNothingTouched();
  });

  it("projects create/update/delete reject with no session", async () => {
    await expectDenied(createProjectAction(projectInput as never), repoMocks.createProject);
    await expectDenied(updateProjectAction("x", projectInput as never), repoMocks.updateProject);
    await expectDenied(destroyProjectAction("x"), repoMocks.deleteProject);
    expectNothingTouched();
  });

  it("fabrics create/update/delete reject with no session", async () => {
    await expectDenied(createFabricAction(fabricInput), repoMocks.createFabricItem);
    await expectDenied(updateFabricAction("x", fabricInput), repoMocks.updateFabricItem);
    await expectDenied(destroyFabricAction("x"), repoMocks.deleteFabricItem);
    expectNothingTouched();
  });

  it("catalogue create/update/delete reject with no session", async () => {
    await expectDenied(createCatalogueAction(catalogueInput), repoMocks.createCatalogueItem);
    await expectDenied(updateCatalogueAction("x", catalogueInput), repoMocks.updateCatalogueItem);
    await expectDenied(destroyCatalogueAction("x"), repoMocks.deleteCatalogueItem);
    expectNothingTouched();
  });

  it("homepage singleton updates reject with no session", async () => {
    await expectDenied(updateFlagshipOneFeatureAction(flagshipOneInput as never), repoMocks.updateFlagshipOneFeature);
    await expectDenied(updateProjectBannerFeatureAction(projectBannerInput as never), repoMocks.updateProjectBannerFeature);
    await expectDenied(updateProjectDarkBackgroundFeatureAction(projectDarkInput as never), repoMocks.updateProjectDarkBackgroundFeature);
    await expectDenied(updateHomeCollectionFeatureAction(homeCollectionInput as never), repoMocks.updateHomeCollectionFeature);
    await expectDenied(updateCatalogueFeatureAction(catalogueFeatureInput as never), repoMocks.updateCatalogueFeature);
    expectNothingTouched();
  });

  it("control: admin session passes the gate", async () => {
    mockGetSession.mockResolvedValue({ user: { role: "admin" } });
    await expect(destroyProductAction("x")).resolves.toEqual({ ok: true, data: undefined });
    expect(repoMocks.deleteProduct.mock.calls).toHaveLength(1);
    expect(redirectMock).not.toHaveBeenCalled();
  });
});


