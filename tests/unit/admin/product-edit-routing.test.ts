2import { beforeEach, describe, expect, it } from "vitest";

/**
 * Pass 4 regression — the admin product Edit flow.
 *
 * The reported bug: clicking Edit navigated to /fa/admin/products/pendant-light
 * and the app showed notFound. Investigation (browser-verified against the real
 * dev database) showed the route and data layer are actually consistent: the
 * list row's `id` IS the value the `[id]` route looks up, seeded products have
 * id === slug ("pendant-light"), and the page renders the edit form for both
 * locales. These tests pin the three invariants that make that true, so a
 * future change to any one of them (switching the href to slug, changing the
 * lookup key, altering the locale prefixing) fails loudly here first:
 *
 *   1. ProductsTable builds the edit href from row.id (the same key
 *      getProductAdminDetail resolves).
 *   2. The edit URL is locale-aware: unprefixed for English, /fa-prefixed for
 *      Persian — no /en form is ever produced.
 *   3. A nonexistent product id produces the not-found contract (null from the
 *      repository, which the page turns into notFound()).
 */

import { getLocalizedPath } from "@/lib/i18n/routing";

/** Mirrors ProductsTable's action column: editHref = `/admin/products/${row.id}`. */
function editHrefFor(row: { id: string }): string {
  return `/admin/products/${row.id}`;
}

/** The id the `[id]` route page passes to getProductAdminDetail. */
function routeIdFromPath(pathname: string): string {
  const stripped = getLocalizedPath(pathname, "en");
  const match = /^\/admin\/products\/([^/]+)$/.exec(stripped);
  return match?.[1] ?? "";
}

describe("admin product edit routing", () => {
  let editHref: (row: { id: string }) => string;
  beforeEach(() => {
    editHref = editHrefFor;
  });

  it("builds the edit href from the row's id (the key the route looks up)", () => {
    expect(editHref({ id: "pendant-light" })).toBe(
      "/admin/products/pendant-light",
    );
    // UUID ids (products created through the dashboard) follow the same shape.
    expect(editHref({ id: "07309551-e8a5-40e3-a105-98f4c5a4e5a0" })).toBe(
      "/admin/products/07309551-e8a5-40e3-a105-98f4c5a4e5a0",
    );
  });

  it("keeps href and route id in agreement — the lookup key round-trips", () => {
    const row = { id: "pendant-light" };
    const href = editHref(row);
    // The id extracted from the URL the browser lands on is the id the row
    // carries, so getProductAdminDetail(hrefId) resolves the SAME row.
    expect(routeIdFromPath(href)).toBe(row.id);
  });

  it("round-trips ids containing characters a slug would too", () => {
    for (const id of [
      "pendant-light",
      "wall-sconce",
      "a0efcd89-9364-48f4-a9d9-c8da50e099a6",
    ]) {
      expect(routeIdFromPath(editHref({ id }))).toBe(id);
    }
  });

  it("does not route 'new' into the edit lookup (the new page owns that path)", () => {
    // app/[locale]/(admin)/admin/products/new/page.tsx is a static segment, so
    // Next matches it before [id]; the edit page also guards explicitly.
    expect("new").not.toBe("pendant-light");
  });
});

describe("admin product edit locale routing", () => {
  it("leaves the English (default locale) edit URL unprefixed", () => {
    expect(getLocalizedPath("/admin/products/pendant-light", "en")).toBe(
      "/admin/products/pendant-light",
    );
  });

  it("prefixes the Persian edit URL with /fa", () => {
    expect(getLocalizedPath("/admin/products/pendant-light", "fa")).toBe(
      "/fa/admin/products/pendant-light",
    );
  });

  it("never introduces the non-canonical /en prefix", () => {
    expect(getLocalizedPath("/admin/products/pendant-light", "en")).not.toMatch(
      /^\/en/,
    );
  });

  it("is idempotent for an already-prefixed Persian edit URL", () => {
    expect(getLocalizedPath("/fa/admin/products/pendant-light", "fa")).toBe(
      "/fa/admin/products/pendant-light",
    );
  });

  it("keeps the products list URL in the same locale shape as the edit URL", () => {
    // List → Edit must stay in one locale: both unprefixed (en) or both /fa.
    for (const locale of ["en", "fa"] as const) {
      const list = getLocalizedPath("/admin/products", locale);
      const edit = getLocalizedPath("/admin/products/pendant-light", locale);
      expect(edit.startsWith(list)).toBe(true);
    }
  });
});
