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
  it("exposes the two supported locales, default first", () => {
    expect(locales).toEqual(["en", "fa"]);
  });

  it("uses English as the default locale", () => {
    expect(defaultLocale).toBe("en");
  });

  it("uses only Persian as an explicit URL prefix", () => {
    expect(prefixedLocales).toEqual(["fa"]);
  });

  it("keeps the default locale inside the supported set", () => {
    expect(locales).toContain(defaultLocale);
  });

  it("keeps every prefixed locale inside the supported set", () => {
    for (const l of prefixedLocales) expect(locales).toContain(l);
  });

  it("never lists the default locale as a prefixed one", () => {
    expect(prefixedLocales).not.toContain(defaultLocale);
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
  it("strips the Persian prefix (the canonical one)", () => {
    expect(stripLocalePrefix("/fa")).toBe("/");
    expect(stripLocalePrefix("/fa/about")).toBe("/about");
    expect(stripLocalePrefix("/fa/products")).toBe("/products");
    expect(stripLocalePrefix("/fa/products/pendant-light")).toBe(
      "/products/pendant-light",
    );
  });

  it("strips the legacy English prefix too", () => {
    expect(stripLocalePrefix("/en")).toBe("/");
    expect(stripLocalePrefix("/en/about")).toBe("/about");
    expect(stripLocalePrefix("/en/products")).toBe("/products");
  });

  it("leaves unprefixed (English) paths unchanged", () => {
    expect(stripLocalePrefix("/")).toBe("/");
    expect(stripLocalePrefix("/about")).toBe("/about");
    expect(stripLocalePrefix("/products")).toBe("/products");
  });

  it("does not strip a path that merely starts with the letters", () => {
    expect(stripLocalePrefix("/english")).toBe("/english");
    expect(stripLocalePrefix("/fast")).toBe("/fast");
  });

  it("handles the empty path", () => {
    expect(stripLocalePrefix("")).toBe("");
  });
});

describe("toCanonicalPath", () => {
  it("normalizes both prefixed forms to the locale-neutral path", () => {
    expect(toCanonicalPath("/en/about")).toBe("/about");
    expect(toCanonicalPath("/fa/about")).toBe("/about");
    expect(toCanonicalPath("/en")).toBe("/");
    expect(toCanonicalPath("/fa")).toBe("/");
  });

  it("keeps canonical English paths unchanged", () => {
    expect(toCanonicalPath("/about")).toBe("/about");
    expect(toCanonicalPath("/products")).toBe("/products");
  });
});

describe("getLocalizedPath", () => {
  it("keeps English (the default locale) unprefixed", () => {
    expect(getLocalizedPath("/", "en")).toBe("/");
    expect(getLocalizedPath("/about", "en")).toBe("/about");
    expect(getLocalizedPath("/products", "en")).toBe("/products");
  });

  it("prefixes Persian paths with /fa", () => {
    expect(getLocalizedPath("/", "fa")).toBe("/fa");
    expect(getLocalizedPath("/about", "fa")).toBe("/fa/about");
    expect(getLocalizedPath("/products", "fa")).toBe("/fa/products");
  });

  it("handles nested and dynamic paths", () => {
    expect(getLocalizedPath("/products/pendant-light", "en")).toBe(
      "/products/pendant-light",
    );
    expect(getLocalizedPath("/products/pendant-light", "fa")).toBe(
      "/fa/products/pendant-light",
    );
    expect(getLocalizedPath("/designers/massimo-castagna", "fa")).toBe(
      "/fa/designers/massimo-castagna",
    );
  });

  it("is idempotent for already-prefixed paths", () => {
    expect(getLocalizedPath("/fa/about", "fa")).toBe("/fa/about");
    expect(getLocalizedPath("/fa", "fa")).toBe("/fa");
  });

  it("normalizes a legacy /en input to the canonical unprefixed form", () => {
    expect(getLocalizedPath("/en", "en")).toBe("/");
    expect(getLocalizedPath("/en/about", "en")).toBe("/about");
  });

  it("preserves trailing slashes", () => {
    expect(getLocalizedPath("/about/", "en")).toBe("/about/");
    expect(getLocalizedPath("/about/", "fa")).toBe("/fa/about/");
  });

  it("treats the empty path as the root", () => {
    expect(getLocalizedPath("", "en")).toBe("/");
    expect(getLocalizedPath("", "fa")).toBe("/fa");
  });

  it("round-trips: a localized path strips back to its canonical form", () => {
    for (const locale of locales) {
      for (const path of ["/", "/about", "/products/x"]) {
        expect(stripLocalePrefix(getLocalizedPath(path, locale))).toBe(
          path === "" ? "/" : path,
        );
      }
    }
  });

  it("derives the prefix from defaultLocale rather than hardcoding a locale", () => {
    // The rule is "default => no prefix, other => prefix". If this ever
    // regresses to a hardcoded "fa", the first assertion below fails.
    const nonDefault = locales.filter((l) => l !== defaultLocale);
    expect(nonDefault).toEqual(["fa"]);
    expect(getLocalizedPath("/about", defaultLocale)).toBe("/about");
    for (const l of nonDefault) {
      expect(getLocalizedPath("/about", l)).toBe(`/${l}/about`);
    }
  });
});
