/**
 * Pass D.1 — the admin shell's compact navigation.
 *
 * Two halves, matching the two ways this can go wrong:
 *
 *   1. ROUTING — the home link and the language switcher both go through
 *      `getLocalizedPath`, so the routing rules are asserted directly against
 *      it: English unprefixed, Persian `/fa/...`, and NEVER a legacy `/en/...`
 *      URL (which the proxy would have to 308 away again).
 *   2. WIRING — the component must actually use that helper and the shared
 *      `setLang`, rather than building hrefs itself. A second place that knows
 *      the routing rules is the thing this codebase works hardest to avoid.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { getLocalizedPath, stripLocalePrefix } from "@/lib/i18n/routing";

const ROOT = process.cwd();

/** CRLF-safe comment stripping — see tests/unit/ui/dialog-contract.test.ts. */
function stripComments(source: string): string {
  return source
    .replace(/\r\n?/g, "\n")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const nav = stripComments(
  readFileSync(join(ROOT, "components/admin/AdminHeaderNav.tsx"), "utf8"),
);

describe("the admin home link resolves to the public homepage", () => {
  it("is the site root in English — unprefixed", () => {
    expect(getLocalizedPath("/", "en")).toBe("/");
  });

  it("is /fa in Persian", () => {
    expect(getLocalizedPath("/", "fa")).toBe("/fa");
  });

  it("is never the dashboard and never a missing route", () => {
    // "/" is the homepage in both locales; anything under /admin would be the
    // dashboard, which is where the operator already is.
    expect(getLocalizedPath("/", "en")).not.toContain("/admin");
    expect(getLocalizedPath("/", "fa")).not.toContain("/admin");
  });
});

describe("switching language preserves the current admin page", () => {
  it("keeps the path and swaps the prefix, both directions", () => {
    expect(getLocalizedPath("/admin/homepage", "fa")).toBe("/fa/admin/homepage");
    expect(getLocalizedPath("/fa/admin/homepage", "en")).toBe("/admin/homepage");
  });

  it("is idempotent — switching to the locale you are already in changes nothing", () => {
    expect(getLocalizedPath("/admin/products", "en")).toBe("/admin/products");
    expect(getLocalizedPath("/fa/admin/products", "fa")).toBe(
      "/fa/admin/products",
    );
  });

  it("normalises the legacy /en prefix away instead of keeping it", () => {
    expect(getLocalizedPath("/en/admin/users", "en")).toBe("/admin/users");
    expect(getLocalizedPath("/en/admin/users", "fa")).toBe("/fa/admin/users");
  });

  it("NEVER emits an /en/... URL", () => {
    for (const path of ["/", "/admin", "/admin/homepage/hero", "/products/x"]) {
      expect(getLocalizedPath(path, "en").startsWith("/en")).toBe(false);
    }
  });

  it("round-trips through the canonical form", () => {
    expect(stripLocalePrefix(getLocalizedPath("/admin/orders", "fa"))).toBe(
      "/admin/orders",
    );
  });
});

describe("AdminHeaderNav — wiring", () => {
  it("reuses the locale-aware Link rather than an anchor with a built href", () => {
    expect(nav).toContain('from "@/lib/i18n/Link"');
    expect(nav).toContain('href="/"');
    // A raw <a href="/en/..."> is exactly the mistake this guards against.
    expect(nav).not.toContain('href="/en');
  });

  it("switches language through the shared setLang", () => {
    expect(nav).toContain("setLang");
    expect(nav).toContain("useLanguage()");
  });

  it("offers every supported locale from the single source of truth", () => {
    expect(nav).toContain("locales");
    expect(nav).not.toContain('["en", "fa"]');
  });

  it("marks the active language and is operable without a pointer", () => {
    // Real buttons + aria-pressed: keyboard reachable and announced, with no
    // menu, portal or tooltip provider involved.
    expect(nav).toContain("<button");
    expect(nav).toContain("aria-pressed={active}");
    expect(nav).toContain("type=\"button\"");
  });

  it("uses logical alignment so it mirrors with the RTL shell", () => {
    // The admin shell is RTL for both locales; a physical `right-0` would sit on
    // the wrong side. `ms-auto` is inline-start/end aware.
    expect(nav).toContain("ms-auto");
    expect(nav).not.toMatch(/\bml-auto\b/);
  });

  it("is mounted in the admin header", () => {
    const header = stripComments(
      readFileSync(join(ROOT, "components/admin/site-header.tsx"), "utf8"),
    );
    expect(header).toContain("<AdminHeaderNav />");
  });
});
