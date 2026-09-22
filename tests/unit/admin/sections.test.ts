import {
  ADMIN_CATALOG_NAV,
  ADMIN_DASHBOARD_HREF,
  ADMIN_NAV_ITEMS,
  ADMIN_SHELL_DIR,
  getAdminNavItem,
  isAdminNavItemActive,
} from "@/lib/admin/sections";
import { translations } from "@/lib/i18n/translations";
import { describe, expect, it } from "vitest";

/**
 * The admin nav registry feeds both the sidebar (which item is highlighted)
 * and the topbar breadcrumb (which section the URL is in). These tests pin
 * the two contracts those consumers rely on: locale-prefixed paths resolve
 * like their canonical form, and a route maps to exactly one section.
 */
describe("admin nav registry", () => {
  it("resolves a section from a canonical pathname", () => {
    expect(getAdminNavItem("/admin/products")?.labelKey).toBe(
      "admin.nav.products",
    );
  });

  it("resolves the same section from the /en-prefixed pathname", () => {
    expect(getAdminNavItem("/en/admin/products")?.labelKey).toBe(
      "admin.nav.products",
    );
    expect(getAdminNavItem("/en/admin")?.labelKey).toBe("admin.nav.dashboard");
  });

  it("resolves the same section from an internally rewritten /fa pathname", () => {
    expect(getAdminNavItem("/fa/admin/products")?.labelKey).toBe(
      "admin.nav.products",
    );
    expect(isAdminNavItemActive("/admin", "/fa/admin")).toBe(true);
  });

  it("treats a trailing slash as the same route", () => {
    expect(getAdminNavItem("/admin/designers/")?.labelKey).toBe(
      "admin.nav.designers",
    );
  });

  it("maps the bare admin root to the dashboard", () => {
    expect(getAdminNavItem(ADMIN_DASHBOARD_HREF)?.labelKey).toBe(
      "admin.nav.dashboard",
    );
  });

  it("keeps the parent section active for future detail routes", () => {
    expect(getAdminNavItem("/admin/products/pendant-light-01")?.labelKey).toBe(
      "admin.nav.products",
    );
  });

  it("returns nothing for a path outside the registry", () => {
    expect(getAdminNavItem("/admin/not-a-section")).toBeUndefined();
    expect(getAdminNavItem("/about")).toBeUndefined();
  });

  it("matches the dashboard href exactly, not its descendants", () => {
    expect(isAdminNavItemActive(ADMIN_DASHBOARD_HREF, "/admin")).toBe(true);
    expect(isAdminNavItemActive(ADMIN_DASHBOARD_HREF, "/admin/products")).toBe(
      false,
    );
  });

  it("activates exactly one nav item per route", () => {
    for (const pathname of [
      "/admin",
      "/en/admin",
      "/admin/categories",
      "/admin/admins",
      "/en/admin/collections",
    ]) {
      const active = ADMIN_NAV_ITEMS.filter((item) =>
        isAdminNavItemActive(item.href, pathname),
      );
      expect(active, pathname).toHaveLength(1);
    }
  });

  it("keeps every catalog href unique so no two items activate together", () => {
    const hrefs = ADMIN_CATALOG_NAV.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("locks the shell direction to a supported value", () => {
    expect(["ltr", "rtl"]).toContain(ADMIN_SHELL_DIR);
  });

  it("references translation keys that exist in both dictionaries", () => {
    for (const item of ADMIN_NAV_ITEMS) {
      expect(translations.en, item.labelKey).toHaveProperty(item.labelKey);
      expect(translations.fa, item.labelKey).toHaveProperty(item.labelKey);
    }
  });
});
