import { describe, expect, it } from "vitest";
import {
  loc,
  pick,
  productDescription,
  productKey,
  productName,
  type Localized,
} from "@/lib/i18n/localized";
import { translations, type Language } from "@/lib/i18n/translations";

/** Minimal `t` that mirrors LanguageProvider.t: dict[key] ?? key. */
function makeT(lang: Language) {
  const dict = translations[lang] as Record<string, string>;
  return (key: string) => dict[key] ?? key;
}

describe("loc", () => {
  it("builds a bilingual Localized pair", () => {
    expect(loc("Lighting", "نورپردازی")).toEqual({ en: "Lighting", fa: "نورپردازی" });
  });
});

describe("pick", () => {
  const value: Localized = loc("Pendant Light", "لامپ آویز");

  it("returns the English value for en", () => {
    expect(pick(value, "en")).toBe("Pendant Light");
  });

  it("returns the Persian value for fa", () => {
    expect(pick(value, "fa")).toBe("لامپ آویز");
  });

  it("passes plain strings through unchanged", () => {
    expect(pick("String-only value", "en")).toBe("String-only value");
    expect(pick("String-only value", "fa")).toBe("String-only value");
  });

  it("falls back to the English value when the requested language is missing", () => {
    const partial = { en: "English only" } as Localized;
    expect(pick(partial, "fa")).toBe("English only");
  });
});

describe("productKey", () => {
  it("turns kebab-case slugs into camelCase translation keys", () => {
    expect(productKey("pendant-light")).toBe("products.pendantLight");
    expect(productKey("sofas-and-armchairs")).toBe("products.sofasAndArmchairs");
    expect(productKey("low-table")).toBe("products.lowTable");
    expect(productKey("wall-panelling")).toBe("products.wallPanelling");
  });

  it("keeps slugs without hyphens intact", () => {
    expect(productKey("diapason")).toBe("products.diapason");
    expect(productKey("unicode")).toBe("products.unicode");
  });
});

describe("productName", () => {
  it("resolves the localized display name from the real translations", () => {
    expect(productName(makeT("en"), "pendant-light")).toBe("Pendant Light");
    expect(productName(makeT("fa"), "pendant-light")).toBe("لامپ آویز");
  });

  it("falls back to the raw key when no translation exists", () => {
    const t = (key: string) => key;
    expect(productName(t, "pendant-light")).toBe("products.pendantLight");
  });
});

describe("productDescription", () => {
  it("fills the {name} placeholder with the translated product name", () => {
    const en = productDescription(makeT("en"), "pendant-light");
    expect(en).toContain("Pendant Light");
    expect(en).toContain("Home Form");

    const fa = productDescription(makeT("fa"), "pendant-light");
    expect(fa).toContain("لامپ آویز");
  });

  it("substitutes the generated key when no translation exists", () => {
    const t = (key: string) =>
      key === "product.description" ? "The {name} is here." : key;
    const result = productDescription(t, "does-not-exist");
    expect(result).toBe("The products.doesNotExist is here.");
  });
});