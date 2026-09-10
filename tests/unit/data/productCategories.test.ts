import { describe, expect, it } from "vitest";
import {
  getProduct,
  productCategories,
  products,
} from "@/lib/data/productCategories";
import { productKey } from "@/lib/i18n/localized";
import { translations } from "@/lib/i18n/translations";

describe("getProduct", () => {
  it("finds a real product by category and slug", () => {
    const product = getProduct("lighting", "pendant-light");
    expect(product).toBeDefined();
    expect(product?.id).toBe("pendant-light");
    expect(product?.category).toBe("lighting");
  });

  it("returns localized fields for a known product", () => {
    const product = getProduct("lighting", "pendant-light");
    expect(product?.name.en).toBe("Pendant Light");
    expect(product?.name.fa.length).toBeGreaterThan(0);
    expect(product?.description.en.length).toBeGreaterThan(0);
    expect(product?.description.fa.length).toBeGreaterThan(0);
  });

  it("returns undefined for an unknown slug", () => {
    expect(getProduct("lighting", "does-not-exist")).toBeUndefined();
  });

  it("returns undefined for an unknown category", () => {
    expect(getProduct("nope", "pendant-light")).toBeUndefined();
  });
});

describe("product catalogue integrity", () => {
  it("aggregates exactly the per-category products", () => {
    const expectedCount = productCategories.reduce(
      (sum, cat) => sum + cat.products.length,
      0,
    );
    expect(products).toHaveLength(expectedCount);
  });

  it("links every product to its parent category by slug", () => {
    for (const category of productCategories) {
      for (const product of category.products) {
        expect(product.category).toBe(category.slug);
      }
    }
  });

  it("has unique category slugs and product ids", () => {
    const categorySlugs = productCategories.map((c) => c.slug);
    expect(new Set(categorySlugs).size).toBe(categorySlugs.length);

    const productIds = products.map((p) => p.id);
    expect(new Set(productIds).size).toBe(productIds.length);
  });

  it("resolves a translation for every product slug in both languages", () => {
    const enDict = translations.en as Record<string, string>;
    const faDict = translations.fa as Record<string, string>;
    for (const product of products) {
      const key = productKey(product.slug);
      expect(enDict[key], `en:${product.slug}`).toBeTruthy();
      expect(faDict[key], `fa:${product.slug}`).toBeTruthy();
    }
  });

  it("resolves a translation for every category i18nKey in both languages", () => {
    const enDict = translations.en as Record<string, string>;
    const faDict = translations.fa as Record<string, string>;
    for (const category of productCategories) {
      expect(enDict[category.i18nKey]).toBeTruthy();
      expect(faDict[category.i18nKey]).toBeTruthy();
    }
  });

  it("keeps every product's id equal to its slug (placeholder convention)", () => {
    for (const product of products) {
      expect(product.id).toBe(product.slug);
    }
  });
});