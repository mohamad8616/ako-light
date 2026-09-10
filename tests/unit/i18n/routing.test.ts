import { describe, expect, it } from "vitest";
import {
  defaultLocale,
  getLocalizedPath,
  isLocale,
  locales,
  prefixedLocales,
  stripLocalePrefix,
  toCanonicalPath,
} from "@/lib/i18n/routing";

describe("locale model constants", () => {
  it("exposes the two supported locales", () => {
    expect(locales).toEqual(["fa", "en"]);
  });

  it("uses Persian as the default locale", () => {
    expect(defaultLocale).toBe("fa");
  });

  it("uses only English as an explicit URL prefix", () => {
    expect(prefixedLocales).toEqual(["en"]);
  });
});

describe("isLocale", () => {
  it("accepts the two supported language codes", () => {
    expect(isLocale("fa")).toBe(true);
    expect(isLocale("en")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isLocale("de")).toBe(false);
    expect(isLocale("FA")).toBe(false);
    expect(isLocale("")).toBe(false);
  });
});

describe("stripLocalePrefix", () => {
  it("strips the English root prefix", () => {
    expect(stripLocalePrefix("/en")).toBe("/");
  });

  it("strips the English prefix from nested paths", () => {
    expect(stripLocalePrefix("/en/about")).toBe("/about");
    expect(stripLocalePrefix("/en/products")).toBe("/products");
    expect(stripLocalePrefix("/en/products/pendant-light")).toBe(
      "/products/pendant-light",
    );
  });

  it("leaves unprefixed Persian paths unchanged", () => {
    expect(stripLocalePrefix("/")).toBe("/");
    expect(stripLocalePrefix("/about")).toBe("/about");
    expect(stripLocalePrefix("/products")).toBe("/products");
  });

  it("does not strip /fa — /fa → / redirect lives in proxy.ts, not routing.ts", () => {
    // The routing helpers only understand the explicit /en prefix. The
    // legacy /fa prefix is normalized by proxy.ts (a 308 redirect) so the
    // unit-level contract here is "leave /fa alone".
    expect(stripLocalePrefix("/fa")).toBe("/fa");
    expect(stripLocalePrefix("/fa/about")).toBe("/fa/about");
  });

  it("handles the empty path", () => {
    expect(stripLocalePrefix("")).toBe("");
  });
});

describe("toCanonicalPath", () => {
  it("normalizes English paths to their canonical unprefixed form", () => {
    expect(toCanonicalPath("/en")).toBe("/");
    expect(toCanonicalPath("/en/about")).toBe("/about");
    expect(toCanonicalPath("/en/products")).toBe("/products");
  });

  it("keeps canonical Persian paths unchanged", () => {
    expect(toCanonicalPath("/about")).toBe("/about");
    expect(toCanonicalPath("/products")).toBe("/products");
  });
});

describe("getLocalizedPath", () => {
  it("keeps Persian (default locale) paths unprefixed", () => {
    expect(getLocalizedPath("/", "fa")).toBe("/");
    expect(getLocalizedPath("/about", "fa")).toBe("/about");
    expect(getLocalizedPath("/products", "fa")).toBe("/products");
  });

  it("prefixes English paths with /en", () => {
    expect(getLocalizedPath("/", "en")).toBe("/en");
    expect(getLocalizedPath("/about", "en")).toBe("/en/about");
    expect(getLocalizedPath("/products", "en")).toBe("/en/products");
  });

  it("handles nested and dynamic paths", () => {
    expect(getLocalizedPath("/products/pendant-light", "en")).toBe(
      "/en/products/pendant-light",
    );
    expect(getLocalizedPath("/designers/massimo-castagna", "en")).toBe(
      "/en/designers/massimo-castagna",
    );
    expect(getLocalizedPath("/products/pendant-light", "fa")).toBe(
      "/products/pendant-light",
    );
  });

  it("is idempotent for already-prefixed paths", () => {
    expect(getLocalizedPath("/en/about", "en")).toBe("/en/about");
    expect(getLocalizedPath("/en", "en")).toBe("/en");
  });

  it("normalizes a /en input back to the root for Persian", () => {
    expect(getLocalizedPath("/en", "fa")).toBe("/");
    expect(getLocalizedPath("/en/about", "fa")).toBe("/about");
  });

  it("preserves trailing slashes", () => {
    expect(getLocalizedPath("/about/", "en")).toBe("/en/about/");
    expect(getLocalizedPath("/about/", "fa")).toBe("/about/");
  });

  it("treats the empty path as the root", () => {
    expect(getLocalizedPath("", "fa")).toBe("/");
    expect(getLocalizedPath("", "en")).toBe("/en");
  });

  it("does not rewrite /fa prefixes (proxy concern)", () => {
    expect(getLocalizedPath("/fa/about", "fa")).toBe("/fa/about");
    expect(getLocalizedPath("/fa/about", "en")).toBe("/en/fa/about");
  });
});