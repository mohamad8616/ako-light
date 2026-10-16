import { describe, expect, it } from "vitest";
import { productCategoryFormSchema } from "@/lib/admin/schemas/product-category";

describe("productCategoryFormSchema", () => {
  const validInput = {
    slug: "lighting",
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

  /**
   * `i18nKey` is no longer the operator's to supply — the action derives it
   * from the slug (lib/admin/actions/product-categories.ts#withI18nKey). Two
   * things have to hold for that to be safe:
   *
   *   1. the schema must not REQUIRE it (a form that does not render the field
   *      cannot send it), and
   *   2. it must not SURVIVE into the parsed payload — the action reads the
   *      stored value / derives a fresh one, and a stray key riding along from
   *      a stale client would be exactly the "wrong translation" bug the
   *      derivation exists to prevent.
   */
  it("does not require an i18nKey", () => {
    const result = productCategoryFormSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("strips an i18nKey a stale client might still send", () => {
    const result = productCategoryFormSchema.safeParse({
      ...validInput,
      i18nKey: "products.injected",
    });
    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty("i18nKey");
  });
});
