import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Part E — the revalidation contract every admin action relies on.
 *
 * `revalidateCatalog` is the ONLY thing that expires a public page after an
 * admin save, so its route patterns are pinned here: a typo in a pattern fails
 * silently at runtime (the stale page simply keeps rendering), which is exactly
 * the bug this test exists to prevent.
 *
 * `next/cache` is mocked rather than called for real, so the assertions are
 * about the patterns the helper emits — no build output and no server needed.
 */
const { revalidatePath, refresh } = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath, refresh }));

import { revalidateCatalog } from "@/lib/admin/revalidate";

describe("revalidateCatalog", () => {
  beforeEach(() => {
    revalidatePath.mockClear();
    refresh.mockClear();
  });

  it("expires the homepage hub, the dashboard and the public home page", () => {
    revalidateCatalog("homepage");

    expect(revalidatePath).toHaveBeenCalledWith(
      "/[locale]/(admin)/admin/homepage",
      "page",
    );
    // The overview's stat cards read the same rows — keep them honest too.
    expect(revalidatePath).toHaveBeenCalledWith(
      "/[locale]/(admin)/admin",
      "page",
    );
    // The site home page is the route file app/[locale]/(site)/page.tsx, so its
    // pattern is the route group itself — NOT "/" and NOT a site sub-path.
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/(site)", "page");
    expect(revalidatePath).toHaveBeenCalledTimes(3);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("also expires the detail route when an id is supplied", () => {
    revalidateCatalog("products", { id: "pendant-light-01" });

    expect(revalidatePath).toHaveBeenCalledWith(
      "/[locale]/(admin)/admin/products/[id]",
      "page",
    );
    expect(revalidatePath).toHaveBeenCalledWith(
      "/[locale]/(admin)/admin/products",
      "page",
    );
  });

  it("keeps a section's public routes separate from the other sections", () => {
    revalidateCatalog("catalogue");
    expect(revalidatePath).toHaveBeenCalledWith(
      "/[locale]/(site)/catalogue",
      "page",
    );
    expect(revalidatePath).not.toHaveBeenCalledWith("/[locale]/(site)", "page");
  });
});
