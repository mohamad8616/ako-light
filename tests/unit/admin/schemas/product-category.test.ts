import { describe, expect, it } from "vitest";
import { productCategoryFormSchema } from "@/lib/admin/schemas/product-category";

describe("productCategoryFormSchema", () => {
  const validInput = {
    slug: "lighting",
    i18nKey: "products.lighting",
    name: { en: "Lighting", fa: "نورپردازی" },
    sortOrder: 0,
  };

  it("accepts valid input", () => {
    const result = productCategoryFormSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects missing required slug", () => {
    const input = { ...validInput, slug: "" };
    const result = productCategoryFormSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("slug"))).toBe(true);
    }
  });

  it("rejects invalid slug format (uppercase)", () => {
    const input = { ...validInput, slug: "Lighting" };
    const result = productCategoryFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects invalid slug format (double hyphen)", () => {
    const input = { ...validInput, slug: "light--ing" };
    const result = productCategoryFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing i18nKey", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).i18nKey;
    const result = productCategoryFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects empty i18nKey", () => {
    const input = { ...validInput, i18nKey: "" };
    const result = productCategoryFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing name", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>).name;
    const result = productCategoryFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects name with empty en", () => {
    const input = { ...validInput, name: { en: "", fa: "نورپردازی" } };
    const result = productCategoryFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects negative sortOrder", () => {
    const input = { ...validInput, sortOrder: -1 };
    const result = productCategoryFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects non-integer sortOrder", () => {
    const input = { ...validInput, sortOrder: 1.5 };
    const result = productCategoryFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});